import json
import os
import sys
import glob
import pprint
from collections import defaultdict

# ============================================================
# 7개 언어별 극성/반의어 충돌 사전 (최대한 상세히 구축)
# ============================================================
POLARITY_CONFLICTS = {
    "en": [
        {"already", "not yet"},
        {"already", "yet"},
        {"still", "no longer"},
        {"still", "not anymore"},
        {"always", "never"},
        {"ever", "never"},
    ],
    "es": [
        {"ya", "todavía no"},
        {"ya", "aún no"},
        {"todavía", "ya no"},
        {"siempre", "nunca"},
        {"algo", "nada"},
        {"alguien", "nadie"},
    ],
    "fr": [
        {"déjà", "pas encore"},
        {"encore", "ne ... plus"},
        {"toujours", "ne ... plus"},
        {"quelque chose", "rien"},
        {"quelqu'un", "personne"},
    ],
    "pt": [
        {"já", "ainda não"},
        {"ainda", "já não"},
        {"sempre", "nunca"},
        {"algo", "nada"},
        {"alguém", "ninguém"},
    ],
    "kr": [
        {"이미", "아직"},
        {"벌써", "아직"},
        {"항상", "절대"},
        {"언제나", "결코"},
        {"누군가", "아무도"},
        {"무언가", "아무것도"},
    ],
    "jp": [
        {"もう", "まだ"},
        {"ずっと", "もう～ない"},
        {"いつも", "決して"},
        {"誰か", "誰も"},
        {"何か", "何も"},
    ],
    "zh": [
        {"已经", "还没"},
        {"已经", "还不"},
        {"已经", "尚未"},
        {"仍然", "不再"},
        {"总是", "从不"},
        {"有人", "没人"},
        {"有些", "没有"},
    ],
}

def check_and_fix_mz(lang, core, mz_list):
    if lang not in POLARITY_CONFLICTS:
        return mz_list, []

    issues = []
    new_mz = mz_list.copy()

    for conflict_set in POLARITY_CONFLICTS[lang]:
        if all(item in new_mz for item in conflict_set):
            items_to_remove = [item for item in conflict_set if item != core]
            for rem in items_to_remove:
                if rem in new_mz and rem != new_mz[0]:
                    new_mz.remove(rem)
                    issues.append(f"'{rem}' 제거 (충돌 쌍: {conflict_set})")

    if not new_mz:
        new_mz = [core]
    if new_mz[0] != core:
        if core in new_mz:
            new_mz.remove(core)
        new_mz.insert(0, core)

    return new_mz, issues

def process_file(filepath):
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            data = json.load(f)
    except Exception as e:
        return None, str(e)

    # batch_id 추출: 부모 폴더명(예: 001)을 우선 사용
    parent_folder = os.path.basename(os.path.dirname(filepath))
    if parent_folder.isdigit():
        batch_id = parent_folder
    else:
        batch_id = data.get("meta", {}).get("id", "unknown")

    word_replacements = {}
    total_issues = 0

    for block in data.get("blocks", []):
        block_id = block.get("id", "")
        word_data = block.get("word", {})

        for lang in ["en", "es", "fr", "pt", "kr", "jp", "zh"]:
            if lang not in word_data:
                continue
            w = word_data[lang]
            core = w.get("core", "")
            mz = w.get("meaning_zone", [])
            if not mz or not core:
                continue

            new_mz, issues = check_and_fix_mz(lang, core, mz)
            if issues:
                total_issues += 1
                word_replacements[(block_id, lang)] = {
                    "core": core,
                    "meaning_zone": new_mz
                }
                print(f"  ⚠️ [{batch_id}] {block_id} | {lang}: {', '.join(issues)}")

    if word_replacements:
        return batch_id, {
            "TITLE_REPLACEMENTS": {},
            "WORD_REPLACEMENTS": word_replacements,
            "EXAMPLE_REPLACEMENTS": {},
        }
    return batch_id, None

# ============================================================
# 메인 실행: 현재 디렉토리 아래 모든 data.json 찾기
# ============================================================
if __name__ == "__main__":
    # data/001/data.json 패턴 또는 하위 모든 data.json 재귀 탐색
    json_files = glob.glob("data/*/data.json", recursive=False)
    if not json_files:
        # 혹시 다른 구조라면 모든 하위 탐색
        json_files = glob.glob("**/data.json", recursive=True)

    if not json_files:
        print("❌ 현재 디렉토리에서 data.json 파일을 찾을 수 없습니다.")
        print(f"   현재 위치: {os.getcwd()}")
        sys.exit(1)

    print(f"🔍 총 {len(json_files)}개의 배치 파일을 발견했습니다.\n")
    all_fixes = {}
    processed_count = 0

    for fpath in sorted(json_files):
        batch_id, fixes = process_file(fpath)
        if fixes:
            all_fixes[batch_id] = fixes
        processed_count += 1

    print(f"\n✅ 처리 완료: {processed_count}개 파일 스캔 완료.")
    print(f"🔧 수정이 필요한 배치: {len(all_fixes)}개\n")

    if all_fixes:
        print("=" * 70)
        print("📋 아래 딕셔너리를 voca_review.py의 ALL_REPLACEMENTS = { ... } 안에 붙여넣으세요.")
        print("=" * 70)
        # pprint를 사용하면 튜플 키가 ('block_001', 'en') 형태로 예쁘게 출력됨
        pprint.pprint(all_fixes, indent=2, width=120)
        print("=" * 70)
    else:
        print("🎉 축하합니다! 전체 144개 배치에서 극성/부정문 파생 오류가 단 한 건도 발견되지 않았습니다.")
        print("{}  # 빈 딕셔너리")
