#!/usr/bin/env bash

set -e

MERGE_PY="${MERGE_PY:-./merge.py}"
DATA_ROOT="${DATA_ROOT:-./data}"

# 기본은 한국어 번역 사용
KR_MODE="translate"

# 필요할 때만 mirror
if [ "$1" = "--kr-mirror" ]; then
    KR_MODE="mirror"
fi

check_file() {
    local f="$1"
    [ -f "$f" ]
}

for BATCH_ID in $(seq -f "%03g" 1 60); do

    DIR="${DATA_ROOT}/${BATCH_ID}"

    # 폴더 없으면 건너뜀
    [ -d "$DIR" ] || continue

    OUT="${DIR}/conversation_${BATCH_ID}.runtime.json"

    # target은 필수
    if ! check_file "${DIR}/${BATCH_ID}-target.compact.json"; then
        echo "SKIP ${BATCH_ID} (target 없음)"
        continue
    fi

    echo
    echo "=============================="
    echo "BATCH ${BATCH_ID}"
    echo "=============================="

    # target 생성
    python3 "$MERGE_PY" target "${DIR}/${BATCH_ID}-target.compact.json" --out "$OUT"

    # en : 있으면 번역, 없으면 mirror
    if check_file "${DIR}/${BATCH_ID}-en.compact.json"; then
        python3 "$MERGE_PY" en \
            "${DIR}/${BATCH_ID}-en.compact.json" \
            --base "$OUT" --out "$OUT"
    else
        python3 "$MERGE_PY" en --mirror \
            --base "$OUT" --out "$OUT"
    fi

    # es fr pt : 있는 것만 병합
    for lang in es fr pt; do
        if check_file "${DIR}/${BATCH_ID}-${lang}.compact.json"; then
            python3 "$MERGE_PY" "$lang" \
                "${DIR}/${BATCH_ID}-${lang}.compact.json" \
                --base "$OUT" --out "$OUT"
        else
            echo "  - ${lang} 없음 → skip"
        fi
    done

    # kr : 기본은 번역, 없으면 mirror
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

    # zh jp : 있는 것만 병합
    for lang in zh jp; do
        if check_file "${DIR}/${BATCH_ID}-${lang}.compact.json"; then
            python3 "$MERGE_PY" "$lang" \
                "${DIR}/${BATCH_ID}-${lang}.compact.json" \
                --base "$OUT" --out "$OUT"
        else
            echo "  - ${lang} 없음 → skip"
        fi
    done

    echo "✓ 완료: ${BATCH_ID}"

done

echo
echo "========== ALL DONE =========="