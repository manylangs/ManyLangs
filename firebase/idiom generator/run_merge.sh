#!/usr/bin/env bash
#
# run_merge.sh — 이디엄(IDIOM) 시리즈 전용 병합 스크립트 (공용, target 언어 무관)
#
# conversation 시리즈의 run_merge.sh와 동일한 원칙: 이 스크립트는 target이 한국어인지
# 영어인지(혹은 다른 언어인지) 미리 알지 못한다. 각 언어의 compact.json 파일이 실제로
# 존재하는지만 보고 번역/미러링을 자동으로 판단한다. 즉 10_KR_IDIOM_TARGET_GENERATOR.md
# 파이프라인(target=한국어)과 18_EN_IDIOM_TARGET_GENERATOR.md 파이프라인(target=영어)에
# 플래그 없이 동일하게 사용할 수 있다.
#
# conversation 시리즈와의 차이:
#   - BATCH_ID 범위: 001~042 (레벨당 7배치 × 배치당 5개 이디엄 = 42배치)
#   - 파일명: idiom_{BATCH_ID}.runtime.json
#   - es/fr/pt 외에 zh/jp도 같은 방식(있으면 병합, 없으면 skip)으로 처리
#
# 동작 원리:
#   - en   : en.compact.json이 있으면 번역 병합, 없으면 target을 그대로 미러링
#            (target=한국어 파이프라인에서는 11_EN_IDIOM_TRANSLATOR.md 결과가 있으니 번역됨.
#             target=영어 파이프라인에서는 en 자체가 target이라 compact 파일이 없으니 자동 미러링됨.)
#   - es/fr/pt/zh/jp : 있는 것만 병합, 없으면 skip (미러 개념 없음, en에서만 번역)
#   - kr   : 기본은 번역(kr.compact.json 있으면 번역, 없으면 미러링으로 자동 대체).
#            --kr-mirror를 명시하면 kr.compact.json이 있어도 무조건 미러링한다
#            (target=한국어 파이프라인에서 쓰는 옵션).
#
# 사용법:
#   ./run_merge.sh               # 기본: en/kr 모두 파일 존재 여부로 자동 판단
#   ./run_merge.sh --kr-mirror   # kr을 무조건 target 미러링 (target=한국어 파이프라인)

set -e

MERGE_PY="${MERGE_PY:-./merge.py}"
DATA_ROOT="${DATA_ROOT:-./data}"

# 기본은 한국어 번역 사용 (kr.compact.json이 없으면 자동으로 mirror로 대체됨)
KR_MODE="translate"

# 필요할 때만 mirror
if [ "$1" = "--kr-mirror" ]; then
    KR_MODE="mirror"
fi

check_file() {
    local f="$1"
    [ -f "$f" ]
}

for BATCH_ID in $(seq -f "%03g" 1 42); do

    DIR="${DATA_ROOT}/${BATCH_ID}"

    # 폴더 없으면 건너뜀
    [ -d "$DIR" ] || continue

    OUT="${DIR}/idiom_${BATCH_ID}.runtime.json"

    # target은 필수
    if ! check_file "${DIR}/${BATCH_ID}-target.compact.json"; then
        echo "SKIP ${BATCH_ID} (target 없음)"
        continue
    fi

    echo
    echo "=============================="
    echo "BATCH ${BATCH_ID}"
    echo "=============================="

    # target 생성 (5개 이디엄: expression/explanation/examples)
    python3 "$MERGE_PY" target "${DIR}/${BATCH_ID}-target.compact.json" --out "$OUT"

    # en : 있으면 번역, 없으면 mirror (target=en 파이프라인에서는 항상 이 경로로 자동 미러링됨)
    if check_file "${DIR}/${BATCH_ID}-en.compact.json"; then
        python3 "$MERGE_PY" en \
            "${DIR}/${BATCH_ID}-en.compact.json" \
            --base "$OUT" --out "$OUT"
    else
        python3 "$MERGE_PY" en --mirror \
            --base "$OUT" --out "$OUT"
    fi

    # es fr pt zh jp : 있는 것만 병합 (en에서 번역, 미러 개념 없음)
    for lang in es fr pt zh jp; do
        if check_file "${DIR}/${BATCH_ID}-${lang}.compact.json"; then
            python3 "$MERGE_PY" "$lang" \
                "${DIR}/${BATCH_ID}-${lang}.compact.json" \
                --base "$OUT" --out "$OUT"
        else
            echo "  - ${lang} 없음 → skip"
        fi
    done

    # kr : 기본은 번역, 없으면 mirror / --kr-mirror 지정 시 무조건 mirror
    if [ "$KR_MODE" = "translate" ]; then
        if check_file "${DIR}/${BATCH_ID}-kr.compact.json"; then
            python3 "$MERGE_PY" kr \
                "${DIR}/${BATCH_ID}-kr.compact.json" \
                --base "$OUT" --out "$OUT"
        else
            echo "  - kr 없음 → mirror"
            python3 "$MERGE_PY" kr --mirror \
                --base "$OUT" --out "$OUT"
        fi
    else
        python3 "$MERGE_PY" kr --mirror \
            --base "$OUT" --out "$OUT"
    fi

    echo "✓ 완료: ${BATCH_ID}"

done

echo
echo "========== ALL DONE =========="