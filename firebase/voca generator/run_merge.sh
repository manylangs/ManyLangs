#!/usr/bin/env bash
#
# run_merge.sh — 보카(vocabulary) 프로젝트용 병합 실행 스크립트.
# (컨버세이션 프로젝트 run_merge.sh를 보카 스키마에 맞게 재작성한 버전)
#
# 컨버세이션과의 차이:
#   - 폴더 범위: 001~060 → 001~144 (6 LEVEL × 24 BATCH = 144)
#   - target 단계에서 en이 이미 함께 채워지므로 conversation처럼 en을 별도로
#     merge/mirror 하는 단계가 없음 (target 빌드 한 번으로 target+en 완료)
#   - kr을 기본 translate로 특별 취급하던 conversation과 달리, 이 프로젝트는
#     target이 항상 영어이므로 es/fr/pt/kr/jp/zh 6개 모두 동일하게 취급:
#     compact 파일이 있으면 번역 병합, 없으면 --mirror-missing 옵션이 있을 때만
#     영어를 그대로 미러링(임시 채움), 기본은 skip(미완성 표시)
#
# 사용법:
#   ./run_merge.sh                 # 없는 언어는 skip (미완성 상태로 둠)
#   ./run_merge.sh --mirror-missing  # 없는 언어는 en 텍스트를 그대로 미러링해 임시로 채움
#
# [수정 이력]
#   - `set -e` 제거. 기존에는 merge.py가 검증 실패(예: meaning_zone[0] != core,
#     block id 순서 불일치 등)로 exit 1을 반환하면 set -e 때문에 스크립트 전체가
#     그 자리에서 즉시 종료되어, 뒤에 남은 배치들이 전부 처리되지 않은 채
#     "빈 언어가 많은" 것처럼 보이는 문제가 있었음.
#   - target 빌드/언어별 병합 호출을 각각 if로 감싸서, 실패해도 해당 배치/언어만
#     건너뛰고 나머지는 계속 진행하도록 함. 실패 내역은 FAILED 배열에 모아서
#     마지막에 요약 출력.

set -uo pipefail

MERGE_PY="${MERGE_PY:-./merge.py}"
DATA_ROOT="${DATA_ROOT:-./data}"

MIRROR_MISSING=0
if [ "${1:-}" = "--mirror-missing" ]; then
    MIRROR_MISSING=1
fi

FAILED=()

check_file() {
    local f="$1"
    [ -f "$f" ]
}

for BATCH_ID in $(seq -f "%03g" 1 144); do

    DIR="${DATA_ROOT}/${BATCH_ID}"

    # 폴더 없으면 건너뜀
    [ -d "$DIR" ] || continue

    OUT="${DIR}/${BATCH_ID}.runtime.json"

    # target(=target+en 동시 포함)은 필수
    if ! check_file "${DIR}/${BATCH_ID}-target.compact.json"; then
        echo "SKIP ${BATCH_ID} (target 없음)"
        continue
    fi

    echo
    echo "=============================="
    echo "BATCH ${BATCH_ID}"
    echo "=============================="

    # target 생성 (target + en 동시 완료, en 별도 단계 없음)
    if ! python3 "$MERGE_PY" target "${DIR}/${BATCH_ID}-target.compact.json" --out "$OUT"; then
        echo "  ✗ ${BATCH_ID} target 빌드 실패 → 이 배치 전체 skip"
        FAILED+=("${BATCH_ID}:target")
        continue
    fi

    # es fr pt kr jp zh : 있는 것만 번역 병합, 없으면 옵션에 따라 skip 또는 en 미러
    for lang in es fr pt kr jp zh; do
        if check_file "${DIR}/${BATCH_ID}-${lang}.compact.json"; then
            if ! python3 "$MERGE_PY" "$lang" \
                "${DIR}/${BATCH_ID}-${lang}.compact.json" \
                --base "$OUT" --out "$OUT"; then
                echo "  ✗ ${BATCH_ID}-${lang} 병합 실패 (검증 오류 등) → 이 언어만 skip, 나머지는 계속 진행"
                FAILED+=("${BATCH_ID}:${lang}")
            fi
        elif [ "$MIRROR_MISSING" = "1" ]; then
            echo "  - ${lang} 없음 → en 임시 미러 (번역 프롬프트 실행 전 임시 채움, 나중에 교체 필요)"
            if ! python3 "$MERGE_PY" "$lang" --mirror \
                --base "$OUT" --out "$OUT"; then
                echo "  ✗ ${BATCH_ID}-${lang} 미러 실패"
                FAILED+=("${BATCH_ID}:${lang}(mirror)")
            fi
        else
            echo "  - ${lang} 없음 → skip (미완성)"
        fi
    done

    echo "✓ 완료: ${BATCH_ID}"

done

echo
echo "========== ALL DONE (001~144) =========="
if [ "${#FAILED[@]}" -gt 0 ]; then
    echo "실패 항목 (${#FAILED[@]}건, 위 로그에서 원인 확인 필요):"
    for item in "${FAILED[@]}"; do
        echo "  - ${item}"
    done
else
    echo "실패한 항목 없음."
fi
