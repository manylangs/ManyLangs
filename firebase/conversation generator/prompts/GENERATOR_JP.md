MUST NOT DELETE
ManyLangs 일본어 회화 원문 생성 매뉴얼 (Claude / GPT 공용판)
GENERATOR_JP.md — v1.0

이 문서는 Claude와 GPT 양쪽에서 동일하게 동작해야 한다. 외부 대화 맥락이나 이전 문서를 참조하지 않아도 이 문서 하나만으로 실행 가능해야 한다.

━━━━━━━━━━━━━━━━━━
0. 최상위 원칙
━━━━━━━━━━━━━━━━━━

이 문서는 일본어(ja-JP, 도쿄 기준 표준어/標準語) 원문만 생성한다. 번역 품질은 고려하지 않는다. 다른 언어 표현 가능성 때문에 일본어 표현을 단순화·수정하지 않는다. 오직 도쿄 기준 일본어 원어민이 실제로 쓰는 자연스러운 표현만을 기준으로 생성한다.

━━━━━━━━━━━━━━━━━━
1. 역할
━━━━━━━━━━━━━━━━━━

일본어 회화 교재의 원문(target) 생성만 담당한다. 번역/QA채점/merge는 하지 않는다. 결과물은 prompts/TRANSLATOR_{LANG}.md (JP 제외 나머지 en/es/fr/pt/kr/zh/ru)가 번역하고 merge.py가 합산한다.

━━━━━━━━━━━━━━━━━━
2~3. 목적 / 입력
━━━━━━━━━━━━━━━━━━

BATCH_ID(001~060) → 4장 챕터 1개 확정 → 그 주제의 일본어 회화 10세트(세트당 6줄) 생성 → 압축 JSON 출력. 입력: "001-target" 또는 "BATCH_ID: 001".

━━━━━━━━━━━━━━━━━━
4. 확정 챕터 목록
━━━━━━━━━━━━━━━━━━

동일 60개 상황·레벨 구조 공유, ChapterID 접두어 CONV_JP_, chapter_title은 일본어로 새로 창작.

| IDX | ChapterID | LEVEL | chapter_title (target, ja-JP) |
|---:|---|---|---|
| 001 | CONV_JP_GREETINGS | A1 | あいさつ |
| 002 | CONV_JP_SELF_INTRODUCTION | A1 | 自己紹介 |
| 003 | CONV_JP_NATIONALITY_LANGUAGES | A1 | 国籍と言語 |
| 004 | CONV_JP_JOBS_OCCUPATIONS | A1 | 職業 |
| 005 | CONV_JP_FAMILY_INTRODUCTION | A1 | 家族の紹介 |
| 006 | CONV_JP_NUMBERS_PRICES | A1 | 数字と値段 |
| 007 | CONV_JP_ASKING_DIRECTIONS | A1 | 道を尋ねる |
| 008 | CONV_JP_DESCRIBING_PLACES | A1 | 場所の説明 |
| 009 | CONV_JP_ORDERING_FOOD | A1 | 食事の注文 |
| 010 | CONV_JP_ORDERING_CAFE | A1 | カフェでの注文 |
| 011 | CONV_JP_SHOPPING | A2 | 買い物 |
| 012 | CONV_JP_TASTES_PREFERENCES | A2 | 好みと好き嫌い |
| 013 | CONV_JP_TIME_DAYS | A2 | 時間と曜日 |
| 014 | CONV_JP_MAKING_APPOINTMENTS | A2 | 約束をする |
| 015 | CONV_JP_DESCRIBING_HOME | A2 | 家の説明 |
| 016 | CONV_JP_TALKING_WEATHER | A2 | 天気の話 |
| 017 | CONV_JP_USING_TRANSPORT | A2 | 公共交通機関の利用 |
| 018 | CONV_JP_HOBBIES | A2 | 趣味 |
| 019 | CONV_JP_HEALTH_SYMPTOMS | A2 | 健康と症状 |
| 020 | CONV_JP_ASKING_HELP | A2 | 助けを求める |
| 021 | CONV_JP_DORMITORY_LIFE | B1 | 寮生活 |
| 022 | CONV_JP_ATTENDING_CLASSES | B1 | 授業に出る |
| 023 | CONV_JP_PROFESSOR_CONSULTATION | B1 | 教授との面談 |
| 024 | CONV_JP_ASSIGNMENTS_SUBMISSIONS | B1 | 課題と提出 |
| 025 | CONV_JP_TEAM_PROJECTS | B1 | グループプロジェクト |
| 026 | CONV_JP_PRESENTATION_PREP_CAMPUS | B1 | 発表準備 |
| 027 | CONV_JP_EXAM_PREPARATION | B1 | 試験準備 |
| 028 | CONV_JP_COLLEGE_FRIENDS | B1 | 大学の友人 |
| 029 | CONV_JP_CLUB_ACTIVITIES | B1 | サークル活動 |
| 030 | CONV_JP_SCHOOL_EVENTS | B1 | 学校行事 |
| 031 | CONV_JP_BANK_SERVICES | B2 | 銀行での用事 |
| 032 | CONV_JP_HOSPITAL_PHARMACY | B2 | 病院と薬局 |
| 033 | CONV_JP_GOVERNMENT_OFFICE | B2 | 役所での手続き |
| 034 | CONV_JP_PART_TIME_JOBS | B2 | アルバイト |
| 035 | CONV_JP_TRAVEL_PLANNING | B2 | 旅行の計画 |
| 036 | CONV_JP_ACCOMMODATION_BOOKING | B2 | 宿泊予約 |
| 037 | CONV_JP_FINDING_RESTAURANTS | B2 | おいしい店を探す |
| 038 | CONV_JP_SHOPPING_DETAILS | B2 | 買い物の詳細 |
| 039 | CONV_JP_SMARTPHONES_APPS | B2 | スマートフォンとアプリ |
| 040 | CONV_JP_SNS_ONLINE_COMMUNITIES | B2 | SNSとオンラインコミュニティ |
| 041 | CONV_JP_JOB_INTERVIEW | C1 | 就職面接 |
| 042 | CONV_JP_FIRST_DAY_WORK | C1 | 出社初日 |
| 043 | CONV_JP_TALKING_COWORKERS | C1 | 同僚との会話 |
| 044 | CONV_JP_WORK_INSTRUCTIONS_REPORTS | C1 | 業務指示と報告 |
| 045 | CONV_JP_LEADING_MEETINGS | C1 | 会議の進行 |
| 046 | CONV_JP_CLIENT_COMMUNICATION | C1 | 顧客対応 |
| 047 | CONV_JP_EMAIL_DISCUSSION | C1 | 業務メール |
| 048 | CONV_JP_ISSUE_SOLVING | C1 | 問題解決 |
| 049 | CONV_JP_SCHEDULE_MANAGEMENT | C1 | スケジュール管理 |
| 050 | CONV_JP_BUSINESS_TRIP_PREP | C1 | 出張準備 |
| 051 | CONV_JP_EXHIBITIONS_FAIRS | C2 | 展示会 |
| 052 | CONV_JP_BUSINESS_NETWORKING | C2 | ビジネスネットワーキング |
| 053 | CONV_JP_PRESENTATION_PREP_BIZ | C2 | 発表準備（ビジネス） |
| 054 | CONV_JP_MARKETING_PR | C2 | マーケティングと広報 |
| 055 | CONV_JP_PROJECT_PLANNING | C2 | プロジェクト企画 |
| 056 | CONV_JP_DATA_ANALYTICS | C2 | データと分析 |
| 057 | CONV_JP_COMPANY_POLICIES | C2 | 会社の方針 |
| 058 | CONV_JP_TRAVEL_VACATION | C2 | 出張と休暇 |
| 059 | CONV_JP_CAREER_GROWTH | C2 | キャリアと成長 |
| 060 | CONV_JP_WORK_CULTURE_ADAPTATION | C2 | 職場文化への適応 |

━━━━━━━━━━━━━━━━━━
5. 화자 시스템 (고정)
━━━━━━━━━━━━━━━━━━

- A = 여성, B = 남성, 10세트 전체 고정.
- 허용 여성 이름: 由紀, さくら, 美咲, 愛
- 허용 남성 이름: 翔太, 拓也, 大輔, 健太
- 이름은 자연스러울 때만 사용. 일본어는 형용사·동사에 문법적 성별 구분이 없다 (중국어와 마찬가지) — 이름·대명사(彼/彼女)·화법의 자연스러운 성별 일관성만 유지한다.

━━━━━━━━━━━━━━━━━━
6~9. 세트 구조 / 상호작용 / 질문-응답 / 길이 규칙
━━━━━━━━━━━━━━━━━━

GENERATOR_KR.md·GENERATOR_ES.md와 동일: 10세트×6줄, A→B→A→B→A→B 고정, 세트 간 독립, 시작·상황·흐름 다양성 필수, 모든 B 라인은 직전 A 라인에 반응, 질문은 다음 라인에서 반드시 답변.

레벨별 길이(음절 수 기준, 히라가나·가타카나·한자 각 1글자 = 발음 단위로 대략 카운트): A1 8~16 / A2 10~18 / B1 12~20 / B2 14~24 / C1 16~28 / C2 18~32 (일본어는 띄어쓰기가 없어 중국어와 같은 글자 수 기준을 사용).

이 범위는 상한선이 아니라 대략적인 가이드다. 실제 원어민이 자연스럽게 말하면 범위를 살짝 넘어도 된다 — 범위를 지키려고 자연스러운 문장을 인위적으로 잘라내거나, 정형화된 짧은 안부 표현(예: 매 세트 첫 줄을 판박이처럼 반복하는 인사)으로 채우지 않는다. 특히 A1도 '아기 말투'가 아니다 — 어휘와 문법이 단순할 뿐, 실제 성인 원어민이 쓰는 자연스러운 리듬을 유지한다.

━━━━━━━━━━━━━━━━━━
10. 일본어 생성 원칙
━━━━━━━━━━━━━━━━━━

생성 기준: "실제 도쿄 기준 일본어 원어민이라면 이렇게 말할까?"

지역 표준: ja-JP 표준어(標準語/共通語, 도쿄 기준). 관서벤(関西弁) 등 방언 금지. 현대 가나 표기법(現代仮名遣い)과 신자체(新字体)를 사용한다 (구자체·역사적 가나 표기법 금지).

격식 기준: 한 세트 안에서 화자별 격식 수준의 일관성을 유지한다 (한 화자가 세트 중간에 격식 수준을 갑자기 바꾸지 않는다). 기본은 자연스러운 です/ます체를 사용하고, 과도하거나 고풍스러운 케이고(敬語)는 금지한다 — 실제 일상 회화·직장 회화에서 쓰는 자연스러운 수준의 존댓말만 사용한다.

반드시 지킬 것: 자연스러운 구어체, 짧은 리액션("本当ですか？", "いいですね！", "そうなんですね！", 그 외 "わかりました/大丈夫です/ありがとうございます/なるほど/残念です"), 세트당 질문-응답 최소 1쌍 필수, 반복 억제(같은 리액션 표현은 10세트 전체에서 최대 2회까지만 — 3회 이상 반복되면 재작성)·어휘 다양성, C1/C2는 "そのほうが効率的だと思います", "その意見に賛成です"처럼 격식 있는 업무 표현도 사용.

절대 금지: 방언(関西弁 등), 구자체·역사적 가나 표기법, 과도하거나 고풍스러운 케이고, 세트 안에서 화자별 격식 수준을 일관성 없이 바꾸는 것, 번역투, 교과서 문장.

━━━━━━━━━━━━━━━━━━
11. TTS 안전 규칙
━━━━━━━━━━━━━━━━━━

숫자·금액·시각·날짜·단위는 말로 풀어 쓴다. 아라비아 숫자, ¥/%/#// 기호 금지.
예: ❌ 3時 → ✅ 三時 / ❌ 20% → ✅ 二十パーセント
서수도 풀어 쓴다 (一番目, 二番目, 三番目...). 이모지·이모티콘 금지.

━━━━━━━━━━━━━━━━━━
12~14. 출력 형식 (텍스트, JSON 아님) / 자체 확인 / 최종 출력 형식
━━━━━━━━━━━━━━━━━━

이 문서는 JSON을 직접 만들지 않는다. 아래 텍스트 형식으로만 출력하고,
JSON으로의 변환은 별도 파서(text_parser.py)가 전담한다.

형식 (예시는 CONV_JP_GREETINGS 배치 형태):

LEVEL: a1
CHAPTER_ID: CONV_JP_GREETINGS
TITLE: あいさつ

SET 001
A: (문장)
B: (문장)
A: (문장)
B: (문장)
A: (문장)
B: (문장)

SET 002
A: (문장)
B: (문장)
A: (문장)
B: (문장)
A: (문장)
B: (문장)

(... SET 010까지 동일한 형태로 이어짐)

규칙: 헤더 3줄(LEVEL/CHAPTER_ID/TITLE) 다음 빈 줄, 그다음 SET 001~010을 오름차순으로. 각 SET 블록은 정확히 6줄, 화자 라벨(A:/B:)과 함께 A B A B A B 순서. 세트 사이엔 빈 줄 하나. JSON·중괄호·대괄호·코드펜스·설명 등 이 형식 외의 것은 출력하지 않는다.

자체 확인: TITLE/60문장 비어있지 않음, SET이 001~010 오름차순으로 정확히 10개, A/B 순서 고정, TITLE이 4장 표와 일치, 상황 다양성, 질문-응답 완결, 성별 일치 정확(해당 언어라면), 격식 혼용 없음, 12장 텍스트 형식을 정확히 따름(JSON 아님). 실패 시 재생성.
━━━━━━━━━━━━━━━━━━
15. 절대 금지 사항
━━━━━━━━━━━━━━━━━━

GENERATOR_ES.md 15장과 동일한 구조적 금지사항 + 방언 사용, 구자체·역사적 가나 표기법, 과도하거나 고풍스러운 케이고, 세트 내 격식 수준 비일관성.

━━━━━━━━━━━━━━━━━━
16~18. 실행 명령 / 공용 안내 / 변경 이력
━━━━━━━━━━━━━━━━━━

BATCH_ID 입력 시 즉시 실행 (001~060). 다른 매뉴얼 내용 함께 붙여넣지 않는다.

[v1.0 — GENERATOR_KR.md/GENERATOR_ES.md 구조 기반 신규 작성]
- 60개 챕터 동일 구조 공유, ChapterID 접두어 CONV_JP_, chapter_title 60개 일본어로 신규 창작.
- 화자 이름: 由紀/さくら/美咲/愛, 翔太/拓也/大輔/健太.
- TRANSLATOR_JP.md(v1.1)의 지역 표준(標準語, 도쿄 기준), 현대 가나·신자체 규칙, 세트 내 격식 일관성, 과도한 케이고 금지 규칙을 원문 생성 단계로 이식. 일본어는 문법적 성별 구분이 없으므로 성별 일치 규칙 대신 대명사 일관성만 채택 (TRANSLATOR_ZH.md·TRANSLATOR_JP.md와 동일한 판단).
- 9장 길이 규칙은 일본어 특성상 어절 대신 글자 수 기준으로 신규 설정 (GENERATOR_ZH.md와 동일 방식).
