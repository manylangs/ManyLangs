#!/usr/bin/env bash
#
# run_merge.sh — 보카(vocabulary) 프로젝트용 병합 실행 스크립트. (v2 - en 특별취급 제거)
#
# 수정 사유:
#   이전 버전은 target 빌드 시 en이 이미 함께 채워진다고 가정해 en을
#   병합 루프에서 제외했었다. 하지만 번역 프롬프트 세트(en 포함 7개 전부)가
#   전부 "target → 각 언어" 직접 번역이고 서로 절대 영어를 중간 허브로
#   쓰지 않는다고 명시하므로, en도 다른 6개 언어와 완전히 동급으로 취급해야
#   한다. conversation 프로젝트의 run_merge.sh(en도 es/fr/pt와 동일하게
#   병합 루프에 포함)를 참조해 en을 루프에 합류시켰다.
#
# 컨버세이션과 남은 차이:
#   - 폴더 범위: 001~060 → 001~144 (6 LEVEL × 24 BATCH = 144)
#   - kr을 기본 translate로 특별 취급하던 conversation과 달리, 이 프로젝트는
#     target이 항상 영어가 아니므로(다양한 target language) en/es/fr/pt/kr/jp/zh
#     7개 모두 동일하게 취급: compact 파일이 있으면 번역 병합, 없으면
#     --mirror-missing 옵션이 있을 때만 target을 그대로 미러링(임시 채움),
#     기본은 skip(미완성 표시)
#
# 사용법:
#   ./run_merge.sh                 # 없는 언어는 skip (미완성 상태로 둠)
#   ./run_merge.sh --mirror-missing  # 없는 언어는 target 텍스트를 그대로 미러링해 임시로 채움
#
# [수정 이력]
#   - v2: TRANSLATE_LANGS 루프에 en 추가 (target 빌드에서 en 제외했으므로).
#   - v1: `set -e` 제거, 배치/언어 단위로 실패해도 나머지는 계속 진행.

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

    # target(target만, en 미포함)은 필수
    if ! check_file "${DIR}/${BATCH_ID}-target.compact.json"; then
        echo "SKIP ${BATCH_ID} (target 없음)"
        continue
    fi

    echo
    echo "=============================="
    echo "BATCH ${BATCH_ID}"
    echo "=============================="

    # target 생성 (target만 채움, en 포함 나머지 7개 언어는 이후 루프에서 병합)
    if ! python3 "$MERGE_PY" target "${DIR}/${BATCH_ID}-target.compact.json" --out "$OUT"; then
        echo "  ✗ ${BATCH_ID} target 빌드 실패 → 이 배치 전체 skip"
        FAILED+=("${BATCH_ID}:target")
        continue
    fi

    # en es fr pt kr jp zh : 있는 것만 번역 병합, 없으면 옵션에 따라 skip 또는 target 미러
    for lang in en es fr pt kr jp zh; do
        if check_file "${DIR}/${BATCH_ID}-${lang}.compact.json"; then
            if ! python3 "$MERGE_PY" "$lang" \
                "${DIR}/${BATCH_ID}-${lang}.compact.json" \
                --base "$OUT" --out "$OUT"; then
                echo "  ✗ ${BATCH_ID}-${lang} 병합 실패 (검증 오류 등) → 이 언어만 skip, 나머지는 계속 진행"
                FAILED+=("${BATCH_ID}:${lang}")
            fi
        elif [ "$MIRROR_MISSING" = "1" ]; then
            echo "  - ${lang} 없음 → target 임시 미러 (번역 프롬프트 실행 전 임시 채움, 나중에 교체 필요)"
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