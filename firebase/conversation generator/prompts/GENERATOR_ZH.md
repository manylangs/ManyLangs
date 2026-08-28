MUST NOT DELETE
ManyLangs 중국어(간체자) 회화 원문 생성 매뉴얼 (Claude / GPT 공용판)
GENERATOR_ZH.md — v1.0

이 문서는 Claude와 GPT 양쪽에서 동일하게 동작해야 한다. 외부 대화 맥락이나 이전 문서를 참조하지 않아도 이 문서 하나만으로 실행 가능해야 한다.

━━━━━━━━━━━━━━━━━━
0. 최상위 원칙
━━━━━━━━━━━━━━━━━━

이 문서는 중국어(zh-CN, 대륙 표준 만다린/普通话, 간체자) 원문만 생성한다. 번역 품질은 고려하지 않는다. 다른 언어(한국어/영어/스페인어/프랑스어/독일어/이탈리아어/포르투갈어/일본어/러시아어) 표현 가능성 때문에 중국어 표현을 단순화·수정하지 않는다. 오직 중국 대륙 원어민이 실제로 쓰는 자연스러운 표현만을 기준으로 생성한다.

━━━━━━━━━━━━━━━━━━
1. 역할
━━━━━━━━━━━━━━━━━━

이 문서의 역할은 중국어 회화 교재의 원문(target)을 생성하는 것 하나뿐이다. 번역/QA채점/merge는 하지 않는다. 결과물은 prompts/TRANSLATOR_{LANG}.md (target 자기 자신인 ZH 제외, 나머지 언어) 각각이 입력받아 번역하고, merge.py가 최종 합산한다. GENERATOR_{LANG}.md 네이밍 규칙을 따르는 여러 목표언어 제너레이터 중 하나(ZH)다.

━━━━━━━━━━━━━━━━━━
2~3. 목적 / 입력
━━━━━━━━━━━━━━━━━━

입력된 BATCH_ID(001~060)에 대해 4장 챕터 목록에서 해당 챕터 1개를 확정하고, 그 주제의 중국어 회화 10세트(세트당 6줄)를 생성해 압축 JSON으로 출력한다. 입력 형식: "001-target" 또는 "BATCH_ID: 001".

━━━━━━━━━━━━━━━━━━
4. 확정 챕터 목록 (고정, 변경 금지)
━━━━━━━━━━━━━━━━━━

KR-target/ES-target과 동일한 60개 상황·레벨 구조를 공유하되, ChapterID 접두어는 CONV_ZH_, chapter_title은 중국어로 새로 창작한다.
레벨: 001–010 A1 / 011–020 A2 / 021–030 B1 / 031–040 B2 / 041–050 C1 / 051–060 C2.

| IDX | ChapterID | LEVEL | chapter_title (target, zh-CN 간체) |
|---:|---|---|---|
| 001 | CONV_ZH_GREETINGS | A1 | 问候 |
| 002 | CONV_ZH_SELF_INTRODUCTION | A1 | 自我介绍 |
| 003 | CONV_ZH_NATIONALITY_LANGUAGES | A1 | 国籍和语言 |
| 004 | CONV_ZH_JOBS_OCCUPATIONS | A1 | 职业 |
| 005 | CONV_ZH_FAMILY_INTRODUCTION | A1 | 介绍家人 |
| 006 | CONV_ZH_NUMBERS_PRICES | A1 | 数字和价格 |
| 007 | CONV_ZH_ASKING_DIRECTIONS | A1 | 问路 |
| 008 | CONV_ZH_DESCRIBING_PLACES | A1 | 描述地点 |
| 009 | CONV_ZH_ORDERING_FOOD | A1 | 点餐 |
| 010 | CONV_ZH_ORDERING_CAFE | A1 | 在咖啡店点单 |
| 011 | CONV_ZH_SHOPPING | A2 | 购物 |
| 012 | CONV_ZH_TASTES_PREFERENCES | A2 | 喜好 |
| 013 | CONV_ZH_TIME_DAYS | A2 | 时间和星期 |
| 014 | CONV_ZH_MAKING_APPOINTMENTS | A2 | 约定时间 |
| 015 | CONV_ZH_DESCRIBING_HOME | A2 | 描述家和房间 |
| 016 | CONV_ZH_TALKING_WEATHER | A2 | 谈论天气 |
| 017 | CONV_ZH_USING_TRANSPORT | A2 | 使用公共交通 |
| 018 | CONV_ZH_HOBBIES | A2 | 爱好 |
| 019 | CONV_ZH_HEALTH_SYMPTOMS | A2 | 健康和症状 |
| 020 | CONV_ZH_ASKING_HELP | A2 | 寻求帮助 |
| 021 | CONV_ZH_DORMITORY_LIFE | B1 | 宿舍生活 |
| 022 | CONV_ZH_ATTENDING_CLASSES | B1 | 上课 |
| 023 | CONV_ZH_PROFESSOR_CONSULTATION | B1 | 与教授面谈 |
| 024 | CONV_ZH_ASSIGNMENTS_SUBMISSIONS | B1 | 作业和提交 |
| 025 | CONV_ZH_TEAM_PROJECTS | B1 | 团队项目 |
| 026 | CONV_ZH_PRESENTATION_PREP_CAMPUS | B1 | 准备演讲 |
| 027 | CONV_ZH_EXAM_PREPARATION | B1 | 准备考试 |
| 028 | CONV_ZH_COLLEGE_FRIENDS | B1 | 大学朋友 |
| 029 | CONV_ZH_CLUB_ACTIVITIES | B1 | 社团活动 |
| 030 | CONV_ZH_SCHOOL_EVENTS | B1 | 学校活动 |
| 031 | CONV_ZH_BANK_SERVICES | B2 | 银行业务 |
| 032 | CONV_ZH_HOSPITAL_PHARMACY | B2 | 医院和药店 |
| 033 | CONV_ZH_GOVERNMENT_OFFICE | B2 | 政府机关 |
| 034 | CONV_ZH_PART_TIME_JOBS | B2 | 兼职工作 |
| 035 | CONV_ZH_TRAVEL_PLANNING | B2 | 旅行计划 |
| 036 | CONV_ZH_ACCOMMODATION_BOOKING | B2 | 预订住宿 |
| 037 | CONV_ZH_FINDING_RESTAURANTS | B2 | 寻找餐厅 |
| 038 | CONV_ZH_SHOPPING_DETAILS | B2 | 购物细节 |
| 039 | CONV_ZH_SMARTPHONES_APPS | B2 | 智能手机和应用 |
| 040 | CONV_ZH_SNS_ONLINE_COMMUNITIES | B2 | 社交媒体和在线社区 |
| 041 | CONV_ZH_JOB_INTERVIEW | C1 | 求职面试 |
| 042 | CONV_ZH_FIRST_DAY_WORK | C1 | 第一天上班 |
| 043 | CONV_ZH_TALKING_COWORKERS | C1 | 和同事交谈 |
| 044 | CONV_ZH_WORK_INSTRUCTIONS_REPORTS | C1 | 工作指示和汇报 |
| 045 | CONV_ZH_LEADING_MEETINGS | C1 | 主持会议 |
| 046 | CONV_ZH_CLIENT_COMMUNICATION | C1 | 客户沟通 |
| 047 | CONV_ZH_EMAIL_DISCUSSION | C1 | 工作邮件 |
| 048 | CONV_ZH_ISSUE_SOLVING | C1 | 解决问题 |
| 049 | CONV_ZH_SCHEDULE_MANAGEMENT | C1 | 日程管理 |
| 050 | CONV_ZH_BUSINESS_TRIP_PREP | C1 | 准备出差 |
| 051 | CONV_ZH_EXHIBITIONS_FAIRS | C2 | 展览会 |
| 052 | CONV_ZH_BUSINESS_NETWORKING | C2 | 商务社交 |
| 053 | CONV_ZH_PRESENTATION_PREP_BIZ | C2 | 准备演讲（商务） |
| 054 | CONV_ZH_MARKETING_PR | C2 | 市场营销和公关 |
| 055 | CONV_ZH_PROJECT_PLANNING | C2 | 项目规划 |
| 056 | CONV_ZH_DATA_ANALYTICS | C2 | 数据和分析 |
| 057 | CONV_ZH_COMPANY_POLICIES | C2 | 公司政策 |
| 058 | CONV_ZH_TRAVEL_VACATION | C2 | 出差和休假 |
| 059 | CONV_ZH_CAREER_GROWTH | C2 | 职业发展 |
| 060 | CONV_ZH_WORK_CULTURE_ADAPTATION | C2 | 适应企业文化 |

━━━━━━━━━━━━━━━━━━
5. 화자 시스템 (고정)
━━━━━━━━━━━━━━━━━━

- A = 여성 화자, B = 남성 화자, 10세트 전체 고정.
- 허용 여성 이름: 婷婷, 雨萱, 静怡, 佳琪
- 허용 남성 이름: 浩然, 子轩, 天佑, 俊杰
- 이름은 자연스러울 때만 사용, 사용 시 위 목록 준수.
- 중국어는 형용사·동사에 문법적 성별 구분이 없다 (러시아어/스페인어/프랑스어와 다름). 대신 이름·대명사(他/她)·호칭의 자연스러운 성별 일관성만 유지하면 된다 — 화자 본인 또는 제3자의 성별이 확정되면 세트 안에서 他/她가 중간에 바뀌지 않아야 한다.

━━━━━━━━━━━━━━━━━━
6~9. 세트 구조 / 상호작용 / 질문-응답 / 길이 규칙
━━━━━━━━━━━━━━━━━━

GENERATOR_KR.md·GENERATOR_ES.md와 동일한 원칙을 그대로 따른다: 10세트×6줄, A→B→A→B→A→B 고정, 세트 간 독립(스토리 연속성 금지), 시작 방식·상황·대화 흐름 다양성 필수, 모든 B 라인은 직전 A 라인에 직접 반응, 질문은 반드시 다음 라인에서 답변.

레벨별 길이는 한자 수(공백 없는 글자 수) 기준으로 카운트한다:
A1: 8~16자 / A2: 10~18자 / B1: 12~20자 / B2: 14~24자 / C1: 16~28자 / C2: 18~32자.
(중국어는 띄어쓰기가 없어 어절/단어 대신 글자 수로 카운트한다.)

이 범위는 상한선이 아니라 대략적인 가이드다. 실제 원어민이 자연스럽게 말하면 범위를 살짝 넘어도 된다 — 범위를 지키려고 자연스러운 문장을 인위적으로 잘라내거나, 정형화된 짧은 안부 표현(예: 매 세트 첫 줄을 판박이처럼 반복하는 인사)으로 채우지 않는다. 특히 A1도 '아기 말투'가 아니다 — 어휘와 문법이 단순할 뿐, 실제 성인 원어민이 쓰는 자연스러운 리듬을 유지한다.

━━━━━━━━━━━━━━━━━━
10. 중국어 생성 원칙
━━━━━━━━━━━━━━━━━━

생성 기준: "실제 중국 대륙 원어민이라면 이렇게 말할까?"

지역 표준: zh-CN 대륙 표준 만다린(普通话). 번체자·광둥어식·대만식·민난어식 표현·어휘·문법 금지. 전각 문장부호(，。？！：；""'') 사용, 반각 문장부호(, . ? !) 금지. 양사(个/位/条/张 등)를 명사에 맞게 정확히 사용한다.

격식 기준: 상황이 편하면 캐주얼한 회화체(你), 상황이 격식적(면접, 고객 응대 등)이면 정중한 표현(您, 请)을 사용한다. 한 세트 안에서 급격히 바뀌지 않는다.

반드시 지킬 것: 자연스러운 구어체, 짧은 리액션 적극 사용("真的吗？", "太好了！", "是嘛！", 그 외 "好的/没关系/谢谢/明白了/是这样啊"), 각 세트 최소 1회 질문-응답 쌍 필수, 반복 억제(같은 리액션 표현은 10세트 전체에서 최대 2회까지만 — 3회 이상 반복되면 재작성), 어휘 다양성(喜欢만 반복하지 않고 상황에 따라 更喜欢/中意/偏爱 등 사용), C1/C2는 "我觉得这样比较好"/"这个方向应该更有效率"처럼 격식 있는 업무 표현도 사용.

절대 금지: 번체자, 광둥어·대만식·민난어 표현, 반각 문장부호, 번역투, 교과서 문장, 지나치게 격식적인 문어체, 의미 없는 반복 응답("好。", "是。"만 반복).

━━━━━━━━━━━━━━━━━━
11. TTS 안전 규칙
━━━━━━━━━━━━━━━━━━

모든 숫자·금액·시각·날짜·단위는 한자로 풀어 쓴다. 아라비아 숫자나 %, $, ¥ 등 기호 금지.
예: ❌ 3点 → ✅ 三点 / ❌ 20% → ✅ 百分之二十 / ❌ 5000元 → ✅ 五千元
서수도 풀어 쓴다 (第一, 第二, 第三...). 이모지·이모티콘 금지.

━━━━━━━━━━━━━━━━━━
12~14. 출력 형식 (텍스트, JSON 아님) / 자체 확인 / 최종 출력 형식
━━━━━━━━━━━━━━━━━━

이 문서는 JSON을 직접 만들지 않는다. 아래 텍스트 형식으로만 출력하고,
JSON으로의 변환은 별도 파서(text_parser.py)가 전담한다.

형식 (예시는 CONV_XX_GREETINGS 배치 형태):

LEVEL: a1
CHAPTER_ID: CONV_XX_GREETINGS
TITLE: 예시 제목

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

GENERATOR_ES.md 15장과 동일한 구조적 금지사항(세트/줄 수 변경, meta 변경, target 범위 이탈, 챕터 변경, 질문-응답 누락, 시작/상황/흐름 반복, 이모지 등)에 더해: 번체자 사용, 반각 문장부호 사용, 양사 오용, 세트 내 他/她 일관성 위반.

━━━━━━━━━━━━━━━━━━
16~18. 실행 명령 / 공용 안내 / 변경 이력
━━━━━━━━━━━━━━━━━━

BATCH_ID 입력 시 즉시 실행 (범위 001~060). 이 문서 외 다른 매뉴얼(prompts/TRANSLATOR_*.md, merge.py) 내용을 함께 붙여넣지 않는다.

[v1.0 — GENERATOR_KR.md/GENERATOR_ES.md 구조 기반 신규 작성]
- 60개 챕터는 동일 구조 공유, ChapterID 접두어 CONV_ZH_, chapter_title 60개 중국어로 신규 창작.
- 화자 이름을 중국어권 이름(婷婷/雨萱/静怡/佳琪, 浩然/子轩/天佑/俊杰)으로 설정.
- TRANSLATOR_ZH.md(v1.1)의 지역 표준(zh-CN, 간체자 전용, 전각 문장부호, 양사 정확성)을 원문 생성 단계 규칙으로 이식. 중국어는 문법적 성별 구분이 없으므로 성별 일치 규칙 대신 대명사 일관성 규칙만 채택 (TRANSLATOR_ZH.md와 동일한 판단).
- 9장 길이 규칙은 중국어 특성상 어절 대신 글자 수 기준으로 신규 설정 (잠정치, 실사용 후 조정 필요).
