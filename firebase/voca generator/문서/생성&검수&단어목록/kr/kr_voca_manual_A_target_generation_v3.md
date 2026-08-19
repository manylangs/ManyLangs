# KR Vocabulary Manual — Manual A: Target-Language Generation (v3.0)

# 1. Purpose of This Manual

This is Manual A of a 2-manual + 7-prompt pipeline (9 documents total) that replaces the prior single-manual (v1.0) KR-target design. When one LEVEL and BATCH_ID are input, this manual internally performs: batch extraction → POS/domain/polysemy declaration (WORD_SPEC) → CORE + MEANING_ZONE declaration for the **target language only** → target-language example generation → stage-1 QA, and outputs only a **TARGET_BLOCK** (partial JSON) plus a stage-1 status line. It never produces the other 6 helper languages and never produces the final merged JSON — those are out of scope for this manual.

This manual generates content for target language = Korean. Because target = Korean, its "kr" column is not a translation — it is a natural-language mirror of "target" (identical core, identical meaning_zone, identical example text). This manual therefore only ever produces 2 of the 8 language columns: target and kr. This mirrors exactly how the EN-target edition of this pipeline (en_voca_manual_A_target_generation_v2.md) treats "en" as the mirror of "target"; only which column mirrors "target" has moved.

**Why the pipeline was split (v1.0 → v2.0):** the v1.0 single-pass KR-target manual generated all 8 languages plus ran correction and QA in one uninterrupted internal pass, never exposing intermediate output — itself derived by applying the v1.1 EN-target manual's Section 10 (Target-Language Expansion Guide) to Korean. That design does not parallelize: to increase throughput, generation is now restructured, following the same pipeline-split already applied to the EN-target manual, so that (a) the target language is generated once, standalone, by this manual, and (b) each of the 6 remaining helper languages plus the kr-mirror check is generated independently by one of 7 **universal, target-language-agnostic translation prompts** (see Manual B, Section 10), each of which only needs this manual's TARGET_BLOCK output as its input. A separate **Manual B (Merge & Final QA)** — reused unchanged from the EN-target pipeline, per its own Section 10 — then assembles this manual's output together with the 7 translation-prompt outputs into the final runtime JSON and performs correction, QA, and scoring. This manual, Manual B, and the 7 translation prompts together are the complete replacement for the v1.0 single KR-target manual; no functionality has been dropped, only redistributed across documents so each piece can be run independently.

**What changed structurally (v1.0 → v2.0), carried through from the EN-target manual's own v1.1 → v2.0 design decisions:** the old per-language SEMANTIC_FAMILY declaration (CORE / FAMILY / ZONE / EXCLUDE) is replaced everywhere by a single **CORE + MEANING_ZONE** structure (Section 3.4). This also absorbs and retires the old Pivot Lock Rule and the Anti-Translationese Composite Principle (v1.0, Sections 3.4/3.4.1) as separate rules — both are now enforced structurally by the meaning_zone constraint itself (Section 3.4), rather than as a judgment call applied after the fact.

**What changed structurally (v2.0 → v3.0):** examples were previously allowed to use core OR any meaning_zone entry, on the reasoning that every meaning_zone entry was already vetted as natural and same-zone. In practice this let two examples for the same word use two different surface expressions, so the word actually being taught was not consistently recoverable from its own examples, and the 6 downstream translation prompts had no reliable anchor to check their own output against — a language could translate a meaning_zone[1] usage instead of core and nothing would catch it. v3.0 restricts every example to core only (Section 3.4, STEP 2, TS-04) and gives meaning_zone[1:] a single, explicit role: a glossary/reference list, never a source of example wording, in this manual or in any of the 7 translation prompts. Where core genuinely cannot be used naturally for a candidate situation, this manual's own freedom to pick a different situation (Section 3.4, STEP 2) is the primary fix — the FLAG escape valve is the fallback only when no situation swap resolves it. Section 3.4 also adds guidance on situations whose natural expression tends to diverge across languages (body-part idioms, directional motion verbs, existential/possessive copulas), since this manual's situation choice is the one thing all 6 helper languages must later express using their own core — an unwise situation choice here surfaces as FLAG failures downstream in every translation prompt, not just one.

All original ConceptID design principles, the Polysemy Rule, and the Cultural Neutrality Rule are preserved unchanged from v1.0. The 720-item locked Korean registry (independently designed, native-Korean-first — not machine-translated from the English registry), 12-domain structure, and per-level 24-batch structure are unchanged.

# 2. Input Values

LEVEL: {A1 / A2 / B1 / B2 / C1 / C2}

BATCH_ID: {001~024}, 3-digit format required. BATCH_ID resets per LEVEL — each LEVEL has its own independently locked 120-item registry and its own 24-batch structure.

TARGET_LANGUAGE: Korean (fixed)

LANG_GROUP: AGGLUTINATIVE_SOV (Korean — Type A: subject can be omitted, SOV word order, agglutinative language; see Section 3.5). This is the reverse of the EN-target manual's ANALYTIC_SVO classification; English now occupies a helper-language slot instead of the target slot, and remains Type B (subject required, SVO, analytic) in that role — see Section 3.5 and Rule KR-01 in Section 4/STEP 2.

# 3. Confirmed Master Word Registry (Locked)

Design principle: this registry was independently designed for Korean as the target language, following the same ConceptID-first design discipline as the EN-target manual's registry (concept-first, not English-verb-first; polysemy isolation; cultural-neutrality review; 12-domain balance check; final lock). It was authored natively for Korean — not machine-translated from the English registry — and is carried forward here as an immutable, already-locked source of truth for IDX / ConceptID / LEVEL / target_word. Re-running that generation/verification loop is out of scope for this manual.

Registry composition: 720 core concepts, native-Korean-first design, ConceptID-anchored (language-independent core key — see 3.1). Level distribution: A1 120 / A2 120 / B1 120 / B2 120 / C1 120 / C2 120 — Total: 720. A1~C1 are each organized into the same general-purpose 12-domain structure used by the EN-target manual (MOVE / SENSE / COMMUNICATE / EXIST / ACTION / EMOTION / COGNITION / TIME / SPACE / QUANTITY / RELATION / STATE), 10 ConceptIDs per domain per level. C2 uses its own, independently designed 12-domain academic structure (see 3.6) reflecting advanced/academic Korean vocabulary, rather than reusing the general-purpose 12 domains — a deliberate native design choice for the Korean C2 tier. Batch structure: within each LEVEL, 24 batches of 5 consecutive same-level items (batch_001~batch_024).

Batch calculation method (applied within the selected LEVEL's own 120-item list): start_index = (BATCH_ID numeric value − 1) × 5 + 1; end_index = start_index + 4. Example: BATCH 001 → items 001~005 · BATCH 024 → items 116~120. If a requested BATCH_ID would require crossing into a different LEVEL's registry, this is a fatal input error — LEVEL and BATCH_ID must always be supplied together and consistently.

## 3.1 ConceptID Principle (Design Principle — DO NOT MODIFY)

ConceptID identifies a Concept, not a Korean word. A1_MOVE_GO is "voluntary movement" — not the word "가다." Languages sharing the same ConceptID must occupy the same conceptual space, even if they use different words. ConceptID is designed concept-first; it must never be designed to match Korean verb boundaries. The Korean word is merely the Korean expression of that concept.

## 3.2 Polysemy Rule

If a single Korean word covers 2+ clearly distinct conceptual zones that would map to different words in other languages, it must not be assigned a single ConceptID at generation time; at the WORD_SPEC stage (STEP 1) any residual polysemy in a locked target_word must be resolved by fixing one meaning and excluding the rest. Judgment criteria, e.g.: 보다 → see (perceive visually) / look (direct attention); 쓰다 → write / use (bitter taste, spend); 부르다 → call (name/summon) / sing (call out a song). Handling: POLYSEMY_FLAG: YES, USED_MEANING: {fixed single Korean meaning}, EXCLUDED_MEANINGS: {remaining meanings}. Failing to isolate polysemy here causes meaning-zone drift downstream, in this manual's own example generation and in every one of the 7 translation prompts.

## 3.3 Cultural Neutrality Rule

Example situations must prefer culturally neutral situations. Allowed (culturally neutral): stairs, door, street, friend, morning, home, room, classroom, park, market. Caution — 🚩 CULTURAL flag auto-triggers: subway, specific transit systems, specific institutions, traffic signals (not universal). When examples are read by learners of any of the 7 helper languages, culture-specific situations cannot be used without native review of the relevant helper language.

## 3.4 Core & Meaning Zone Rule (Target Language) — replaces v1.0 Pivot Lock Rule, Anti-Translationese Composite Principle, and Semantic Family Rule

Every target_word gets exactly one CORE + MEANING_ZONE declaration, for the target language only (this manual never declares MEANING_ZONE for the 6 helper languages — that is each translation prompt's own responsibility, applied independently in its own language, per Manual B, Section 10).

**Structure:**

- CORE: the reconstruction anchor. For target = Korean, CORE is always the target_word itself, verbatim, exactly as locked in Section 3.7.
- MEANING_ZONE: an ordered list of 1 to 3 natural surface expressions that all occupy the exact same semantic zone as CORE (the single meaning fixed by the Polysemy Rule, Section 3.2, if polysemous). MEANING_ZONE[0] is always identical to CORE. MEANING_ZONE[1:] exists for glossary/reference purposes only — it documents related expressions a learner might also encounter. It is never used in any example sentence, in this manual or in any of the 7 translation prompts; see the Examples Generation Rule below and Rule KR-06.

**Meaning Zone Rules (hard rules, apply to every language including target/kr):**

1. meaning_zone contains a maximum of 3 expressions.
2. At least 1 expression is required.
3. meaning_zone[0] must always be identical to core.
4. If no additional natural semantic variant exists, do not invent one artificially — naturalness has priority over quantity.
5. Empty slots beyond the first are allowed; the array length may be 1, 2, or 3.
6. All expressions must belong to the same semantic zone (no expressions from a different sense of a polysemous word).
7. Duplicate expressions are prohibited.
8. Expressions that broaden or narrow the original meaning are prohibited (no semantic expansion, no semantic narrowing).
9. Expressions that shift part of speech are prohibited (e.g. do not add a noun-form variant to a verb's meaning_zone).
10. meaning_zone[1:] entries are reference-only and must never appear in an example sentence.

**Example (valid, 1 entry):**
```
"core": "오르다",
"meaning_zone": ["오르다"]
```

**Example (valid, 2 entries):**
```
"core": "돌아오다",
"meaning_zone": ["돌아오다", "돌아가다"]
```

**Example (invalid — third entry forced, different zone):**
```
"core": "돌아오다",
"meaning_zone": ["돌아오다", "돌아가다", "복귀하다"]   // "복귀하다" shifts register/zone — forbidden unless independently verified same-zone
```

**Because target = Korean in this manual:** word.kr.core = word.target.core and word.kr.meaning_zone = word.target.meaning_zone, exactly, in every block (mirror — not an independent declaration). This is the reverse of the EN-target manual, where word.en was the mirror; here word.kr is the mirror and word.en is one of the 6 true helper-language translations produced independently by the universal EN translation prompt (Manual B, Section 10).

**Examples Generation Rule:** target-language (and kr-mirror) example sentences use ONLY core — never a meaning_zone[1:] entry, in this manual or in any of the 7 translation prompts. This single constraint is what replaces both the old FAMILY/EXCLUDE mechanism and the old "CORE Preservation Priority" naturalness rule from v1.0. It is also what removes the ambiguity the v2.0 design left open: a same-zone expression being independently natural is no longer sufficient grounds to use it in an example — only core may appear there. If core cannot be made to read naturally for a candidate situation, the first response is to choose a different situation for that example (this manual is generating the situation itself and is free to change it, unlike the downstream translation prompts, which must work from whatever situation this manual hands them). Only if no situation swap resolves the conflict should the example field instead be output as the literal string "FLAG: <short reason>" — see Section 5.

**Situation-selection risk guidance:** because this manual's chosen situation is what all 6 helper languages must later express using their own core (Manual B, Section 10), favor situations whose natural expression is likely to transfer across languages, and be more careful when a candidate situation falls into a category prone to language-specific divergence — for example: body-part or physical-state idioms (e.g. "close one's eyes" often uses a different verb from "close a door" across languages), directional or manner-specific motion verbs applied to an atypical object, and existential/possessive copula uses that some languages express without a copula at all. This manual cannot verify all 6 helper languages directly, but a more cross-linguistically transferable situation measurably reduces FLAG failures downstream, in every translation prompt at once rather than one at a time.

**Confirmed CORE/MEANING_ZONE values cannot be changed after STEP 1** of this manual; changing them later would require full example regeneration.

## 3.5 Language Type Classification (LANG_GROUP) — Reference for Manual B, Section 10 Expansion

Classify before extending this system to a new target language. Applying identical rules without classification causes automatic quality degradation for Type C, D languages.

Type A — Subject can be omitted: Korean, Japanese, Spanish, Italian. Type B — Subject required: English, French, German. Type C — Person info included in verb: Arabic, Turkish. Type D — Gender/number agreement required: Arabic, French, Spanish, Portuguese.

Korean (target language of this manual): Type A — subject can be omitted, SOV word order, agglutinative language. English and French (two of this manual's helper languages) are themselves Type B, which is why their Regional Standards (declared in the universal EN and FR translation prompts, per Manual B Section 10) explicitly require an explicit subject in every example even though the Korean target/kr columns may naturally omit the subject where context makes the referent clear. Japanese, like Korean, is Type A, and its Regional Standards likewise treat subject-drop as natural/preferred.

## 3.6 12-Domain Structure

A1~C1 share the same general-purpose 12-domain structure as the EN-target manual:

| # | DOMAIN | Example ConceptIDs |
|---|---|---|
| 01 | MOVE | A1_MOVE_GO, A1_MOVE_UP |
| 02 | SENSE | A1_SENSE_SEE, A1_SENSE_HEAR |
| 03 | COMMUNICATE | A1_COMM_SAY, A1_COMM_ASK |
| 04 | EXIST | A1_EXIST_BE, A1_EXIST_HAVE |
| 05 | ACTION | A1_ACT_DO, A1_ACT_MAKE |
| 06 | EMOTION | A1_EMOT_LIKE, A1_EMOT_WANT |
| 07 | COGNITION | A1_COG_KNOW, A1_COG_THINK |
| 08 | TIME | A1_TIME_NOW, A1_TIME_BEFORE |
| 09 | SPACE | A1_SPACE_HERE, A1_SPACE_IN |
| 10 | QUANTITY | A1_QUANT_MANY, A1_QUANT_ALL |
| 11 | RELATION | A1_REL_WITH, A1_REL_FOR |
| 12 | STATE | A1_STATE_BIG, A1_STATE_GOOD |

C2 uses its own, independently designed 12-domain academic structure (native Korean C2 registry design), replacing the general-purpose 12 domains for this level only:

| # | DOMAIN | Example ConceptIDs |
|---|---|---|
| 01 | PHILOSOPHY | C2_PHIL_EXISTENTIALISM, C2_PHIL_ONTOLOGY |
| 02 | SOCIOLOGY | C2_SOC_* (sociology concepts) |
| 03 | POLITICS | C2_POL_* (politics concepts) |
| 04 | ECONOMICS | C2_ECON_* (economics concepts) |
| 05 | MEDIA_STUDIES | C2_MEDIA_* (media studies concepts) |
| 06 | PSYCHOLOGY | C2_PSY_* (psychology concepts) |
| 07 | ENGINEERING | C2_ENG_* (engineering concepts) |
| 08 | PHYSICS | C2_PHYS_* (physics concepts) |
| 09 | CHEMISTRY | C2_CHEM_* (chemistry concepts) |
| 10 | COMPUTER_SCIENCE | C2_CS_* (computer science concepts) |
| 11 | EARTH_SCIENCE | C2_GEO_* (earth science concepts) |
| 12 | LIFE_SCIENCE | C2_BIO_ORGANIC, C2_BIO_EVOLUTIONARY |

Each A1~C1 domain contributes exactly 10 ConceptIDs per level (10 × 12 = 120 per level); C2 likewise contributes 10 ConceptIDs per academic domain (10 × 12 = 120). 120 × 6 levels = 720 total.

## 3.7 Locked Registry - IDX | ConceptID | target_word (per level)

Format: IDX.ConceptID:target_word, separated by " / ", 120 entries per level, grouped in fixed domain order (A1~C1: MOVE → SENSE → COMM → EXIST → ACT → EMOT → COG → TIME → SPACE → QUANT → REL → STATE; C2: PHILOSOPHY → SOCIOLOGY → POLITICS → ECONOMICS → MEDIA_STUDIES → PSYCHOLOGY → ENGINEERING → PHYSICS → CHEMISTRY → COMPUTER_SCIENCE → EARTH_SCIENCE → LIFE_SCIENCE), 10 consecutive entries per domain. This list is immutable; target_word at STEP 1 must originate verbatim from this list.

**=== A1 (001~120) ===**

001.A1_MOVE_GO:가다 / 002.A1_MOVE_COME:오다 / 003.A1_MOVE_ENTER:들어가다 / 004.A1_MOVE_EXIT:나가다 / 005.A1_MOVE_UP:오르다 / 006.A1_MOVE_DOWN:내려가다 / 007.A1_MOVE_RUN:달리다 / 008.A1_MOVE_WALK:걷다 / 009.A1_MOVE_STOP:멈추다 / 010.A1_MOVE_RETURN:돌아오다 / 011.A1_SENSE_SEE:보다 / 012.A1_SENSE_HEAR:듣다 / 013.A1_SENSE_SMELL:냄새나다 / 014.A1_SENSE_TASTE:맛보다 / 015.A1_SENSE_TOUCH:만지다 / 016.A1_SENSE_FEEL:느끼다 / 017.A1_SENSE_LOOK:쳐다보다 / 018.A1_SENSE_LISTEN:귀기울이다 / 019.A1_SENSE_NOTICE:알아차리다 / 020.A1_SENSE_SHOW:보여주다 / 021.A1_COMM_SAY:말하다 / 022.A1_COMM_ASK:묻다 / 023.A1_COMM_ANSWER:대답하다 / 024.A1_COMM_CALL:부르다 / 025.A1_COMM_TELL:알리다 / 026.A1_COMM_TALK:이야기하다 / 027.A1_COMM_READ:읽다 / 028.A1_COMM_WRITE:쓰다 / 029.A1_COMM_REPEAT:반복하다 / 030.A1_COMM_EXPLAIN:설명하다 / 031.A1_EXIST_BE:있다 / 032.A1_EXIST_HAVE:가지다 / 033.A1_EXIST_LIVE:살다 / 034.A1_EXIST_STAY:머무르다 / 035.A1_EXIST_START:시작하다 / 036.A1_EXIST_END:끝나다 / 037.A1_EXIST_WAIT:기다리다 / 038.A1_EXIST_REMAIN:남다 / 039.A1_EXIST_MEET:만나다 / 040.A1_EXIST_JOIN:참여하다 / 041.A1_ACT_DO:하다 / 042.A1_ACT_MAKE:만들다 / 043.A1_ACT_USE:사용하다 / 044.A1_ACT_OPEN:열다 / 045.A1_ACT_CLOSE:닫다 / 046.A1_ACT_TAKE:가져가다 / 047.A1_ACT_GIVE:주다 / 048.A1_ACT_PUT:놓다 / 049.A1_ACT_FIND:찾다 / 050.A1_ACT_CHANGE:바꾸다 / 051.A1_EMOT_LIKE:좋아하다 / 052.A1_EMOT_LOVE:사랑하다 / 053.A1_EMOT_HATE:싫어하다 / 054.A1_EMOT_WANT:원하다 / 055.A1_EMOT_NEED:필요하다 / 056.A1_EMOT_WORRY:걱정하다 / 057.A1_EMOT_SMILE:웃다 / 058.A1_EMOT_CRY:울다 / 059.A1_EMOT_ENJOY:즐기다 / 060.A1_EMOT_RELAX:쉬다 / 061.A1_COG_KNOW:알다 / 062.A1_COG_THINK:생각하다 / 063.A1_COG_LEARN:배우다 / 064.A1_COG_REMEMBER:기억하다 / 065.A1_COG_FORGET:잊다 / 066.A1_COG_UNDERSTAND:이해하다 / 067.A1_COG_DECIDE:결정하다 / 068.A1_COG_TRY:시도하다 / 069.A1_COG_CHECK:확인하다 / 070.A1_COG_PLAN:계획하다 / 071.A1_TIME_NOW:지금 / 072.A1_TIME_BEFORE:전에 / 073.A1_TIME_AFTER:후에 / 074.A1_TIME_TODAY:오늘 / 075.A1_TIME_TOMORROW:내일 / 076.A1_TIME_YESTERDAY:어제 / 077.A1_TIME_MORNING:아침 / 078.A1_TIME_NIGHT:밤 / 079.A1_TIME_EARLY:일찍 / 080.A1_TIME_LATE:늦게 / 081.A1_SPACE_HERE:여기 / 082.A1_SPACE_THERE:거기 / 083.A1_SPACE_INSIDE:안 / 084.A1_SPACE_OUTSIDE:밖 / 085.A1_SPACE_FRONT:앞 / 086.A1_SPACE_BACK:뒤 / 087.A1_SPACE_TOP:위 / 088.A1_SPACE_BOTTOM:아래 / 089.A1_SPACE_NEAR:가까이 / 090.A1_SPACE_FAR:멀리 / 091.A1_QUANT_ONE:하나 / 092.A1_QUANT_TWO:둘 / 093.A1_QUANT_MANY:많다 / 094.A1_QUANT_FEW:적다 / 095.A1_QUANT_ALL:모두 / 096.A1_QUANT_MORE:더 / 097.A1_QUANT_LESS:덜 / 098.A1_QUANT_FULL:가득 / 099.A1_QUANT_EMPTY:비어있다 / 100.A1_QUANT_ENOUGH:충분하다 / 101.A1_REL_WITH:함께 / 102.A1_REL_FOR:위해 / 103.A1_REL_FROM:부터 / 104.A1_REL_TO:까지 / 105.A1_REL_BETWEEN:사이 / 106.A1_REL_SAME:같다 / 107.A1_REL_DIFFERENT:다르다 / 108.A1_REL_ONLY:만 / 109.A1_REL_EACH:각각 / 110.A1_REL_TOGETHER:같이 / 111.A1_STATE_BIG:크다 / 112.A1_STATE_SMALL:작다 / 113.A1_STATE_GOOD:좋다 / 114.A1_STATE_BAD:나쁘다 / 115.A1_STATE_FAST:빠르다 / 116.A1_STATE_SLOW:느리다 / 117.A1_STATE_HOT:덥다 / 118.A1_STATE_COLD:춥다 / 119.A1_STATE_NEW:새롭다 / 120.A1_STATE_OLD:오래되다

**=== A2 (001~120) ===**

001.A2_MOVE_TRAVEL:여행하다 / 002.A2_MOVE_TRANSFER:갈아타다 / 003.A2_MOVE_APPROACH:다가가다 / 004.A2_MOVE_PASS:지나가다 / 005.A2_MOVE_CROSS:건너다 / 006.A2_MOVE_FOLLOW:따라가다 / 007.A2_MOVE_ESCAPE:도망가다 / 008.A2_MOVE_CARRY:옮기다 / 009.A2_MOVE_VISIT:방문하다 / 010.A2_MOVE_GATHER:모이다 / 011.A2_SENSE_OBSERVE:관찰하다 / 012.A2_SENSE_COMPARE:비교하다 / 013.A2_SENSE_SEARCH:살펴보다 / 014.A2_SENSE_RECOGNIZE:인식하다 / 015.A2_SENSE_IDENTIFY:구별하다 / 016.A2_SENSE_DISCOVER:발견하다 / 017.A2_SENSE_CONCENTRATE:집중하다 / 018.A2_SENSE_IGNORE:무시하다 / 019.A2_SENSE_CHECKOUT:확인해보다 / 020.A2_SENSE_MEASURE:재다 / 021.A2_COMM_INTRODUCE:소개하다 / 022.A2_COMM_INVITE:초대하다 / 023.A2_COMM_PROMISE:약속하다 / 024.A2_COMM_WARN:경고하다 / 025.A2_COMM_SUGGEST:제안하다 / 026.A2_COMM_AGREE:동의하다 / 027.A2_COMM_REFUSE:거절하다 / 028.A2_COMM_COMPLAIN:불평하다 / 029.A2_COMM_REPORT:보고하다 / 030.A2_COMM_DISCUSS:토론하다 / 031.A2_EXIST_CONTINUE:계속하다 / 032.A2_EXIST_PAUSE:멈춰있다 / 033.A2_EXIST_OCCUR:발생하다 / 034.A2_EXIST_DISAPPEAR:사라지다 / 035.A2_EXIST_GROW:자라다 / 036.A2_EXIST_IMPROVE:향상되다 / 037.A2_EXIST_REDUCE:줄어들다 / 038.A2_EXIST_INCREASE:늘어나다 / 039.A2_EXIST_APPEAR:나타나다 / 040.A2_EXIST_CONVERT:전환되다 / 041.A2_ACT_FIX:고치다 / 042.A2_ACT_PREPARE:준비하다 / 043.A2_ACT_CLEAN:청소하다 / 044.A2_ACT_ORGANIZE:정리하다 / 045.A2_ACT_BUILD:세우다 / 046.A2_ACT_OPERATE:조작하다 / 047.A2_ACT_DELIVER:전달하다 / 048.A2_ACT_PACK:포장하다 / 049.A2_ACT_SELECT:선택하다 / 050.A2_ACT_SHARE:공유하다 / 051.A2_EMOT_RESPECT:존중하다 / 052.A2_EMOT_TRUST:믿다 / 053.A2_EMOT_DOUBT:의심하다 / 054.A2_EMOT_REGRET:후회하다 / 055.A2_EMOT_ADMIRE:감탄하다 / 056.A2_EMOT_EXPECT:기대하다 / 057.A2_EMOT_RELIEVE:안심하다 / 058.A2_EMOT_BE_SURPRISED:놀라다 / 059.A2_EMOT_BE_PROUD:자랑스럽다 / 060.A2_EMOT_BE_EMBARRASSED:부끄럽다 / 061.A2_COG_ANALYZE:분석하다 / 062.A2_COG_SOLVE:해결하다 / 063.A2_COG_GUESS:추측하다 / 064.A2_COG_ACCEPT:받아들이다 / 065.A2_COG_REJECT:거부하다 / 066.A2_COG_REALIZE:깨닫다 / 067.A2_COG_REVIEW:복습하다 / 068.A2_COG_MEMORIZE:암기하다 / 069.A2_COG_PRACTICE:연습하다 / 070.A2_COG_EXPERIMENT:실험하다 / 071.A2_TIME_RECENTLY:최근에 / 072.A2_TIME_SOON:곧 / 073.A2_TIME_IMMEDIATELY:바로 / 074.A2_TIME_SUDDENLY:갑자기 / 075.A2_TIME_FINALLY:드디어 / 076.A2_TIME_USUALLY:보통 / 077.A2_TIME_OFTEN:자주 / 078.A2_TIME_SOMETIMES:가끔 / 079.A2_TIME_FOREVER:영원히 / 080.A2_TIME_BRIEFLY:잠깐 / 081.A2_SPACE_CENTER:중앙 / 082.A2_SPACE_CORNER:구석 / 083.A2_SPACE_DIRECTION:방향 / 084.A2_SPACE_DISTANCE:거리 / 085.A2_SPACE_ENTRANCE:입구 / 086.A2_SPACE_EXITPLACE:출구 / 087.A2_SPACE_SURFACE:표면 / 088.A2_SPACE_AREA:지역 / 089.A2_SPACE_ROUTE:길 / 090.A2_SPACE_POSITION:위치 / 091.A2_QUANT_DOUBLE:두배 / 092.A2_QUANT_HALF:절반 / 093.A2_QUANT_EXTRA:추가 / 094.A2_QUANT_AVERAGE:평균 / 095.A2_QUANT_TOTAL:총합 / 096.A2_QUANT_MAXIMUM:최대 / 097.A2_QUANT_MINIMUM:최소 / 098.A2_QUANT_LIMIT:한계 / 099.A2_QUANT_PORTION:부분 / 100.A2_QUANT_BALANCE:균형 / 101.A2_REL_SUPPORT:지원하다 / 102.A2_REL_DEPEND:의존하다 / 103.A2_REL_CONNECT:연결하다 / 104.A2_REL_SEPARATE:분리하다 / 105.A2_REL_INCLUDE:포함하다 / 106.A2_REL_EXCLUDE:제외하다 / 107.A2_REL_MATCH:어울리다 / 108.A2_REL_COMPETE:경쟁하다 / 109.A2_REL_COOPERATE:협력하다 / 110.A2_REL_CONTACT:연락하다 / 111.A2_STATE_SAFE:안전하다 / 112.A2_STATE_DANGEROUS:위험하다 / 113.A2_STATE_HEAVY:무겁다 / 114.A2_STATE_LIGHT:가볍다 / 115.A2_STATE_STRONG:강하다 / 116.A2_STATE_WEAK:약하다 / 117.A2_STATE_BUSY:바쁘다 / 118.A2_STATE_FREE:한가하다 / 119.A2_STATE_DIFFICULT:어렵다 / 120.A2_STATE_SIMPLE:간단하다

**=== B1 (001~120) ===**

001.B1_MOVE_ADVANCE:전진하다 / 002.B1_MOVE_RETREAT:후퇴하다 / 003.B1_MOVE_WANDER:배회하다 / 004.B1_MOVE_NAVIGATE:이동하다 / 005.B1_MOVE_TRANSPORT:수송하다 / 006.B1_MOVE_MIGRATE:이주하다 / 007.B1_MOVE_ACCESS:접근하다 / 008.B1_MOVE_WITHDRAW:철수하다 / 009.B1_MOVE_ACCOMPANY:동행하다 / 010.B1_MOVE_SETTLE:정착하다 / 011.B1_SENSE_EXAMINE:검토하다 / 012.B1_SENSE_INSPECT:점검하다 / 013.B1_SENSE_MONITOR:감시하다 / 014.B1_SENSE_DETECT:감지하다 / 015.B1_SENSE_EVALUATE:평가하다 / 016.B1_SENSE_CONFIRM:확증하다 / 017.B1_SENSE_OVERLOOK:간과하다 / 018.B1_SENSE_INTERPRET:해석하다 / 019.B1_SENSE_ANALYZEVIEW:분별하다 / 020.B1_SENSE_VERIFY:검증하다 / 021.B1_COMM_PERSUADE:설득하다 / 022.B1_COMM_ANNOUNCE:발표하다 / 023.B1_COMM_DECLARE:선언하다 / 024.B1_COMM_NEGOTIATE:협상하다 / 025.B1_COMM_CRITICIZE:비판하다 / 026.B1_COMM_PRAISE:칭찬하다 / 027.B1_COMM_RECOMMEND:추천하다 / 028.B1_COMM_ARGUE:주장하다 / 029.B1_COMM_APOLOGIZE:사과하다 / 030.B1_COMM_CONVINCE:납득시키다 / 031.B1_EXIST_SURVIVE:생존하다 / 032.B1_EXIST_EXPAND:확장되다 / 033.B1_EXIST_SHRINK:축소되다 / 034.B1_EXIST_STABILIZE:안정되다 / 035.B1_EXIST_TRANSFORM:변형되다 / 036.B1_EXIST_RECOVER:회복되다 / 037.B1_EXIST_COLLAPSE:붕괴되다 / 038.B1_EXIST_EVOLVE:진화하다 / 039.B1_EXIST_MAINTAIN:유지되다 / 040.B1_EXIST_FADE:사라져가다 / 041.B1_ACT_MANUFACTURE:제조하다 / 042.B1_ACT_INSTALL:설치하다 / 043.B1_ACT_REPAIR:수리하다 / 044.B1_ACT_PROCESS:처리하다 / 045.B1_ACT_MODIFY:수정하다 / 046.B1_ACT_MANAGE:관리하다 / 047.B1_ACT_DISTRIBUTE:배포하다 / 048.B1_ACT_COLLECT:수집하다 / 049.B1_ACT_CONSTRUCT:구성하다 / 050.B1_ACT_IMPLEMENT:실행하다 / 051.B1_EMOT_APPRECIATE:감사하다 / 052.B1_EMOT_ENVY:부러워하다 / 053.B1_EMOT_FRUSTRATE:좌절하다 / 054.B1_EMOT_SATISFY:만족하다 / 055.B1_EMOT_DEPRESS:우울하다 / 056.B1_EMOT_MOTIVATE:동기부여하다 / 057.B1_EMOT_ADAPT:적응하다 / 058.B1_EMOT_HESITATE:망설이다 / 059.B1_EMOT_CONFIDE:신뢰하다 / 060.B1_EMOT_STRESS:스트레스받다 / 061.B1_COG_REASON:추론하다 / 062.B1_COG_JUDGE:판단하다 / 063.B1_COG_CONCLUDE:결론내리다 / 064.B1_COG_PREDICT:예측하다 / 065.B1_COG_ASSUME:가정하다 / 066.B1_COG_ESTIMATE:추정하다 / 067.B1_COG_CLASSIFY:분류하다 / 068.B1_COG_AMALGAMATE:종합하다 / 069.B1_COG_RESEARCH:연구하다 / 070.B1_COG_REFLECT:성찰하다 / 071.B1_TIME_MEANWHILE:한편 / 072.B1_TIME_PREVIOUSLY:이전에 / 073.B1_TIME_SUBSEQUENTLY:이후에 / 074.B1_TIME_OCCASIONALLY:이따금 / 075.B1_TIME_CONSTANTLY:끊임없이 / 076.B1_TIME_GRADUALLY:점차 / 077.B1_TIME_PROVISIONALLY:일시적으로 / 078.B1_TIME_CONSEQUENTLY:마침내 / 079.B1_TIME_IMMEDSEQ:즉시 / 080.B1_TIME_PERMANENTLY:영구적으로 / 081.B1_SPACE_BOUNDARY:경계 / 082.B1_SPACE_REGION:영역 / 083.B1_SPACE_STRUCTURE:구조 / 084.B1_SPACE_LAYER:층 / 085.B1_SPACE_SURROUNDING:주변 / 086.B1_SPACE_CORE:중심 / 087.B1_SPACE_PATHWAY:통로 / 088.B1_SPACE_GAP:간격 / 089.B1_SPACE_DIMENSION:차원 / 090.B1_SPACE_LOCATIONAL:위치상 / 091.B1_QUANT_PROPORTION:비율 / 092.B1_QUANT_CAPACITY:용량 / 093.B1_QUANT_FREQUENCY:빈도 / 094.B1_QUANT_VOLUME:분량 / 095.B1_QUANT_STANDARD:기준 / 096.B1_QUANT_RANGE:범위 / 097.B1_QUANT_LIMITATION:제한 / 098.B1_QUANT_DENSITY:밀도 / 099.B1_QUANT_QUOTA:일부분 / 100.B1_QUANT_STEADINESS:균형감 / 101.B1_REL_ASSIST:지원해주다 / 102.B1_REL_LEAN_ON:의지하다 / 103.B1_REL_ASSOCIATE:연관짓다 / 104.B1_REL_DEMARCATE:구분하다 / 105.B1_REL_CONTAIN:포함되다 / 106.B1_REL_EXCHANGE:교환하다 / 107.B1_REL_INTERACT:상호작용하다 / 108.B1_REL_COMPROMISE:타협하다 / 109.B1_REL_COLLABORATE:협업하다 / 110.B1_REL_CONFLICT:충돌하다 / 111.B1_STATE_STABLE:안정적인 / 112.B1_STATE_UNSTABLE:불안정한 / 113.B1_STATE_INTENSE:강렬한 / 114.B1_STATE_GENTLE:부드러운 / 115.B1_STATE_COMPLEX:복잡한 / 116.B1_STATE_PLAIN:단순한 / 117.B1_STATE_EFFICIENT:효율적인 / 118.B1_STATE_INEFFICIENT:비효율적인 / 119.B1_STATE_FLEXIBLE:유연한 / 120.B1_STATE_STRICT:엄격한

**=== B2 (001~120) ===**

001.B2_MOVE_RELOCATETO:이전하다 / 002.B2_MOVE_DEPLOY:배치하다 / 003.B2_MOVE_EVACUATE:대피하다 / 004.B2_MOVE_PURSUE:추적하다 / 005.B2_MOVE_CIRCULATE:순환하다 / 006.B2_MOVE_ACCELERATE:가속하다 / 007.B2_MOVE_HALT:중단하다 / 008.B2_MOVE_SHIFT:전환하다 / 009.B2_MOVE_BYPASS:우회하다 / 010.B2_MOVE_DISPERSE:분산되다 / 011.B2_SENSE_PERCEIVE:지각하다 / 012.B2_SENSE_DIAGNOSE:진단하다 / 013.B2_SENSE_SPECULATE:추측해내다 / 014.B2_SENSE_DISTINGUISH:식별하다 / 015.B2_SENSE_OBSERVATIONAL:주시하다 / 016.B2_SENSE_COMPREHEND:파악하다 / 017.B2_SENSE_VALIDATE:타당화하다 / 018.B2_SENSE_REASSESS:재평가하다 / 019.B2_SENSE_TRACE:추적해내다 / 020.B2_SENSE_FORMULATEVIEW:조망하다 / 021.B2_COMM_DEBATE:논쟁하다 / 022.B2_COMM_ASSERT:단언하다 / 023.B2_COMM_CONSULT:상담하다 / 024.B2_COMM_MEDIATE:중재하다 / 025.B2_COMM_CLARIFY:명확히하다 / 026.B2_COMM_DISCLOSE:공개하다 / 027.B2_COMM_EMPHASIZE:강조하다 / 028.B2_COMM_SUMMARIZE:요약하다 / 029.B2_COMM_PUBLISH:출판하다 / 030.B2_COMM_SYNCHRONIZE:조율하다 / 031.B2_EXIST_PERSIST:지속되다 / 032.B2_EXIST_DOMINATE:지배하다 / 033.B2_EXIST_EMERGE:부상하다 / 034.B2_EXIST_DISSOLVE:해체되다 / 035.B2_EXIST_ACCUMULATE:축적되다 / 036.B2_EXIST_DECLINE:쇠퇴하다 / 037.B2_EXIST_COEXIST:공존하다 / 038.B2_EXIST_INTENSIFY:심화되다 / 039.B2_EXIST_RECURRENCE:반복되다 / 040.B2_EXIST_CONSTITUTE:구성되다 / 041.B2_ACT_EXECUTE:집행하다 / 042.B2_ACT_CALIBRATE:조정하다 / 043.B2_ACT_ADMINISTER:관리운영하다 / 044.B2_ACT_REINFORCE:강화하다 / 045.B2_ACT_STREAMLINE:간소화하다 / 046.B2_ACT_ALLOCATE:할당하다 / 047.B2_ACT_INTEGRATE:통합하다 / 048.B2_ACT_SUPERVISE:감독하다 / 049.B2_ACT_REORGANIZE:재구성하다 / 050.B2_ACT_OPTIMIZE:최적화하다 / 051.B2_EMOT_EMPATHIZE:공감하다 / 052.B2_EMOT_REASSURE:안도시키다 / 053.B2_EMOT_RESIGN:체념하다 / 054.B2_EMOT_ASPIRE:열망하다 / 055.B2_EMOT_RESENT:분개하다 / 056.B2_EMOT_TOLERATE:감내하다 / 057.B2_EMOT_REGAINCONF:자신감을회복하다 / 058.B2_EMOT_BEWILDER:당황해하다 / 059.B2_EMOT_DEDICATE:헌신하다 / 060.B2_EMOT_SUPPRESS:억누르다 / 061.B2_COG_DEDUCE:도출하다 / 062.B2_COG_CRITIQUE:비평하다 / 063.B2_COG_GENERALIZE:일반화하다 / 064.B2_COG_HYPOTHESIZE:가설을세우다 / 065.B2_COG_JUSTIFY:합리화하다 / 066.B2_COG_DEVELOP:정교화하다 / 067.B2_COG_CONTEXTUALIZE:맥락화하다 / 068.B2_COG_PRIORITIZE:우선순위화하다 / 069.B2_COG_CORRELATE:상관시키다 / 070.B2_COG_CONCEPTUALIZE:개념화하다 / 071.B2_TIME_SIMULTANEOUSLY:동시에 / 072.B2_TIME_CONSECUTIVELY:연속적으로 / 073.B2_TIME_INTERMITTENTLY:간헐적으로 / 074.B2_TIME_RETROSPECTIVELY:회고적으로 / 075.B2_TIME_PROSPECTIVELY:전망적으로 / 076.B2_TIME_CHRONICALLY:만성적으로 / 077.B2_TIME_PERIODICALLY:주기적으로 / 078.B2_TIME_INSTANTANEOUSLY:순식간에 / 079.B2_TIME_EVENTFULLY:결정적으로 / 080.B2_TIME_TRANSITIONALLY:과도기적으로 / 081.B2_SPACE_FRAMEWORK:체계 / 082.B2_SPACE_HIERARCHY:계층 / 083.B2_SPACE_INFRASTRUCTURE:기반시설 / 084.B2_SPACE_PLATFORM:플랫폼 / 085.B2_SPACE_CLUSTER:집합체 / 086.B2_SPACE_INTERFACE:접점 / 087.B2_SPACE_ALIGNMENT:정렬 / 088.B2_SPACE_OVERLAP:중첩 / 089.B2_SPACE_AXIS:축 / 090.B2_SPACE_CONFIGURATION:배치구성 / 091.B2_QUANT_MAGNITUDE:규모 / 092.B2_QUANT_COEFFICIENT:계수 / 093.B2_QUANT_THRESHOLD:임계치 / 094.B2_QUANT_FLUCTUATION:변동폭 / 095.B2_QUANT_INDEX:지수 / 096.B2_QUANT_RATIOADV:상대비율 / 097.B2_QUANT_CAP:상한선 / 098.B2_QUANT_DEFICIT:부족분 / 099.B2_QUANT_SURPLUS:잉여분 / 100.B2_QUANT_EQUILIBRIUM:균형상태 / 101.B2_RELATE_DEPICT:묘사하다 / 102.B2_RELATE_LINK:연계하다 / 103.B2_RELATE_RECONCILE:조화시키다 / 104.B2_RELATE_ISOLATE:고립시키다 / 105.B2_RELATE_BIND:결속시키다 / 106.B2_RELATE_NEGLECT:소외시키다 / 107.B2_RELATE_FACILITATE:촉진하다 / 108.B2_RELATE_HARMONIZE:협조시키다 / 109.B2_RELATE_INFLUENCE:영향주다 / 110.B2_RELATE_SUBORDINATE:종속되다 / 111.B2_STATE_RESILIENT:회복력있는 / 112.B2_STATE_VULNERABLE:취약한 / 113.B2_STATE_DYNAMIC:역동적인 / 114.B2_STATE_STATIC:정적인 / 115.B2_STATE_CONSISTENT:일관된 / 116.B2_STATE_AMBIGUOUS:모호한 / 117.B2_STATE_TRANSPARENT:투명한 / 118.B2_STATE_RIGID:경직된 / 119.B2_STATE_SUSTAINABLE:지속가능한 / 120.B2_STATE_INNOVATIVE:혁신적인

**=== C1 (001~120) ===**

001.C1_MOVE_DISLOCATE:전위시키다 / 002.C1_MOVE_MOBILIZE:동원하다 / 003.C1_MOVE_REDEPLOY:재배치하다 / 004.C1_MOVE_CONVERGE:집결하다 / 005.C1_MOVE_DIVERGE:분기하다 / 006.C1_MOVE_PROPEL:추진하다 / 007.C1_MOVE_TRANSIT:경유하다 / 008.C1_MOVE_DISPATCH:파견하다 / 009.C1_MOVE_REPOSITION:위치를재조정하다 / 010.C1_MOVE_DISPERSEADV:흩어지다 / 011.C1_SENSE_DETERMINE:판별하다 / 012.C1_SENSE_DECIPHER:해독하다 / 013.C1_SENSE_DIFFERENTIATE:차별화하다 / 014.C1_SENSE_ARTICULATEVIEW:통찰하다 / 015.C1_SENSE_INTERROGATE:심문하다 / 016.C1_SENSE_EXTRAPOLATE:추론확장하다 / 017.C1_SENSE_SUBSTANTIATE:입증하다 / 018.C1_SENSE_SITUATE:맥락적으로보다 / 019.C1_SENSE_RECONSTRUCT:재구성해보다 / 020.C1_SENSE_PINPOINT:진단해내다 / 021.C1_COMM_ARTICULATE:명료하게표현하다 / 022.C1_COMM_DISPUTE:반박하다 / 023.C1_COMM_ADVOCATE:옹호하다 / 024.C1_COMM_CONVEY:전달해내다 / 025.C1_COMM_ELUCIDATE:해명하다 / 026.C1_COMM_DISSEMINATE:전파하다 / 027.C1_COMM_REITERATE:거듭강조하다 / 028.C1_COMM_FORMULATE:공식화하다 / 029.C1_COMM_DISTILL:종합서술하다 / 030.C1_COMM_MODERATE:사회보다 / 031.C1_EXIST_PREVAIL:우세하다 / 032.C1_EXIST_DETERIORATE:악화되다 / 033.C1_EXIST_FLOURISH:번영하다 / 034.C1_EXIST_PERPETUATE:지속시키다 / 035.C1_EXIST_STAGNATE:정체되다 / 036.C1_EXIST_REGENERATE:재생되다 / 037.C1_EXIST_PROLIFERATE:급증하다 / 038.C1_EXIST_CONSOLIDATE:통합강화되다 / 039.C1_EXIST_DISINTEGRATE:붕괴되어가다 / 040.C1_EXIST_MANIFEST:드러나다 / 041.C1_ACT_ENACT:이행하다 / 042.C1_ACT_OVERSEE:총괄조정하다 / 043.C1_ACT_DELEGATE:위임하다 / 044.C1_ACT_ENABLE:원활하게하다 / 045.C1_ACT_STREAMLINING:체계화하다 / 046.C1_ACT_RECONFIGURE:재조정하다 / 047.C1_ACT_INSTITUTIONALIZE:제도화하다 / 048.C1_ACT_ORCHESTRATE:총지휘하다 / 049.C1_ACT_LEVERAGE:활용극대화하다 / 050.C1_ACT_MANEUVER:헤쳐나가다 / 051.C1_EMOT_APPEASE:화해하다 / 052.C1_EMOT_EMPOWER:고무시키다 / 053.C1_EMOT_DISHEARTEN:낙담시키다 / 054.C1_EMOT_CHERISH:소중히여기다 / 055.C1_EMOT_DESPISE:경멸하다 / 056.C1_EMOT_RESTRAIN:절제하다 / 057.C1_EMOT_FORTIFY:안심시키다 / 058.C1_EMOT_INTIMIDATE:위축시키다 / 059.C1_EMOT_COMMEMORATE:기리다 / 060.C1_EMOT_WITHSTAND:견뎌내다 / 061.C1_COG_INFER:유추하다 / 062.C1_COG_THEORIZE:이론화하다 / 063.C1_COG_CRITICALLYASSESS:비판적으로평가하다 / 064.C1_COG_SCHEMATIZE:체계화해생각하다 / 065.C1_COG_REFRAME:재해석하다 / 066.C1_COG_SPECIFY:구체화하다 / 067.C1_COG_UNIFY:통합적으로이해하다 / 068.C1_COG_EVALUATELOGIC:논리검증하다 / 069.C1_COG_RECONSIDER:재고하다 / 070.C1_COG_ABSTRACT:추상화하다 / 071.C1_TIME_SYNCHRONOUSLY:동시다발적으로 / 072.C1_TIME_PROGRESSIVELY:점진적으로 / 073.C1_TIME_RECURRENTLY:반복적으로 / 074.C1_TIME_CONTEMPORANEOUSLY:동시대적으로 / 075.C1_TIME_TENTATIVELY:잠정적으로 / 076.C1_TIME_HISTORICALLY:역사적으로 / 077.C1_TIME_THEREAFTER:후속적으로 / 078.C1_TIME_CONCLUSIVELY:결정적으로 / 079.C1_TIME_IRREVERSIBLY:되돌릴수없게 / 080.C1_TIME_PIVOTALLY:전환기적으로 / 081.C1_SPACE_SYSTEMIC_BASE:기반구조 / 082.C1_SPACE_VERTICAL_ORDER:위계구조 / 083.C1_SPACE_ARCHITECTURE:구조체계 / 084.C1_SPACE_SPHERE:영역권 / 085.C1_SPACE_COHERENCE:정합성 / 086.C1_SPACE_SCHEMA:구성배열 / 087.C1_SPACE_COORDINATEGRID:좌표체계 / 088.C1_SPACE_OVERLAPPING:중첩영역 / 089.C1_SPACE_DIMENSIONAL:차원구조 / 090.C1_SPACE_SPATIALORDER:공간질서 / 091.C1_QUANT_PARAMETER:매개변수 / 092.C1_QUANT_INDICATOR:지표 / 093.C1_QUANT_THRESHOLDADV:한계임계점 / 094.C1_QUANT_DEVIATION:편차 / 095.C1_QUANT_EXPANSIONRATE:확장률 / 096.C1_QUANT_CORRELATION:상관관계 / 097.C1_QUANT_CONSTRAINT:제약조건 / 098.C1_QUANT_PROJECTION:추정치 / 099.C1_QUANT_DISPARITY:격차 / 100.C1_QUANT_OPTIMUM:최적상태 / 101.C1_RELATE_BROKER:매개하다 / 102.C1_RELATE_MERGE:통합연결하다 / 103.C1_RELATE_SUBJUGATE:종속시키다 / 104.C1_RELATE_INTERDEPEND:상호의존하다 / 105.C1_RELATE_ALIGN_ACTORS:조율연계하다 / 106.C1_RELATE_POLARIZE:양극화하다 / 107.C1_RELATE_BROKER_DEAL:절충하다 / 108.C1_RELATE_BRIDGE:조화시키다 / 109.C1_RELATE_INTERVENE:개입하다 / 110.C1_RELATE_FUSE:융합하다 / 111.C1_STATE_ROBUST:복원력있는 / 112.C1_STATE_FRAGILE:취약성이큰 / 113.C1_STATE_VIGOROUS:역동성있는 / 114.C1_STATE_INERT:고정적인 / 115.C1_STATE_COHERENT:일관성있는 / 116.C1_STATE_AMBIVALENT:양가적인 / 117.C1_STATE_ACCOUNTABLE:투명성이높은 / 118.C1_STATE_RIGOROUS:엄밀한 / 119.C1_STATE_VIABLE:지속유지가능한 / 120.C1_STATE_PIONEERING:혁신성있는

**=== C2 (001~120) ===**

001.C2_PHIL_EXISTENTIALISM:실존주의 / 002.C2_PHIL_ONTOLOGY:존재론 / 003.C2_PHIL_EPISTEMOLOGY:인식론 / 004.C2_PHIL_UTILITARIANISM:공리주의 / 005.C2_PHIL_RELATIVISM:상대주의 / 006.C2_PHIL_DIALECTIC:변증법 / 007.C2_PHIL_DETERMINISM:결정론 / 008.C2_PHIL_CONTEMPLATE:성찰하다 / 009.C2_PHIL_ETHICAL:윤리적인 / 010.C2_PHIL_ABSTRACT:추상적인 / 011.C2_SOC_STRATIFICATION:계층화 / 012.C2_SOC_STIGMA:낙인 / 013.C2_SOC_INEQUALITY:불평등 / 014.C2_SOC_COMMUNITY:공동체 / 015.C2_SOC_NORM:사회규범 / 016.C2_SOC_POLARIZATION:양극화 / 017.C2_SOC_SOCIALIZE:사회화하다 / 018.C2_SOC_MARGINALIZE:주변화하다 / 019.C2_SOC_COLLECTIVE:집단적인 / 020.C2_SOC_HIERARCHICAL:위계적인 / 021.C2_POL_GOVERNANCE:거버넌스 / 022.C2_POL_SOVEREIGNTY:주권 / 023.C2_POL_LEGITIMACY:정당성 / 024.C2_POL_IDEOLOGY:이데올로기 / 025.C2_POL_BUREAUCRACY:관료제 / 026.C2_POL_DIPLOMACY:외교 / 027.C2_POL_REGULATE:규제하다 / 028.C2_POL_LEGISLATE:입법하다 / 029.C2_POL_AUTHORITARIAN:권위주의적인 / 030.C2_POL_DEMOCRATIC:민주적인 / 031.C2_ECON_CAPITAL:자본 / 032.C2_ECON_INFLATION:인플레이션 / 033.C2_ECON_RECESSION:불황 / 034.C2_ECON_PRODUCTIVITY:생산성 / 035.C2_ECON_CONSUMPTION:소비 / 036.C2_ECON_FINANCIALMARKET:금융시장 / 037.C2_ECON_DISTRIBUTE:분배하다 / 038.C2_ECON_INVEST:투자하다 / 039.C2_ECON_COMPETITIVE:경쟁적인 / 040.C2_ECON_SUSTAINABLE:지속가능한 / 041.C2_MEDIA_PLATFORM:플랫폼 / 042.C2_MEDIA_ALGORITHM:알고리즘 / 043.C2_MEDIA_PUBLICOPINION:여론 / 044.C2_MEDIA_MISINFORMATION:허위정보 / 045.C2_MEDIA_CENSORSHIP:검열 / 046.C2_MEDIA_DISCOURSE:미디어담론 / 047.C2_MEDIA_BROADCAST:방송하다 / 048.C2_MEDIA_FILTER:필터링하다 / 049.C2_MEDIA_INTERACTIVE:상호작용적인 / 050.C2_MEDIA_DIGITAL:디지털적인 / 051.C2_PSY_COGNITION:인지 / 052.C2_PSY_PERCEPTION:지각 / 053.C2_PSY_TRAUMA:트라우마 / 054.C2_PSY_BEHAVIOR:행동양식 / 055.C2_PSY_SELFESTEEM:자존감 / 056.C2_PSY_RESILIENCE:회복탄력성 / 057.C2_PSY_CONFRONT:직면하다 / 058.C2_PSY_REGULATEEMOTION:감정조절하다 / 059.C2_PSY_IMPULSIVE:충동적인 / 060.C2_PSY_SELFAWARE:자기인식적인 / 061.C2_ENG_OPTIMIZATION:최적화 / 062.C2_ENG_INFRASTRUCTURE:인프라 / 063.C2_ENG_AUTOMATION:자동화시스템 / 064.C2_ENG_CIRCUIT:회로구조 / 065.C2_ENG_PRECISION:정밀도 / 066.C2_ENG_EFFICIENCY:효율성 / 067.C2_ENG_DESIGN:설계하다 / 068.C2_ENG_CALIBRATE:보정하다 / 069.C2_ENG_STRUCTURAL:구조적인 / 070.C2_ENG_MODULAR:모듈형의 / 071.C2_PHYS_QUANTUMSTATE:양자상태 / 072.C2_PHYS_GRAVITYFIELD:중력장 / 073.C2_PHYS_ACCELERATION:가속도 / 074.C2_PHYS_WAVELENGTH:파장 / 075.C2_PHYS_PARTICLE:입자 / 076.C2_PHYS_RELATIVITY:상대성이론 / 077.C2_PHYS_COLLIDE:충돌하다 / 078.C2_PHYS_OSCILLATE:진동하다 / 079.C2_PHYS_THEORETICAL:이론물리학적인 / 080.C2_PHYS_DYNAMIC:역학적인 / 081.C2_CHEM_CATALYST:촉매 / 082.C2_CHEM_MOLECULARBOND:분자결합 / 083.C2_CHEM_OXIDATION:산화반응 / 084.C2_CHEM_COMPOUND:화합물 / 085.C2_CHEM_ORGANICCHEM:유기화학 / 086.C2_CHEM_SOLVENT:용매 / 087.C2_CHEM_SYNTHESIZE:합성하다 / 088.C2_CHEM_REACT:반응하다 / 089.C2_CHEM_CORROSIVE:부식성의 / 090.C2_CHEM_STABLE:안정적인화학적 / 091.C2_CS_DATABASE:데이터베이스 / 092.C2_CS_NETWORK:네트워크 / 093.C2_CS_CYBERSECURITY:사이버보안 / 094.C2_CS_CLOUDSYSTEM:클라우드시스템 / 095.C2_CS_MACHINELEARNING:기계학습 / 096.C2_CS_ENCRYPTION:암호화 / 097.C2_CS_PROCESSDATA:데이터처리하다 / 098.C2_CS_PROGRAM:프로그래밍하다 / 099.C2_CS_SCALABLE:확장가능한 / 100.C2_CS_DISTRIBUTED:분산형의 / 101.C2_GEO_TECTONICPLATE:지각판 / 102.C2_GEO_CLIMATECHANGE:기후변화 / 103.C2_GEO_ECOSYSTEM:생태계 / 104.C2_GEO_ATMOSPHERE:대기권 / 105.C2_GEO_SEISMICWAVE:지진파 / 106.C2_GEO_CARBONCYCLE:탄소순환 / 107.C2_GEO_ERODE:침식되다 / 108.C2_GEO_MONITORCLIMATE:기후를관측하다 / 109.C2_GEO_GEOLOGICAL:지질학적인 / 110.C2_GEO_ENVIRONMENTAL:환경적인 / 111.C2_BIO_GENETICS:유전학 / 112.C2_BIO_EVOLUTION:진화론 / 113.C2_BIO_CELLULAR:세포구조 / 114.C2_BIO_METABOLISM:신진대사 / 115.C2_BIO_DNA:DNA 염기서열 / 116.C2_BIO_BIODIVERSITY:생물다양성 / 117.C2_BIO_MUTATE:변이하다 / 118.C2_BIO_ADAPT:적응진화하다 / 119.C2_BIO_ORGANIC:유기체적인 / 120.C2_BIO_EVOLUTIONARY:진화생물학적인

## 3.8 Registry Self-Verification (already applied, reference only)

1. 120 IDX entries confirmed per level, no gaps. 2. No duplicate ConceptIDs within a level. 3. Domain balance confirmed (10 per domain × 12 domains for every level, including C2's independent academic domain set). 4. Culture-specific target_words flagged for downstream 🚩 CULTURAL review at the example-generation stage. These checks were already passed when Section 3 was locked; STEP 1~2 below assume this registry is correct and do not re-run them.

# 4. Internal Processing Order (Output Prohibited)

Never output intermediate results within this manual's own internal steps (STEP 1 declarations are not shown standalone). Only the final TARGET_BLOCK + stage-1 status (Section 5) is output.

## STEP 1 — Batch Extraction and WORD_SPEC Declaration

Extract exactly 5 consecutive IDX items corresponding to BATCH_ID from the selected LEVEL's list in Section 3.7, using the calculation method given in Section 3. All 5 items belong to the same LEVEL by construction; a BATCH_ID outside 001~024 is a fatal input error.

Source-purity: all 5 target_word values must originate verbatim from the Section 3.7 registry; no external or newly generated word is permitted. IDX / ConceptID / LEVEL / target_word must never be changed or reordered.

For each of the 5 extracted words, declare a WORD_SPEC.

**WORD_SPEC Fields (Required):**

TARGET_WORD: target_word verbatim, exactly as locked in Section 3.7 (no changes permitted at any later step)

POS: part of speech (verb / noun / adjective / adverb / determiner, etc.)

DOMAIN: derived from the ConceptID's domain segment (Section 3.6) — carried through, not re-derived downstream

POLYSEMY_FLAG: YES / NO. If YES: USED_MEANING = {fixed single Korean meaning}, EXCLUDED_MEANINGS = {remaining meanings} (Section 3.2)

CORE: always equal to TARGET_WORD (Section 3.4)

MEANING_ZONE: 1 to 3 natural Korean expressions in the same semantic zone as CORE, MEANING_ZONE[0] = CORE, per the Meaning Zone Rules (Section 3.4)

CULTURAL_FLAG: YES / NO — set YES if the word's natural example situations tend toward a culture-specific context (Section 3.3), for downstream author awareness; does not block generation, only flags for native review.

**WORD_SPEC Validation (any failure → FAIL → redeclare):**

Any field left blank. POLYSEMY_FLAG = YES without USED_MEANING specified. TARGET_WORD not matching the Section 3.7 registry entry exactly. MEANING_ZONE violating any of the 10 Meaning Zone Rules (Section 3.4) — reselect, do not proceed.

## STEP 2 — Target-Language Example Generation

Use WORD_SPEC (all 5) as the absolute constraint.

**Block Composition (5 total, one per extracted word):** each block = 1 word (target + kr, mirror) + exactly 3 examples, in this fixed order: (1) declarative, (2) negative, (3) question.

**KR Generation Rules:**

Rule KR-01 — Subject-drop is natural (LANG_GROUP: Type A): Korean naturally omits the subject where the referent is clear from context or previously established; subject-drop is preferred over an explicit pronoun subject in casual, contextually clear examples. This is the reverse of the EN-target manual's Rule EN-01 (subject always required) — English, now a helper language, keeps its own subject-required rule in the universal EN translation prompt.

Rule KR-02 — Register consistency: choose either 해요체 (casual polite, default for A1/A2) or 합니다체 (formal polite, more common from B1 up in formal contexts) per example, and do not mix registers within a single example (no switching between 해요체 and 합니다체 mid-sentence). Both are acceptable at any level as long as they are used consistently and match the situational register of the example.

Rule KR-03 — No dialect, no translationese: no regional dialect (사투리) vocabulary or endings; no translation-influenced phrasing (번역투) as the taught rendering of the target_word's example.

Rule KR-04 — Natural SOV order: maintain natural Korean word order (topic/subject — object — verb, with natural particle-marked flexibility); do not artificially front constituents to mimic English SVO word order.

Rule KR-05 — Level-appropriate length: A1: 3~6 어절, high-frequency daily vocabulary only, no complex grammar. A2: 4~7 어절, basic grammar (연결어미, 시제 기초) allowed. B1: 5~8 어절, connected clauses permitted. B2/C1: longer connected sentences with subordinate clauses permitted, matching CEFR complexity expectations. C2: register and vocabulary matching the word's own academic domain (Section 3.6).

Rule KR-06 — Core-only constraint (replaces v1.0's FAMILY-range rule and v2.0's core-or-meaning_zone rule): every example uses ONLY core (Section 3.4). No meaning_zone[1:] expression, and no expression outside meaning_zone, may appear in any example. If core cannot be made to read naturally for a candidate situation, first try a different situation for that example (this manual controls the situation and is free to change it); only if no situation swap resolves the conflict, output that example as "FLAG: <short reason>" instead of forcing an unnatural sentence — see Section 5.

**Content Rules:**

① core must appear in a natural conjugated/inflected form in the example (e.g. 오르다 → "그녀는 계단을 올라요."). meaning_zone[1:] entries are glossary-only and are never substituted here, even where they would read more smoothly (Section 3.4).

② Example situation diversity across all 5 blocks: same object/location within one block → max 2 occurrences; same situation repeated 3+ times across all 5 blocks → forbidden; mix indoor/outdoor locations; mix 1st/2nd/3rd person subjects where a subject is used. When selecting a situation, also weigh the situation-selection risk guidance in Section 3.4 — prefer situations whose natural expression is likely to transfer across the 6 helper languages.

③ Culturally neutral situations preferred (Section 3.3); culture-specific situations → record 🚩 CULTURAL flag if used.

④ Context Ambiguity prevention: replace any situation at risk of an unintended romantic or otherwise ambiguous reading with an unambiguous situation.

**Mirror Rule (kr):** word.kr = word.target exactly (core and meaning_zone identical); examples[].kr = examples[].target exactly, sentence for sentence, in every block. Because target = Korean, there is no independent kr generation step — kr is copied, not translated. Because word.target's own examples are already core-only (Rule KR-06), the kr mirror inherits that compliance automatically.

## Stage-1 QA (self-check before output)

TS-01: 5 blocks extracted, all same LEVEL. TS-02: every WORD_SPEC field populated, no blanks. TS-03: every MEANING_ZONE satisfies all 10 Meaning Zone Rules (Section 3.4). TS-04: every example uses ONLY core — zero meaning_zone[1:] expressions and zero outside-zone expressions present anywhere; where core did not fit naturally, was a different situation tried before resorting to FLAG (Rule KR-06)? TS-05: register consistency maintained in every example — no 해요체/합니다체 mixing mid-sentence (Rule KR-02). TS-06: subject-drop applied naturally where contextually appropriate — no artificially forced explicit subject (Rule KR-01, Type A). TS-07: example order is declarative → negative → question in every block. TS-08: word.kr/examples[].kr are an exact mirror of word.target/examples[].target in every block. TS-09: no culture-specific situation used without a recorded 🚩 CULTURAL flag. TS-10: no romantic-nuance or other semantic-ambiguity risk left unresolved. TS-11: for any situation chosen, was the situation-selection risk guidance (Section 3.4) considered — body-part idioms, directional/manner-specific motion verbs, and copula-only expressions in particular?

Any TS failure → correct and re-check before output; do not output a failing TARGET_BLOCK.

# 5. Final Output Format

Output ONLY:

{TARGET_BLOCK JSON}
STAGE1_STATUS: PASS
FLAG: {content} or NONE

Any example value inside TARGET_BLOCK may itself be the literal string "FLAG: <short reason>" per Rule KR-06/Section 3.4, when core could not be used naturally for that situation even after trying an alternative situation. This is distinct from the batch-level "FLAG: {content} or NONE" line above, which continues to report CULTURAL flags and other batch-level notes; an example-level FLAG does not by itself require STAGE1_STATUS: FAIL, but the batch-level FLAG line should mention it so Manual B treats that example as requiring human review rather than merging it silently.

If any Stage-1 QA item fails after correction attempts, output STAGE1_STATUS: FAIL with the specific TS code(s) instead of the JSON, and do not proceed to Manual B.

# 6. TARGET_BLOCK JSON Template (Structure Fixed)

This is a **partial** JSON — only target and kr columns. Manual B merges this with the 7 translation-prompt outputs to build the final 8-column runtime JSON (Section 6 of Manual B).

```
{
  "meta": { "series": "vocabulary", "level": "", "id": "" },
  "title": { "target": "", "kr": "" },
  "blocks": [
    {
      "id": "block_001",
      "word": {
        "target": { "core": "", "meaning_zone": [""] },
        "kr": { "core": "", "meaning_zone": [""] }
      },
      "examples": [
        { "target": "", "kr": "" },
        { "target": "", "kr": "" },
        { "target": "", "kr": "" }
      ]
    }
    // repeat for block_002 ~ block_005, identical structure
  ]
}
```

meta.series = "vocabulary" (fixed) · meta.level = lowercase level string (e.g. "a1") · meta.id = 3-digit BATCH_ID (e.g. "001") · blocks = exactly 5 total · examples = exactly 3 per block, in fixed order declarative → negative → question · word.kr and examples[].kr are exact mirrors of word.target and examples[].target.

# 7. Absolutely Prohibited

Non-JSON text output outside the format specified in Section 5.

Changing word.target.core (must always equal TARGET_WORD from Section 3.7) or making word.kr differ from word.target in any way.

Changing meta or title after STEP 1.

Changing block count (5 fixed) or example count (3 per block, fixed).

Changing structure or key order.

Korean regional dialect (사투리), register-mixing (해요체/합니다체 mid-example), or translation-influenced phrasing (번역투) in the target/kr column.

Any target_word not sourced verbatim from the Section 3.7 locked registry.

Non-Korean target_word at any stage.

BATCH_ID outside the 001~024 range for the selected LEVEL, or a LEVEL outside A1~C2.

meaning_zone violating any of the 10 Meaning Zone Rules in Section 3.4 (max 3, min 1, first = core, no duplicates, same zone only, no expansion/narrowing, no POS shift, no forced filling, meaning_zone[1:] never used in an example).

Any example using a meaning_zone[1:] expression, or any expression outside core/meaning_zone entirely.

Forcing core into an example where it produces an unnatural or incorrect sentence instead of trying a different situation or, failing that, using FLAG.

Silently substituting a different word to avoid a naturalness conflict without flagging it.

Culture-specific example situations used without a recorded 🚩 CULTURAL flag.

Sensory/physical verbs used without an object where 2+ interpretations are possible (semantic ambiguity, e.g. romantic-nuance risk).

# 8. Execution Command

Input LEVEL and BATCH_ID and execute immediately. Perform STEP 1~2 and Stage-1 QA internally and output only the TARGET_BLOCK + status, per Section 5. Example: LEVEL: A1, BATCH_ID: 001. (Valid BATCH_ID range per LEVEL: 001~024; valid LEVEL range: A1~C2.)

# 9. Change Log

## [v3.0 — Core-Only Examples + FLAG Escape Valve, KR-Target Edition]

Replaces v2.0. Examples Generation Rule (Section 3.4) and Rule KR-06 (STEP 2) changed from "core or any meaning_zone expression" to "core only" — meaning_zone[1:] is now glossary/reference-only and is never used in an example, in this manual or in any of the 7 translation prompts. Meaning Zone Rules gained Rule 10 (meaning_zone[1:] never appears in an example). Added a FLAG escape valve (Section 3.4, Rule KR-06, Section 5): where core cannot be made natural for a candidate situation, this manual's own freedom to choose a different situation is the primary fix; only if that fails does the example field become "FLAG: <short reason>", distinct from the pre-existing batch-level FLAG line. Added situation-selection risk guidance (Section 3.4, Content Rule ②, TS-11): situations built on body-part idioms, directional/manner-specific motion verbs, or copula-only expressions are flagged as more likely to cause downstream core-mismatch in one or more of the 6 helper languages, and should be avoided or chosen more carefully. TS-03/TS-04 updated to reflect the 10-rule count and the core-only requirement respectively. Content Rule ① updated to name core specifically rather than "target_word or its meaning_zone equivalent." Section 7 (Absolutely Prohibited) updated to prohibit meaning_zone[1:] usage in examples and forced/unflagged core substitution, in place of the old blanket "expression outside meaning_zone" wording.

## [v2.0 — Pipeline Split + CORE/MEANING_ZONE, KR-Target Edition]

Replaces v1.0 (the single-manual KR-target edition, itself created by applying the v1.1 EN-target manual's Section 10, Target-Language Expansion Guide, to Korean). This document (Manual A, KR-target) now covers only registry extraction, WORD_SPEC declaration, and target/kr generation — it no longer declares PIVOT_EN/ES/FR/PT/JP/ZH or SEMANTIC_FAMILY (both retired) and no longer performs JSON merge, correction, or final QA/scoring (moved to Manual B, reused unchanged from the EN-target pipeline).

Replaced the v1.0 Pivot Lock Rule (Section 3.4), Anti-Translationese Composite Principle (Section 3.4.1), and Semantic Family Rule (Section 3.5) with a single Core & Meaning Zone Rule (this document's Section 3.4), carrying an explicit, numbered Meaning Zone Rules list (max 3 / min 1 / first = core / no forced filling / duplicates allowed to stay empty / same zone only / no expansion or narrowing / no POS shift) — identical in structure to the EN-target manual's own v1.1 → v2.0 change, applied here with kr as the mirror column instead of en.

word/example schema changed from `"target": "..."` (plain string) to `"target": { "core": "...", "meaning_zone": [...] }` for the word object; example strings remain plain strings.

The Target-Language Expansion Guide (formerly this manual's own Section 10 in v1.0) moved out of this manual — see Manual B, Section 10, since the universal 7-translation-prompt design (not this manual) is what generalizes across future target languages. Per Manual B Section 10.4, this KR-target Manual A is itself an instance of that expansion pattern: Manual B and all 7 translation prompts are reused unchanged from the EN-target pipeline; only this document was newly authored for Korean as target.

Two data-corruption artifacts inherited from the v1.0 source registry file were corrected during this migration: A2_TIME_FINALLY (item 075 of the A2 list) contained a stray non-UTF-8 replacement character in place of the final syllable and has been restored to 드디어; A2_TIME_BRIEFLY (item 080 of the A2 list) contained the non-standard string 잔간 and has been corrected to 잠깐. No other target_word value was altered; IDX, ConceptID, and LEVEL assignments are unchanged from v1.0.
