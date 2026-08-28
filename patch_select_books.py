#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
app/select-books/page.tsx 를 시리즈별 출시 제어 로직에 맞게 패치합니다.
- 4곳을 정확히 일치하는 문자열 기준으로 교체합니다.
- 일치하는 곳이 정확히 1개가 아니면(0개 또는 2개 이상) 그 항목은 건드리지 않고
  경고만 출력합니다 (파일을 안전하게 보존하기 위함).
- 실행 전 자동으로 .bak 백업 파일을 만듭니다.

사용법:
  python3 patch_select_books.py /path/to/app/select-books/page.tsx
"""

import sys
import shutil

REPLACEMENTS = [
    # 1) import 수정
    (
        'import { LANGUAGES } from "@/app/config/languages";',
        'import { LANGUAGES, RELEASED_CONTENT, getReleasedSeries, getReleasedLevels } from "@/app/config/languages";',
    ),
    # 2) 타깃언어 select onChange — book/level 리셋 추가
    (
        '''                    <select
                      value={targetLang}
                      onChange={(e) => {
                        const v = e.target.value;
                        setTargetLang(v);
                        localStorage.setItem("ml_target_lang", v);
                      }}''',
        '''                    <select
                      value={targetLang}
                      onChange={(e) => {
                        const v = e.target.value;
                        setTargetLang(v);
                        localStorage.setItem("ml_target_lang", v);
                        setBook("");
                        setLevel("");
                      }}''',
    ),
    # 3) 시리즈(book) select — 목표언어별 필터링
    (
        '''                  <select
                    value={book}
                    onChange={(e) => {
                      const next = e.target.value;
                      setBook(next);
                      setLevel(SERIES_CONFIG[next]?.hasLevel ? "a1" : "");
                    }}
                    className="block w-full rounded border px-3 py-2"
                  >
                    <option value="">Select textbook</option>
                    {Object.entries(SERIES_CONFIG).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v.label}
                      </option>
                    ))}
                  </select>''',
        '''                  <select
                    value={book}
                    onChange={(e) => {
                      const next = e.target.value;
                      setBook(next);
                      const levels = getReleasedLevels(targetLang, next);
                      setLevel(SERIES_CONFIG[next]?.hasLevel ? (levels[0] ?? "") : "");
                    }}
                    className="block w-full rounded border px-3 py-2"
                  >
                    <option value="">Select textbook</option>
                    {Object.entries(SERIES_CONFIG)
                      .filter(([k]) => getReleasedSeries(targetLang).includes(k))
                      .map(([k, v]) => (
                        <option key={k} value={k}>
                          {v.label}
                        </option>
                      ))}
                  </select>''',
    ),
    # 4) 레벨(level) select — 목표언어+시리즈별 필터링
    (
        '''                  {book && SERIES_CONFIG[book].hasLevel && (
                    <select
                      value={level}
                      onChange={(e) => setLevel(e.target.value)}
                      className="block w-full rounded border px-3 py-2"
                    >
                      {LEVELS.map((l) => (
                        <option key={l} value={l.toLowerCase()}>
                          {l}
                        </option>
                      ))}
                    </select>
                  )}''',
        '''                  {book && SERIES_CONFIG[book].hasLevel && (
                    <select
                      value={level}
                      onChange={(e) => setLevel(e.target.value)}
                      className="block w-full rounded border px-3 py-2"
                    >
                      {LEVELS
                        .filter((l) => getReleasedLevels(targetLang, book).includes(l.toLowerCase()))
                        .map((l) => (
                          <option key={l} value={l.toLowerCase()}>
                            {l}
                          </option>
                        ))}
                    </select>
                  )}''',
    ),
]


def main():
    if len(sys.argv) != 2:
        print("사용법: python3 patch_select_books.py /path/to/app/select-books/page.tsx")
        sys.exit(1)

    path = sys.argv[1]

    with open(path, "r", encoding="utf-8") as f:
        content = f.read()

    backup_path = path + ".bak"
    shutil.copyfile(path, backup_path)
    print(f"백업 생성: {backup_path}")

    applied = 0
    for i, (old, new) in enumerate(REPLACEMENTS, start=1):
        count = content.count(old)
        if count == 1:
            content = content.replace(old, new)
            applied += 1
            print(f"[{i}] 적용됨")
        elif count == 0:
            print(f"[{i}] ⚠️  일치하는 부분을 찾지 못했습니다 — 건너뜀 (파일이 이미 다르게 수정되었을 수 있습니다)")
        else:
            print(f"[{i}] ⚠️  일치하는 부분이 {count}개 발견되어 애매합니다 — 건너뜀 (수동 확인 필요)")

    with open(path, "w", encoding="utf-8") as f:
        f.write(content)

    print(f"\n완료: {applied}/{len(REPLACEMENTS)}개 항목 적용됨")
    if applied < len(REPLACEMENTS):
        print("⚠️  일부 항목이 적용되지 않았습니다. 위 경고를 확인하고 해당 부분은 수동으로 수정해주세요.")
        print(f"    (원본은 {backup_path} 에 그대로 보존되어 있습니다)")


if __name__ == "__main__":
    main()
