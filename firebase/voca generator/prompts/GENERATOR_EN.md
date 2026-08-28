# EN Vocabulary Manual — Manual A: Target-Language Generation (v3.0)

# 1. Purpose of This Manual

This is Manual A of a 2-manual + 7-prompt pipeline (9 documents total) that replaces the prior single-manual (v1.1) design. When one LEVEL and BATCH_ID are input, this manual internally performs: batch extraction → POS/domain/polysemy declaration (WORD_SPEC) → CORE + MEANING_ZONE declaration for the **target language only** → target-language example generation → stage-1 QA, and outputs only a **TARGET_BLOCK** (partial JSON) plus a stage-1 status line. It never produces the other 6 helper languages and never produces the final merged JSON — those are out of scope for this manual.

This manual generates content for target language = English. Because target = English, its "en" column is not a translation — it is a natural-language mirror of "target" (identical core, identical meaning_zone, identical example text). This manual therefore only ever produces 2 of the 8 language columns: target and en.

**Why the pipeline was split (v1.1 → v2.0):** the v1.1 single-pass manual generated all 8 languages plus ran correction and QA in one uninterrupted internal pass, never exposing intermediate output. That design does not parallelize: to increase throughput, generation is now restructured so that (a) the target language is generated once, standalone, by this manual, and (b) each of the 6 remaining helper languages plus the en-mirror check is generated independently by one of 7 **universal, target-language-agnostic translation prompts** (see Section 10), each of which only needs this manual's TARGET_BLOCK output as its input. A separate **Manual B (Merge & Final QA)** then assembles this manual's output together with the 7 translation-prompt outputs into the final runtime JSON and performs correction, QA, and scoring. This manual, Manual B, and the 7 translation prompts together are the complete replacement for the v1.1 single manual; no functionality has been dropped, only redistributed across documents so each piece can be run independently.

**What changed structurally (v1.1 → v2.0), carried through from Manual A's own design decisions:** the old per-language SEMANTIC_FAMILY declaration (CORE / FAMILY / ZONE / EXCLUDE) is replaced everywhere by a single **CORE + MEANING_ZONE** structure (Section 3.4). This also absorbs and retires the old Pivot Lock Rule and the Anti-Translationese Composite Principle (v1.1, Section 3.4/3.4.1) as separate rules — both are now enforced structurally by the meaning_zone constraint itself (Section 3.4), rather than as a judgment call applied after the fact.

**What changed structurally (v2.0 → v3.0):** examples were previously allowed to use core OR any meaning_zone entry, on the reasoning that every meaning_zone entry was already vetted as natural and same-zone. In practice this let two examples for the same word use two different surface expressions, so the word actually being taught was not consistently recoverable from its own examples, and the 6 downstream translation prompts had no reliable anchor to check their own output against — a language could translate a meaning_zone[1] usage instead of core and nothing would catch it. v3.0 restricts every example to core only (Section 3.4, STEP 2, TS-04) and gives meaning_zone[1:] a single, explicit role: a glossary/reference list, never a source of example wording, in this manual or in any of the 7 translation prompts. Where core genuinely cannot be used naturally for a candidate situation, this manual's own freedom to pick a different situation (Section 3.4, STEP 2) is the primary fix — the FLAG escape valve is the fallback only when no situation swap resolves it. Section 3.4 also adds guidance on situations whose natural expression tends to diverge across languages (body-part idioms, directional motion verbs, existential/possessive copulas), since this manual's situation choice is the one thing all 6 helper languages must later express using their own core — an unwise situation choice here surfaces as FLAG failures downstream in every translation prompt, not just one.

All original ConceptID design principles, the Polysemy Rule, and the Cultural Neutrality Rule are preserved unchanged from v1.1. The 720-item locked registry, 12-domain structure, and per-level 24-batch structure are unchanged.

# 2. Input Values

LEVEL: {A1 / A2 / B1 / B2 / C1 / C2}

BATCH_ID: {001~024}, 3-digit format required. BATCH_ID resets per LEVEL — each LEVEL has its own independently locked 120-item registry and its own 24-batch structure.

TARGET_LANGUAGE: English (fixed)

LANG_GROUP: ANALYTIC_SVO (English — Type B: subject required, SVO word order, analytic language; see Section 3.6)

# 3. Confirmed Master Word Registry (Locked)

Design principle: This registry was finalized under the original concept-confirmation loop — ConceptID design (concept-first, not English-verb-first) → polysemy isolation → cultural-neutrality review → 12-domain balance check → final lock — and is carried forward here as an immutable, already-locked source of truth for IDX / ConceptID / LEVEL / target_word. Re-running that generation/verification loop is out of scope for this manual.

Registry composition: 720 core concepts, native-English-first design, corpus-frequency-based, ConceptID-anchored (language-independent core key — see 3.1). Level distribution: A1 120 / A2 120 / B1 120 / B2 120 / C1 120 / C2 120 — Total: 720. Each level is independently organized into the fixed 12-domain structure (see 3.7), 10 ConceptIDs per domain per level. Batch structure: within each LEVEL, 24 batches of 5 consecutive same-level items (batch_001~batch_024).

Batch calculation method (applied within the selected LEVEL's own 120-item list): start_index = (BATCH_ID numeric value − 1) × 5 + 1; end_index = start_index + 4. Example: BATCH 001 → items 001~005 · BATCH 024 → items 116~120. If a requested BATCH_ID would require crossing into a different LEVEL's registry, this is a fatal input error — LEVEL and BATCH_ID must always be supplied together and consistently.

## 3.1 ConceptID Principle (Design Principle — DO NOT MODIFY)

ConceptID identifies a Concept, not an English word. A1_MOVE_GO is "voluntary movement" — not the word "go." Languages sharing the same ConceptID must occupy the same conceptual space, even if they use different words. ConceptID is designed concept-first; it must never be designed to match English verb boundaries. The English word is merely the English expression of that concept.

## 3.2 Polysemy Rule

If a single English word covers 2+ clearly distinct conceptual zones that would map to different words in other languages, it must not be assigned a single ConceptID at generation time; at the WORD_SPEC stage (STEP 1) any residual polysemy in a locked target_word must be resolved by fixing one meaning and excluding the rest. Judgment criteria: "run" → run (move fast) / run (operate, manage); "light" → light (not heavy) / light (brightness); "break" → break (fracture) / break (pause). Handling: POLYSEMY_FLAG: YES, USED_MEANING: {fixed single English meaning}, EXCLUDED_MEANINGS: {remaining meanings}. Failing to isolate polysemy here causes meaning-zone drift downstream, in this manual's own example generation and in every one of the 7 translation prompts.

## 3.3 Cultural Neutrality Rule

Example situations must prefer culturally neutral situations. Allowed (culturally neutral): stairs, door, street, friend, morning, home, room, classroom, park, market. Caution — 🚩 CULTURAL flag auto-triggers: subway, specific transit systems, specific institutions, traffic signals (not universal). When examples are read by learners of any of the 7 helper languages, culture-specific situations cannot be used without native review of the relevant helper language.

## 3.4 Core & Meaning Zone Rule (Target Language) — replaces v1.1 Pivot Lock Rule, Anti-Translationese Composite Principle, and Semantic Family Rule

Every target_word gets exactly one CORE + MEANING_ZONE declaration, for the target language only (this manual never declares MEANING_ZONE for the 6 helper languages — that is each translation prompt's own responsibility, applied independently in its own language, per Section 10).

**Structure:**

- CORE: the reconstruction anchor. For target = English, CORE is always the target_word itself, verbatim, exactly as locked in Section 3.8.
- MEANING_ZONE: an ordered list of 1 to 3 natural surface expressions that all occupy the exact same semantic zone as CORE (the single meaning fixed by the Polysemy Rule, Section 3.2, if polysemous). MEANING_ZONE[0] is always identical to CORE. MEANING_ZONE[1:] exists for glossary/reference purposes only — it documents related expressions a learner might also encounter. It is never used in any example sentence, in this manual or in any of the 7 translation prompts; see the Examples Generation Rule below and Rule EN-05.

**Meaning Zone Rules (hard rules, apply to every language including target/en):**

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
"core": "diagnose",
"meaning_zone": ["diagnose"]
```

**Example (valid, 2 entries):**
```
"core": "track",
"meaning_zone": ["track", "follow"]
```

**Example (invalid — third entry forced, different zone):**
```
"core": "track",
"meaning_zone": ["track", "follow", "look for"]   // "look for" is not the same zone — forbidden
```

**Because target = English in this manual:** word.en.core = word.target.core and word.en.meaning_zone = word.target.meaning_zone, exactly, in every block (mirror — not an independent declaration).

**Examples Generation Rule:** target-language (and en-mirror) example sentences use ONLY core — never a meaning_zone[1:] entry, in this manual or in any of the 7 translation prompts. This single constraint is what replaces both the old FAMILY/EXCLUDE mechanism and the old "CORE Preservation Priority" naturalness rule from v1.1. It is also what removes the ambiguity the v2.0 design left open: a same-zone expression being independently natural is no longer sufficient grounds to use it in an example — only core may appear there. If core cannot be made to read naturally for a candidate situation, the first response is to choose a different situation for that example (this manual is generating the situation itself and is free to change it, unlike the downstream translation prompts, which must work from whatever situation this manual hands them). Only if no situation swap resolves the conflict should the example field instead be output as the literal string "FLAG: <short reason>" — see Section 5.

**Situation-selection risk guidance:** because this manual's chosen situation is what all 6 helper languages must later express using their own core (Section 10), favor situations whose natural expression is likely to transfer across languages, and be more careful when a candidate situation falls into a category prone to language-specific divergence — for example: body-part or physical-state idioms (e.g. "close one's eyes" often uses a different verb from "close a door" across languages), directional or manner-specific motion verbs applied to an atypical object, and existential/possessive copula uses that some languages express without a copula at all. This manual cannot verify all 6 helper languages directly, but a more cross-linguistically transferable situation measurably reduces FLAG failures downstream, in every translation prompt at once rather than one at a time.

**Confirmed CORE/MEANING_ZONE values cannot be changed after STEP 1** of this manual; changing them later would require full example regeneration.

## 3.5 Language Type Classification (LANG_GROUP) — Reference for Section 10 Expansion

Classify before extending this system to a new target language. Applying identical rules without classification causes automatic quality degradation for Type C, D languages.

Type A — Subject can be omitted: Korean, Japanese, Spanish, Italian. Type B — Subject required: English, French, German. Type C — Person info included in verb: Arabic, Turkish. Type D — Gender/number agreement required: Arabic, French, Spanish, Portuguese.

English (target language of this manual): Type B — subject required, SVO word order, analytic language.

## 3.6 12-Domain Structure

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

Each domain contributes exactly 10 ConceptIDs per level (10 × 12 = 120 per level; 120 × 6 levels = 720 total).

## 3.7 Locked Registry - IDX | ConceptID | target_word (per level)

Format: IDX.ConceptID:target_word, separated by " / ", 120 entries per
level, grouped in fixed domain order (MOVE → SENSE → COMM → EXIST → ACT
→ EMOT → COG → TIME → SPACE → QUANT → REL → STATE), 10 consecutive
entries per domain. This list is immutable; target_word at STEP 1 must
originate verbatim from this list.

**=== A1 (001~120) ===**

001.A1_MOVE_GO:go / 002.A1_MOVE_COME:come / 003.A1_MOVE_UP:go up /
004.A1_MOVE_DOWN:go down / 005.A1_MOVE_ENTER:enter /
006.A1_MOVE_LEAVE:leave / 007.A1_MOVE_STOP:stop /
008.A1_MOVE_START:start / 009.A1_MOVE_WALK:walk / 010.A1_MOVE_RUN:run /
011.A1_SENSE_SEE:see / 012.A1_SENSE_LOOK:look / 013.A1_SENSE_HEAR:hear /
014.A1_SENSE_LISTEN:listen / 015.A1_SENSE_TASTE:taste /
016.A1_SENSE_SMELL:smell / 017.A1_SENSE_TOUCH:touch /
018.A1_SENSE_WATCH:watch / 019.A1_SENSE_SHOW:show /
020.A1_SENSE_FIND:find / 021.A1_COMM_SAY:say / 022.A1_COMM_TELL:tell /
023.A1_COMM_ASK:ask / 024.A1_COMM_ANSWER:answer / 025.A1_COMM_CALL:call
/ 026.A1_COMM_SPEAK:speak / 027.A1_COMM_TALK:talk /
028.A1_COMM_READ:read / 029.A1_COMM_WRITE:write /
030.A1_COMM_SPELL:spell / 031.A1_EXIST_BE:be / 032.A1_EXIST_HAVE:have /
033.A1_EXIST_LIVE:live / 034.A1_EXIST_STAY:stay / 035.A1_EXIST_NEED:need
/ 036.A1_EXIST_USE:use / 037.A1_EXIST_KEEP:keep / 038.A1_EXIST_OPEN:open
/ 039.A1_EXIST_CLOSE:close / 040.A1_EXIST_HAPPEN:happen /
041.A1_ACT_DO:do / 042.A1_ACT_MAKE:make / 043.A1_ACT_GET:get /
044.A1_ACT_GIVE:give / 045.A1_ACT_TAKE:take / 046.A1_ACT_PUT:put /
047.A1_ACT_BRING:bring / 048.A1_ACT_BUY:buy / 049.A1_ACT_PAY:pay /
050.A1_ACT_WORK:work / 051.A1_EMOT_LIKE:like / 052.A1_EMOT_LOVE:love /
053.A1_EMOT_WANT:want / 054.A1_EMOT_ENJOY:enjoy /
055.A1_EMOT_HAPPY:happy / 056.A1_EMOT_SAD:sad /
057.A1_EMOT_AFRAID:afraid / 058.A1_EMOT_ANGRY:angry /
059.A1_EMOT_FINE:fine / 060.A1_EMOT_EXCITED:excited /
061.A1_COG_KNOW:know / 062.A1_COG_THINK:think /
063.A1_COG_UNDERSTAND:understand / 064.A1_COG_REMEMBER:remember /
065.A1_COG_FORGET:forget / 066.A1_COG_LEARN:learn /
067.A1_COG_STUDY:study / 068.A1_COG_CHOOSE:choose /
069.A1_COG_CHECK:check / 070.A1_COG_TRY:try / 071.A1_TIME_NOW:now /
072.A1_TIME_TODAY:today / 073.A1_TIME_YESTERDAY:yesterday /
074.A1_TIME_TOMORROW:tomorrow / 075.A1_TIME_MORNING:morning /
076.A1_TIME_AFTERNOON:afternoon / 077.A1_TIME_EVENING:evening /
078.A1_TIME_NIGHT:night / 079.A1_TIME_BEFORE:before /
080.A1_TIME_AFTER:after / 081.A1_SPACE_HERE:here /
082.A1_SPACE_THERE:there / 083.A1_SPACE_IN:in / 084.A1_SPACE_ON:on /
085.A1_SPACE_UNDER:under / 086.A1_SPACE_OVER:over /
087.A1_SPACE_BETWEEN:between / 088.A1_SPACE_NEAR:near /
089.A1_SPACE_LEFT:left / 090.A1_SPACE_RIGHT:right / 091.A1_QUANT_ONE:one
/ 092.A1_QUANT_TWO:two / 093.A1_QUANT_MANY:many / 094.A1_QUANT_FEW:few /
095.A1_QUANT_ALL:all / 096.A1_QUANT_SOME:some / 097.A1_QUANT_MORE:more /
098.A1_QUANT_LESS:less / 099.A1_QUANT_FIRST:first /
100.A1_QUANT_LAST:last / 101.A1_REL_WITH:with / 102.A1_REL_FOR:for /
103.A1_REL_FROM:from / 104.A1_REL_TO:to / 105.A1_REL_AND:and /
106.A1_REL_OR:or / 107.A1_REL_BUT:but / 108.A1_REL_BECAUSE:because /
109.A1_REL_IF:if / 110.A1_REL_WHEN:when / 111.A1_STATE_BIG:big /
112.A1_STATE_SMALL:small / 113.A1_STATE_GOOD:good / 114.A1_STATE_BAD:bad
/ 115.A1_STATE_NEW:new / 116.A1_STATE_OLD:old / 117.A1_STATE_FAST:fast /
118.A1_STATE_SLOW:slow / 119.A1_STATE_HOT:hot / 120.A1_STATE_COLD:cold

**=== A2 (001~120) ===**

001.A2_MOVE_RETURN:return / 002.A2_MOVE_TRAVEL:travel /
003.A2_MOVE_FOLLOW:follow / 004.A2_MOVE_CROSS:cross /
005.A2_MOVE_PASS:pass / 006.A2_MOVE_CARRY:carry /
007.A2_MOVE_DRIVE:drive / 008.A2_MOVE_RIDE:ride / 009.A2_MOVE_FLY:fly /
010.A2_MOVE_CLIMB:climb / 011.A2_SENSE_NOTICE:notice /
012.A2_SENSE_DISCOVER:discover / 013.A2_SENSE_OBSERVE:observe /
014.A2_SENSE_COMPARE:compare / 015.A2_SENSE_MEASURE:measure /
016.A2_SENSE_IDENTIFY:identify / 017.A2_SENSE_RECOGNIZE:recognize /
018.A2_SENSE_SEARCH:search / 019.A2_SENSE_EXAMINE:examine /
020.A2_SENSE_CHECK_OUT:check out / 021.A2_COMM_EXPLAIN:explain /
022.A2_COMM_DESCRIBE:describe / 023.A2_COMM_REPORT:report /
024.A2_COMM_DISCUSS:discuss / 025.A2_COMM_INTRODUCE:introduce /
026.A2_COMM_INVITE:invite / 027.A2_COMM_REPLY:reply /
028.A2_COMM_AGREE:agree / 029.A2_COMM_DISAGREE:disagree /
030.A2_COMM_REPEAT:repeat / 031.A2_EXIST_BELONG:belong /
032.A2_EXIST_OWN:own / 033.A2_EXIST_SHARE:share /
034.A2_EXIST_PROVIDE:provide / 035.A2_EXIST_SAVE:save /
036.A2_EXIST_STORE:store / 037.A2_EXIST_PROTECT:protect /
038.A2_EXIST_ALLOW:allow / 039.A2_EXIST_REQUIRE:require /
040.A2_EXIST_DEPEND:depend / 041.A2_ACT_BUILD:build /
042.A2_ACT_CREATE:create / 043.A2_ACT_PREPARE:prepare /
044.A2_ACT_PLAN:plan / 045.A2_ACT_SEND:send / 046.A2_ACT_RECEIVE:receive
/ 047.A2_ACT_COLLECT:collect / 048.A2_ACT_CLEAN:clean /
049.A2_ACT_FIX:fix / 050.A2_ACT_CHANGE:change /
051.A2_EMOT_PREFER:prefer / 052.A2_EMOT_HOPE:hope /
053.A2_EMOT_WORRY:worry / 054.A2_EMOT_TRUST:trust /
055.A2_EMOT_RESPECT:respect / 056.A2_EMOT_SURPRISED:surprised /
057.A2_EMOT_PROUD:proud / 058.A2_EMOT_BORED:bored /
059.A2_EMOT_RELAXED:relaxed / 060.A2_EMOT_NERVOUS:nervous /
061.A2_COG_BELIEVE:believe / 062.A2_COG_DECIDE:decide /
063.A2_COG_SOLVE:solve / 064.A2_COG_IMAGINE:imagine /
065.A2_COG_GUESS:guess / 066.A2_COG_EXPECT:expect /
067.A2_COG_CONSIDER:consider / 068.A2_COG_FOCUS:focus /
069.A2_COG_IMPROVE:improve / 070.A2_COG_PRACTICE:practice /
071.A2_TIME_WEEK:week / 072.A2_TIME_MONTH:month / 073.A2_TIME_YEAR:year
/ 074.A2_TIME_MINUTE:minute / 075.A2_TIME_HOUR:hour /
076.A2_TIME_EARLY:early / 077.A2_TIME_LATE:late / 078.A2_TIME_SOON:soon
/ 079.A2_TIME_RECENTLY:recently / 080.A2_TIME_ALREADY:already /
081.A2_SPACE_INSIDE:inside / 082.A2_SPACE_OUTSIDE:outside /
083.A2_SPACE_ABOVE:above / 084.A2_SPACE_BELOW:below /
085.A2_SPACE_BEHIND:behind / 086.A2_SPACE_FRONT:in front of /
087.A2_SPACE_ACROSS:across / 088.A2_SPACE_AROUND:around /
089.A2_SPACE_TOWARD:toward / 090.A2_SPACE_ALONG:along /
091.A2_QUANT_ENOUGH:enough / 092.A2_QUANT_SEVERAL:several /
093.A2_QUANT_EACH:each / 094.A2_QUANT_EVERY:every /
095.A2_QUANT_BOTH:both / 096.A2_QUANT_EITHER:either /
097.A2_QUANT_NEITHER:neither / 098.A2_QUANT_HALF:half /
099.A2_QUANT_MOST:most / 100.A2_QUANT_ANOTHER:another /
101.A2_REL_DURING:during / 102.A2_REL_WITHOUT:without /
103.A2_REL_THROUGH:through / 104.A2_REL_AGAINST:against /
105.A2_REL_UNTIL:until / 106.A2_REL_WHILE:while /
107.A2_REL_THOUGH:though / 108.A2_REL_SINCE:since /
109.A2_REL_EXCEPT:except / 110.A2_REL_INSTEAD:instead /
111.A2_STATE_BUSY:busy / 112.A2_STATE_EMPTY:empty /
113.A2_STATE_FULL:full / 114.A2_STATE_DIFFICULT:difficult /
115.A2_STATE_EASY:easy / 116.A2_STATE_STRONG:strong /
117.A2_STATE_WEAK:weak / 118.A2_STATE_SAFE:safe /
119.A2_STATE_DANGEROUS:dangerous / 120.A2_STATE_SPECIAL:special

**=== B1 (001~120) ===**

001.B1_MOVE_APPROACH:approach / 002.B1_MOVE_DEPART:depart /
003.B1_MOVE_ADVANCE:advance / 004.B1_MOVE_WITHDRAW:withdraw /
005.B1_MOVE_TRANSPORT:transport / 006.B1_MOVE_TRANSFER:transfer /
007.B1_MOVE_NAVIGATE:navigate / 008.B1_MOVE_WANDER:wander /
009.B1_MOVE_ESCAPE:escape / 010.B1_MOVE_PURSUE:pursue /
011.B1_SENSE_DETECT:detect / 012.B1_SENSE_MONITOR:monitor /
013.B1_SENSE_INSPECT:inspect / 014.B1_SENSE_EVALUATE:evaluate /
015.B1_SENSE_ASSESS:assess / 016.B1_SENSE_INTERPRET:interpret /
017.B1_SENSE_VERIFY:verify / 018.B1_SENSE_CONFIRM:confirm /
019.B1_SENSE_REVIEW:review / 020.B1_SENSE_ANALYZE:analyze /
021.B1_COMM_ANNOUNCE:announce / 022.B1_COMM_RECOMMEND:recommend /
023.B1_COMM_SUGGEST:suggest / 024.B1_COMM_ARGUE:argue /
025.B1_COMM_NEGOTIATE:negotiate / 026.B1_COMM_PERSUADE:persuade /
027.B1_COMM_WARN:warn / 028.B1_COMM_COMPLAIN:complain /
029.B1_COMM_CONVINCE:convince / 030.B1_COMM_COMMENT:comment /
031.B1_EXIST_MAINTAIN:maintain / 032.B1_EXIST_SURVIVE:survive /
033.B1_EXIST_SUPPORT:support / 034.B1_EXIST_MANAGE:manage /
035.B1_EXIST_OPERATE:operate / 036.B1_EXIST_FUNCTION:function /
037.B1_EXIST_CONTAIN:contain / 038.B1_EXIST_INCLUDE:include /
039.B1_EXIST_REMAIN:remain / 040.B1_EXIST_AVOID:avoid /
041.B1_ACT_ACHIEVE:achieve / 042.B1_ACT_COMPLETE:complete /
043.B1_ACT_DEVELOP:develop / 044.B1_ACT_ORGANIZE:organize /
045.B1_ACT_ESTABLISH:establish / 046.B1_ACT_PRODUCE:produce /
047.B1_ACT_REDUCE:reduce / 048.B1_ACT_INCREASE:increase /
049.B1_ACT_REPLACE:replace / 050.B1_ACT_IMPACT:impact /
051.B1_EMOT_ADMIRE:admire / 052.B1_EMOT_APPRECIATE:appreciate /
053.B1_EMOT_REGRET:regret / 054.B1_EMOT_DOUBT:doubt /
055.B1_EMOT_ADAPT:adapt / 056.B1_EMOT_MISS:miss /
057.B1_EMOT_SATISFIED:satisfied / 058.B1_EMOT_DISAPPOINTED:disappointed
/ 059.B1_EMOT_CONFIDENT:confident / 060.B1_EMOT_GRATEFUL:grateful /
061.B1_COG_REALIZE:realize / 062.B1_COG_CONCLUDE:conclude /
063.B1_COG_JUDGE:judge / 064.B1_COG_ESTIMATE:estimate /
065.B1_COG_PREDICT:predict / 066.B1_COG_REFLECT:reflect /
067.B1_COG_DETERMINE:determine / 068.B1_COG_IDENTIFY_CAUSE:identify
cause / 069.B1_COG_PRIORITY:prioritize / 070.B1_COG_INFER:infer /
071.B1_TIME_DECADE:decade / 072.B1_TIME_PERIOD:period /
073.B1_TIME_DEADLINE:deadline / 074.B1_TIME_SCHEDULE:schedule /
075.B1_TIME_DURATION:duration / 076.B1_TIME_MEANWHILE:meanwhile /
077.B1_TIME_EVENTUALLY:eventually / 078.B1_TIME_CURRENTLY:currently /
079.B1_TIME_PREVIOUSLY:previously / 080.B1_TIME_IMMEDIATELY:immediately
/ 081.B1_SPACE_REGION:region / 082.B1_SPACE_AREA:area /
083.B1_SPACE_DIRECTION:direction / 084.B1_SPACE_ROUTE:route /
085.B1_SPACE_POSITION:position / 086.B1_SPACE_DISTANCE:distance /
087.B1_SPACE_BORDER:border / 088.B1_SPACE_CENTER:center /
089.B1_SPACE_CORNER:corner / 090.B1_SPACE_PATH:path /
091.B1_QUANT_PERCENTAGE:percentage / 092.B1_QUANT_AMOUNT:amount /
093.B1_QUANT_TOTAL:total / 094.B1_QUANT_AVERAGE:average /
095.B1_QUANT_MAJORITY:majority / 096.B1_QUANT_MINORITY:minority /
097.B1_QUANT_PORTION:portion / 098.B1_QUANT_RATE:rate /
099.B1_QUANT_LIMIT:limit / 100.B1_QUANT_CAPACITY:capacity /
101.B1_REL_DESPITE:despite / 102.B1_REL_REGARDING:regarding /
103.B1_REL_CONCERNING:concerning / 104.B1_REL_BESIDES:besides /
105.B1_REL_MOREOVER:moreover / 106.B1_REL_HOWEVER:however /
107.B1_REL_THEREFORE:therefore / 108.B1_REL_THUS:thus /
109.B1_REL_WHETHER:whether / 110.B1_REL_AS_LONG_AS:as long as /
111.B1_STATE_AVAILABLE:available / 112.B1_STATE_RESPONSIBLE:responsible
/ 113.B1_STATE_INDEPENDENT:independent / 114.B1_STATE_FLEXIBLE:flexible
/ 115.B1_STATE_EFFECTIVE:effective / 116.B1_STATE_EFFICIENT:efficient /
117.B1_STATE_SIGNIFICANT:significant / 118.B1_STATE_GENERAL:general /
119.B1_STATE_TYPICAL:typical / 120.B1_STATE_COMMON:common

**=== B2 (001~120) ===**

001.B2_MOVE_MIGRATE:migrate / 002.B2_MOVE_COMMUTE:commute /
003.B2_MOVE_EVACUATE:evacuate / 004.B2_MOVE_RELOCATE:relocate /
005.B2_MOVE_CIRCULATE:circulate / 006.B2_MOVE_ACCELERATE:accelerate /
007.B2_MOVE_HALT:halt / 008.B2_MOVE_ROAM:roam /
009.B2_MOVE_DESCEND:descend / 010.B2_MOVE_PROCEED:proceed /
011.B2_SENSE_PERCEIVE:perceive / 012.B2_SENSE_DIAGNOSE:diagnose /
013.B2_SENSE_TRACE:trace / 014.B2_SENSE_TRACK:track /
015.B2_SENSE_PROBE:probe / 016.B2_SENSE_SCRUTINIZE:scrutinize /
017.B2_SENSE_DECODE:decode / 018.B2_SENSE_REVEAL:reveal /
019.B2_SENSE_HIGHLIGHT:highlight / 020.B2_SENSE_INDICATE:indicate /
021.B2_COMM_DEBATE:debate / 022.B2_COMM_CRITICIZE:criticize /
023.B2_COMM_JUSTIFY:justify / 024.B2_COMM_CLARIFY:clarify /
025.B2_COMM_EMPHASIZE:emphasize / 026.B2_COMM_ILLUSTRATE:illustrate /
027.B2_COMM_OUTLINE:outline / 028.B2_COMM_SUMMARIZE:summarize /
029.B2_COMM_PRESENT:present / 030.B2_COMM_CONSULT:consult /
031.B2_EXIST_SUSTAIN:sustain / 032.B2_EXIST_PRESERVE:preserve /
033.B2_EXIST_GUARANTEE:guarantee / 034.B2_EXIST_CONTRIBUTE:contribute /
035.B2_EXIST_RESIDE:reside / 036.B2_EXIST_COEXIST:coexist /
037.B2_EXIST_COMPETE:compete / 038.B2_EXIST_RETAIN:retain /
039.B2_EXIST_OCCUR:occur / 040.B2_EXIST_CONSIST:consist /
041.B2_ACT_IMPLEMENT:implement / 042.B2_ACT_EXECUTE:execute /
043.B2_ACT_MODIFY:modify / 044.B2_ACT_EXPAND:expand /
045.B2_ACT_TRANSFORM:transform / 046.B2_ACT_GENERATE:generate /
047.B2_ACT_INTEGRATE:integrate / 048.B2_ACT_COORDINATE:coordinate /
049.B2_ACT_FACILITATE:facilitate / 050.B2_ACT_STIMULATE:stimulate /
051.B2_EMOT_EMPATHIZE:empathize / 052.B2_EMOT_TOLERATE:tolerate /
053.B2_EMOT_REASSURE:reassure / 054.B2_EMOT_HESITATE:hesitate /
055.B2_EMOT_RESENT:resent / 056.B2_EMOT_ENVY:envy /
057.B2_EMOT_SYMPATHETIC:sympathetic / 058.B2_EMOT_AMBITIOUS:ambitious /
059.B2_EMOT_MOTIVATED:motivated / 060.B2_EMOT_OVERWHELMED:overwhelmed /
061.B2_COG_SPECULATE:speculate / 062.B2_COG_REASON:reason /
063.B2_COG_FORMULATE:formulate / 064.B2_COG_CONCEPTUALIZE:conceptualize
/ 065.B2_COG_CORRELATE:correlate / 066.B2_COG_DISTINGUISH:distinguish /
067.B2_COG_GENERALIZE:generalize / 068.B2_COG_RATIONALIZE:rationalize /
069.B2_COG_RECONSIDER:reconsider / 070.B2_COG_RECOGNITION:recognition /
071.B2_TIME_ERA:era / 072.B2_TIME_PHASE:phase /
073.B2_TIME_INTERVAL:interval / 074.B2_TIME_TIMELINE:timeline /
075.B2_TIME_TRANSITION:transition / 076.B2_TIME_POSTPONE:postpone /
077.B2_TIME_DELAY:delay / 078.B2_TIME_ONGOING:ongoing /
079.B2_TIME_SUBSEQUENT:subsequent / 080.B2_TIME_CONCURRENT:concurrent /
081.B2_SPACE_VICINITY:vicinity / 082.B2_SPACE_TERRITORY:territory /
083.B2_SPACE_VENUE:venue / 084.B2_SPACE_BOUNDARY:boundary /
085.B2_SPACE_SECTOR:sector / 086.B2_SPACE_ZONE:zone /
087.B2_SPACE_DIMENSION:dimension / 088.B2_SPACE_LAYER:layer /
089.B2_SPACE_FRAMEWORK:framework / 090.B2_SPACE_NETWORK:network /
091.B2_QUANT_PROPORTION:proportion / 092.B2_QUANT_FREQUENCY:frequency /
093.B2_QUANT_DENSITY:density / 094.B2_QUANT_VOLUME:volume /
095.B2_QUANT_MARGIN:margin / 096.B2_QUANT_QUOTA:quota /
097.B2_QUANT_THRESHOLD:threshold / 098.B2_QUANT_RATIO:ratio /
099.B2_QUANT_SURPLUS:surplus / 100.B2_QUANT_DEFICIT:deficit /
101.B2_REL_ACCORDING_TO:according to / 102.B2_REL_IN_SPITE_OF:in spite
of / 103.B2_REL_ASIDE_FROM:aside from / 104.B2_REL_WHEREAS:whereas /
105.B2_REL_HENCE:hence / 106.B2_REL_NEVERTHELESS:nevertheless /
107.B2_REL_CONSEQUENTLY:consequently / 108.B2_REL_OTHERWISE:otherwise /
109.B2_REL_PROVIDED_THAT:provided that / 110.B2_REL_INSOFAR_AS:insofar
as / 111.B2_STATE_CRUCIAL:crucial / 112.B2_STATE_RELEVANT:relevant /
113.B2_STATE_COMPLEX:complex / 114.B2_STATE_STABLE:stable /
115.B2_STATE_VULNERABLE:vulnerable / 116.B2_STATE_CONSISTENT:consistent
/ 117.B2_STATE_DIVERSE:diverse / 118.B2_STATE_PROMINENT:prominent /
119.B2_STATE_SUBSTANTIAL:substantial / 120.B2_STATE_PRACTICAL:practical

**=== C1 (001~120) ===**

001.C1_MOVE_DISPERSE:disperse / 002.C1_MOVE_CONVERGE:converge /
003.C1_MOVE_PENETRATE:penetrate / 004.C1_MOVE_TRAVERSE:traverse /
005.C1_MOVE_INFILTRATE:infiltrate / 006.C1_MOVE_DEVIATE:deviate /
007.C1_MOVE_EMERGE:emerge / 008.C1_MOVE_RETREAT:retreat /
009.C1_MOVE_PROPAGATE:propagate / 010.C1_MOVE_DRIFT:drift /
011.C1_SENSE_DISCERN:discern / 012.C1_SENSE_COMPREHEND:comprehend /
013.C1_SENSE_DEDUCE:deduce / 014.C1_SENSE_ELUCIDATE:elucidate /
015.C1_SENSE_DELINEATE:delineate / 016.C1_SENSE_DECONSTRUCT:deconstruct
/ 017.C1_SENSE_CONTEXTUALIZE:contextualize /
018.C1_SENSE_SUBSTANTIATE:substantiate /
019.C1_SENSE_CORROBORATE:corroborate / 020.C1_SENSE_DEPICT:depict /
021.C1_COMM_ARTICULATE:articulate / 022.C1_COMM_CONVEY:convey /
023.C1_COMM_DISSEMINATE:disseminate / 024.C1_COMM_REBUT:rebut /
025.C1_COMM_ASSERT:assert / 026.C1_COMM_ADVOCATE:advocate /
027.C1_COMM_CITE:cite / 028.C1_COMM_PARAPHRASE:paraphrase /
029.C1_COMM_ELABORATE:elaborate / 030.C1_COMM_CONTEST:contest /
031.C1_EXIST_PREVAIL:prevail / 032.C1_EXIST_ENSUE:ensue /
033.C1_EXIST_PERSIST:persist / 034.C1_EXIST_TRANSCEND:transcend /
035.C1_EXIST_UNDERLIE:underlie / 036.C1_EXIST_ENTAIL:entail /
037.C1_EXIST_COMPRISE:comprise / 038.C1_EXIST_PERPETUATE:perpetuate /
039.C1_EXIST_STEM:stem / 040.C1_EXIST_COINCIDE:coincide /
041.C1_ACT_ORCHESTRATE:orchestrate / 042.C1_ACT_RESTRUCTURE:restructure
/ 043.C1_ACT_STREAMLINE:streamline / 044.C1_ACT_LEVERAGE:leverage /
045.C1_ACT_DEPLOY:deploy / 046.C1_ACT_CONSOLIDATE:consolidate /
047.C1_ACT_RECTIFY:rectify / 048.C1_ACT_MOBILIZE:mobilize /
049.C1_ACT_ALLOCATE:allocate / 050.C1_ACT_REINFORCE:reinforce /
051.C1_EMOT_ASPIRE:aspire / 052.C1_EMOT_DREAD:dread /
053.C1_EMOT_RECONCILE:reconcile / 054.C1_EMOT_DETACH:detach /
055.C1_EMOT_CHERISH:cherish / 056.C1_EMOT_CONDEMN:condemn /
057.C1_EMOT_VENERATE:venerate / 058.C1_EMOT_BEWILDERED:bewildered /
059.C1_EMOT_DISILLUSIONED:disillusioned /
060.C1_EMOT_APPREHENSIVE:apprehensive / 061.C1_COG_SYNTHESIZE:synthesize
/ 062.C1_COG_EXTRAPOLATE:extrapolate / 063.C1_COG_CRITIQUE:critique /
064.C1_COG_RECONCILE_IDEAS:reconcile ideas /
065.C1_COG_THEORIZE:theorize / 066.C1_COG_REFRAME:reframe /
067.C1_COG_DIFFERENTIATE:differentiate / 068.C1_COG_CONSTRUE:construe /
069.C1_COG_ANTICIPATE:anticipate / 070.C1_COG_APPRAISE:appraise /
071.C1_TIME_JUNCTURE:juncture / 072.C1_TIME_PRECEDENCE:precedence /
073.C1_TIME_CONTINUITY:continuity /
074.C1_TIME_SIMULTANEITY:simultaneity / 075.C1_TIME_LONGEVITY:longevity
/ 076.C1_TIME_CULMINATION:culmination /
077.C1_TIME_COMMENCEMENT:commencement / 078.C1_TIME_INCEPTION:inception
/ 079.C1_TIME_AFTERMATH:aftermath / 080.C1_TIME_INTERIM:interim /
081.C1_SPACE_INFRASTRUCTURE:infrastructure / 082.C1_SPACE_REALM:realm /
083.C1_SPACE_SPHERE:sphere / 084.C1_SPACE_JURISDICTION:jurisdiction /
085.C1_SPACE_LOCALITY:locality /
086.C1_SPACE_CONFIGURATION:configuration /
087.C1_SPACE_ALIGNMENT:alignment / 088.C1_SPACE_ORIENTATION:orientation
/ 089.C1_SPACE_TOPOLOGY:topology / 090.C1_SPACE_DOMAIN:domain /
091.C1_QUANT_MAGNITUDE:magnitude / 092.C1_QUANT_PREVALENCE:prevalence /
093.C1_QUANT_INCIDENCE:incidence / 094.C1_QUANT_FLUCTUATION:fluctuation
/ 095.C1_QUANT_ABUNDANCE:abundance / 096.C1_QUANT_SCARCITY:scarcity /
097.C1_QUANT_DISPARITY:disparity /
098.C1_QUANT_ACCUMULATION:accumulation /
099.C1_QUANT_ALLOCATION:allocation /
100.C1_QUANT_DISTRIBUTION:distribution /
101.C1_REL_NOTWITHSTANDING:notwithstanding /
102.C1_REL_PURSUANT_TO:pursuant to / 103.C1_REL_THEREBY:thereby /
104.C1_REL_WHENCE:whence / 105.C1_REL_WHEREBY:whereby /
106.C1_REL_ALBEIT:albeit / 107.C1_REL_HITHERTO:hitherto /
108.C1_REL_THEREIN:therein / 109.C1_REL_HERETO:hereto /
110.C1_REL_INASMUCH_AS:inasmuch as / 111.C1_STATE_AMBIGUOUS:ambiguous /
112.C1_STATE_COHERENT:coherent / 113.C1_STATE_INTRINSIC:intrinsic /
114.C1_STATE_PLAUSIBLE:plausible / 115.C1_STATE_ROBUST:robust /
116.C1_STATE_TANGIBLE:tangible / 117.C1_STATE_ARBITRARY:arbitrary /
118.C1_STATE_COMPREHENSIVE:comprehensive /
119.C1_STATE_METICULOUS:meticulous / 120.C1_STATE_FEASIBLE:feasible

**=== C2 (001~120) ===**

001.C2_MOVE_OSCILLATE:oscillate / 002.C2_MOVE_PERMEATE:permeate /
003.C2_MOVE_MEANDER:meander / 004.C2_MOVE_INTERSECT:intersect /
005.C2_MOVE_DIFFUSE:diffuse / 006.C2_MOVE_COALESCE:coalesce /
007.C2_MOVE_DISLOCATE:dislocate / 008.C2_MOVE_DISLODGE:dislodge /
009.C2_MOVE_DISENTANGLE:disentangle /
010.C2_MOVE_SUPERIMPOSE:superimpose / 011.C2_SENSE_ASCERTAIN:ascertain /
012.C2_SENSE_PERUSE:peruse / 013.C2_SENSE_DECIPHER:decipher /
014.C2_SENSE_DISAMBIGUATE:disambiguate /
015.C2_SENSE_EXPLICATE:explicate / 016.C2_SENSE_INTERROGATE:interrogate
/ 017.C2_SENSE_DIFFERENTIATE_NUANCE:differentiate nuance /
018.C2_SENSE_CRYSTALLIZE:crystallize / 019.C2_SENSE_UNRAVEL:unravel /
020.C2_SENSE_DETERMINE_VALIDITY:determine validity /
021.C2_COMM_EXPOUND:expound / 022.C2_COMM_DISCOURSE:discourse /
023.C2_COMM_REPUDIATE:repudiate / 024.C2_COMM_QUALIFY_STATEMENT:qualify
statement / 025.C2_COMM_DISPUTE:dispute /
026.C2_COMM_DISSECT_ARGUMENT:dissect argument /
027.C2_COMM_SUBMIT:submit / 028.C2_COMM_CHRONICLE:chronicle /
029.C2_COMM_CONTEXTUALIZE_ARGUMENT:contextualize argument /
030.C2_COMM_VINDICATE:vindicate / 031.C2_EXIST_SUBSIST:subsist /
032.C2_EXIST_PREDOMINATE:predominate / 033.C2_EXIST_EPITOMIZE:epitomize
/ 034.C2_EXIST_PRECLUDE:preclude / 035.C2_EXIST_SUPERSEDE:supersede /
036.C2_EXIST_EXACERBATE:exacerbate / 037.C2_EXIST_MITIGATE:mitigate /
038.C2_EXIST_CIRCUMVENT:circumvent / 039.C2_EXIST_CONSTITUTE:constitute
/ 040.C2_EXIST_EMBODY:embody / 041.C2_ACT_CATALYZE:catalyze /
042.C2_ACT_RECONFIGURE:reconfigure / 043.C2_ACT_RECALIBRATE:recalibrate
/ 044.C2_ACT_HARNESS:harness / 045.C2_ACT_OPTIMIZE:optimize /
046.C2_ACT_INSTIGATE:instigate / 047.C2_ACT_EXPEDITE:expedite /
048.C2_ACT_CURATE:curate / 049.C2_ACT_AMELIORATE:ameliorate /
050.C2_ACT_REPURPOSE:repurpose / 051.C2_EMOT_REPINE:repine /
052.C2_EMOT_RELINQUISH:relinquish / 053.C2_EMOT_EMBRACE_CHANGE:embrace
change / 054.C2_EMOT_DISDAIN:disdain / 055.C2_EMOT_LAMENT:lament /
056.C2_EMOT_EXULT:exult / 057.C2_EMOT_REVERENCE:reverence /
058.C2_EMOT_MELANCHOLIC:melancholic /
059.C2_EMOT_DISPASSIONATE:dispassionate / 060.C2_EMOT_RESOLUTE:resolute
/ 061.C2_COG_RECONCEPTUALIZE:reconceptualize /
062.C2_COG_INTERPOLATE:interpolate / 063.C2_COG_DELIBERATE:deliberate /
064.C2_COG_POSTULATE:postulate / 065.C2_COG_RECONSTRUCT:reconstruct /
066.C2_COG_DELINEATE_CAUSALITY:delineate causality /
067.C2_COG_INTERCONNECT:interconnect /
068.C2_COG_SYSTEMATIZE:systematize /
069.C2_COG_QUALIFY_CONCLUSION:qualify conclusion /
070.C2_COG_REEVALUATE:reevaluate / 071.C2_TIME_EPOCH:epoch /
072.C2_TIME_CHRONOLOGY:chronology / 073.C2_TIME_TEMPORALITY:temporality
/ 074.C2_TIME_RETROSPECT:retrospect / 075.C2_TIME_PROSPECT:prospect /
076.C2_TIME_CONVERGENCE_POINT:convergence point /
077.C2_TIME_INFLECTION_POINT:inflection point /
078.C2_TIME_SEQUENCING:sequencing /
079.C2_TIME_RECURRING_CYCLE:recurring cycle /
080.C2_TIME_TIMEFRAME:timeframe / 081.C2_SPACE_MATRIX:matrix /
082.C2_SPACE_CONTINUUM:continuum /
083.C2_SPACE_CONSTELLATION:constellation /
084.C2_SPACE_HIERARCHY:hierarchy / 085.C2_SPACE_INTERFACE:interface /
086.C2_SPACE_NEXUS:nexus / 087.C2_SPACE_PARADIGM:paradigm /
088.C2_SPACE_ECOSYSTEM:ecosystem /
089.C2_SPACE_ARCHITECTURE:architecture /
090.C2_SPACE_LANDSCAPE:landscape /
091.C2_QUANT_PROLIFERATION:proliferation /
092.C2_QUANT_CONCENTRATION:concentration /
093.C2_QUANT_DEPLETION:depletion / 094.C2_QUANT_SATURATION:saturation /
095.C2_QUANT_VARIABILITY:variability /
096.C2_QUANT_DISPERSION:dispersion /
097.C2_QUANT_GRANULARITY:granularity /
098.C2_QUANT_MULTIPLICITY:multiplicity /
099.C2_QUANT_PREDOMINANCE:predominance /
100.C2_QUANT_EQUILIBRIUM:equilibrium / 101.C2_REL_VIS_A_VIS:vis-à-vis /
102.C2_REL_CONTINGENT_ON:contingent on /
103.C2_REL_CORRESPONDING_TO:corresponding to / 104.C2_REL_IN_LIGHT_OF:in
light of / 105.C2_REL_BY_VIRTUE_OF:by virtue of /
106.C2_REL_IN_CONJUNCTION_WITH:in conjunction with /
107.C2_REL_FORTHWITH:forthwith / 108.C2_REL_HENCEFORTH:henceforth /
109.C2_REL_THEREUPON:thereupon / 110.C2_REL_PURPORTEDLY:purportedly /
111.C2_STATE_UBIQUITOUS:ubiquitous / 112.C2_STATE_PERIPHERAL:peripheral
/ 113.C2_STATE_SALIENT:salient / 114.C2_STATE_ELOQUENT:eloquent /
115.C2_STATE_EQUANIMOUS:equanimous /
116.C2_STATE_INDEFATIGABLE:indefatigable /
117.C2_STATE_INEXORABLE:inexorable / 118.C2_STATE_OSTENSIBLE:ostensible
/ 119.C2_STATE_PERFUNCTORY:perfunctory /
120.C2_STATE_RECONDITE:recondite

## 3.8 Registry Self-Verification (already applied, reference only)

1. 120 IDX entries confirmed per level, no gaps. 2. No duplicate ConceptIDs within a level. 3. Domain balance confirmed (10 per domain × 12 domains). 4. Culture-specific target_words flagged for downstream 🚩 CULTURAL review at the example-generation stage. These checks were already passed when Section 3 was locked; STEP 1~2 below assume this registry is correct and do not re-run them.

# 4. Internal Processing Order (Output Prohibited)

Never output intermediate results within this manual's own internal steps (STEP 1 declarations are not shown standalone). Only the final TARGET_BLOCK + stage-1 status (Section 5) is output.

## STEP 1 — Batch Extraction and WORD_SPEC Declaration

Extract exactly 5 consecutive IDX items corresponding to BATCH_ID from the selected LEVEL's list in Section 3.7, using the calculation method given in Section 3. All 5 items belong to the same LEVEL by construction; a BATCH_ID outside 001~024 is a fatal input error.

Source-purity: all 5 target_word values must originate verbatim from the Section 3.7 registry; no external or newly generated word is permitted. IDX / ConceptID / LEVEL / target_word must never be changed or reordered.

For each of the 5 extracted words, declare a WORD_SPEC.

**WORD_SPEC Fields (Required):**

TARGET_WORD: target_word verbatim, exactly as locked in Section 3.7 (no changes permitted at any later step)

POS: part of speech (verb / noun / adjective / adverb / preposition / conjunction, etc.)

DOMAIN: derived from the ConceptID's domain segment (Section 3.6) — carried through, not re-derived downstream

POLYSEMY_FLAG: YES / NO. If YES: USED_MEANING = {fixed single English meaning}, EXCLUDED_MEANINGS = {remaining meanings} (Section 3.2)

CORE: always equal to TARGET_WORD (Section 3.4)

MEANING_ZONE: 1 to 3 natural English expressions in the same semantic zone as CORE, MEANING_ZONE[0] = CORE, per the Meaning Zone Rules (Section 3.4)

CULTURAL_FLAG: YES / NO — set YES if the word's natural example situations tend toward a culture-specific context (Section 3.3), for downstream author awareness; does not block generation, only flags for native review.

**WORD_SPEC Validation (any failure → FAIL → redeclare):**

Any field left blank. POLYSEMY_FLAG = YES without USED_MEANING specified. TARGET_WORD not matching the Section 3.7 registry entry exactly. MEANING_ZONE violating any of the 10 Meaning Zone Rules (Section 3.4) — reselect, do not proceed.

## STEP 2 — Target-Language Example Generation

Use WORD_SPEC (all 5) as the absolute constraint.

**Block Composition (5 total, one per extracted word):** each block = 1 word (target + en, mirror) + exactly 3 examples, in this fixed order: (1) declarative, (2) negative, (3) question.

**EN Generation Rules:**

Rule EN-01 — Subject always required (LANG_GROUP: B): English requires an explicit subject in all example sentences; subject omission is never allowed.

Rule EN-02 — A1/A2 register: use contractions naturally (I'm / she doesn't / they're / it's); avoid formal written register (I am not / She is not / They are not) in casual A1/A2 sentences. B1 and above: both contracted and full forms acceptable.

Rule EN-03 — Negation standard: A1/A2 use contracted negation (don't / doesn't / isn't / aren't / can't); avoid do not / does not / is not at these levels.

Rule EN-04 — Level-appropriate length: A1: 4~7 words, high-frequency daily vocabulary only, no complex grammar. A2: 5~8 words, basic grammar allowed. B1: 6~9 words, connected sentences allowed. B2 and above: no strict restriction.

Rule EN-05 — Core-only constraint (replaces v1.1's FAMILY-range rule and v2.0's core-or-meaning_zone rule): every example uses ONLY core (Section 3.4). No meaning_zone[1:] expression, and no expression outside meaning_zone, may appear in any example. If core cannot be made to read naturally for a candidate situation, first try a different situation for that example (this manual controls the situation and is free to change it); only if no situation swap resolves the conflict, output that example as "FLAG: <short reason>" instead of forcing an unnatural sentence — see Section 5.

**Content Rules:**

① core must appear in inflected form in the example (e.g. go up → "She goes up the stairs."). meaning_zone[1:] entries are glossary-only and are never substituted here, even where they would read more smoothly (Section 3.4).

② Example situation diversity across all 5 blocks: same object/location within one block → max 2 occurrences; same situation repeated 3+ times across all 5 blocks → forbidden; mix indoor/outdoor locations; mix 1st/2nd/3rd person subjects. When selecting a situation, also weigh the situation-selection risk guidance in Section 3.4 — prefer situations whose natural expression is likely to transfer across the 6 helper languages.

③ Culturally neutral situations preferred (Section 3.3); culture-specific situations → record 🚩 CULTURAL flag if used.

④ Context Ambiguity prevention: e.g. "go out with a friend" risks a romantic-nuance misread → replace with an unambiguous situation.

**Mirror Rule (en):** word.en = word.target exactly (core and meaning_zone identical); examples[].en = examples[].target exactly, sentence for sentence, in every block. Because target = English, there is no independent en generation step — en is copied, not translated. Because word.target's own examples are already core-only (Rule EN-05), the en mirror inherits that compliance automatically.

## Stage-1 QA (self-check before output)

TS-01: 5 blocks extracted, all same LEVEL. TS-02: every WORD_SPEC field populated, no blanks. TS-03: every MEANING_ZONE satisfies all 10 Meaning Zone Rules (Section 3.4). TS-04: every example uses ONLY core — zero meaning_zone[1:] expressions and zero outside-zone expressions present anywhere; where core did not fit naturally, was a different situation tried before resorting to FLAG (Rule EN-05)? TS-05: A1/A2 negation uses contractions. TS-06: every example has an explicit subject. TS-07: example order is declarative → negative → question in every block. TS-08: word.en/examples[].en are an exact mirror of word.target/examples[].target in every block. TS-09: no culture-specific situation used without a recorded 🚩 CULTURAL flag. TS-10: no romantic-nuance or other semantic-ambiguity risk left unresolved. TS-11: for any situation chosen, was the situation-selection risk guidance (Section 3.4) considered — body-part idioms, directional/manner-specific motion verbs, and copula-only expressions in particular?

Any TS failure → correct and re-check before output; do not output a failing TARGET_BLOCK.

# 5. Final Output Format

Output ONLY:

{TARGET_BLOCK JSON}
STAGE1_STATUS: PASS
FLAG: {content} or NONE

Any example value inside TARGET_BLOCK may itself be the literal string "FLAG: <short reason>" per Rule EN-05/Section 3.4, when core could not be used naturally for that situation even after trying an alternative situation. This is distinct from the batch-level "FLAG: {content} or NONE" line above, which continues to report CULTURAL flags and other batch-level notes; an example-level FLAG does not by itself require STAGE1_STATUS: FAIL, but the batch-level FLAG line should mention it so Manual B treats that example as requiring human review rather than merging it silently.

If any Stage-1 QA item fails after correction attempts, output STAGE1_STATUS: FAIL with the specific TS code(s) instead of the JSON, and do not proceed to Manual B.

# 6. TARGET_BLOCK JSON Template (Structure Fixed)

This is a **partial** JSON — only target and en columns. Manual B merges this with the 7 translation-prompt outputs to build the final 8-column runtime JSON (Section 6 of Manual B).

```
{
  "meta": { "series": "vocabulary", "level": "", "id": "" },
  "title": { "target": "", "en": "" },
  "blocks": [
    {
      "id": "block_001",
      "word": {
        "target": { "core": "", "meaning_zone": [""] },
        "en": { "core": "", "meaning_zone": [""] }
      },
      "examples": [
        { "target": "", "en": "" },
        { "target": "", "en": "" },
        { "target": "", "en": "" }
      ]
    }
    // repeat for block_002 ~ block_005, identical structure
  ]
}
```

meta.series = "vocabulary" (fixed) · meta.level = lowercase level string (e.g. "a1") · meta.id = 3-digit BATCH_ID (e.g. "001") · blocks = exactly 5 total · examples = exactly 3 per block, in fixed order declarative → negative → question · word.en and examples[].en are exact mirrors of word.target and examples[].target.

# 7. Absolutely Prohibited

Non-JSON text output outside the format specified in Section 5.

Changing word.target.core (must always equal TARGET_WORD from Section 3.7) or making word.en differ from word.target in any way.

Changing meta or title after STEP 1.

Changing block count (5 fixed) or example count (3 per block, fixed).

Changing structure or key order.

English formal negatives in A1/A2 casual sentences (I am not / She is not / They are not).

Any target_word not sourced verbatim from the Section 3.7 locked registry.

Non-English target_word at any stage.

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

## [v3.0 — Core-Only Examples + FLAG Escape Valve]

Replaces v2.0. Examples Generation Rule (Section 3.4) and Rule EN-05 (STEP 2) changed from "core or any meaning_zone expression" to "core only" — meaning_zone[1:] is now glossary/reference-only and is never used in an example, in this manual or in any of the 7 translation prompts. Meaning Zone Rules gained Rule 10 (meaning_zone[1:] never appears in an example). Added a FLAG escape valve (Section 3.4, Rule EN-05, Section 5): where core cannot be made natural for a candidate situation, this manual's own freedom to choose a different situation is the primary fix; only if that fails does the example field become "FLAG: <short reason>", distinct from the pre-existing batch-level FLAG line. Added situation-selection risk guidance (Section 3.4, Content Rule ②, TS-11): situations built on body-part idioms, directional/manner-specific motion verbs, or copula-only expressions are flagged as more likely to cause downstream core-mismatch in one or more of the 6 helper languages, and should be avoided or chosen more carefully. TS-03/TS-04 updated to reflect the 10-rule count and the core-only requirement respectively. Content Rule ① updated to name core specifically rather than "target_word or its meaning_zone equivalent." Section 7 (Absolutely Prohibited) updated to prohibit meaning_zone[1:] usage in examples and forced/unflagged core substitution, in place of the old blanket "expression outside meaning_zone" wording. This document is now the sister document to kr_voca_manual_A_target_generation_v3.md — both apply the identical core-only + FLAG + situation-risk design, differing only in target language and its LANG_GROUP-specific rules (Section 3.5/Rule EN-01~04 here vs. Rule KR-01~05 there).

## [v2.0 — Pipeline Split + CORE/MEANING_ZONE]

Split from the v1.1 single consolidated manual into a 2-manual + 7-prompt pipeline (9 documents). This document (Manual A) now covers only registry extraction, WORD_SPEC declaration, and target/en generation — it no longer declares PIVOT_ES/FR/PT/KR/JP/ZH or SEMANTIC_FAMILY (both retired) and no longer performs JSON merge, correction, or final QA/scoring (moved to Manual B).

Replaced the v1.1 Pivot Lock Rule (Section 3.4), Anti-Translationese Composite Principle (Section 3.4.1), and Semantic Family Rule (Section 3.5) with a single Core & Meaning Zone Rule (this document's Section 3.4), carrying an explicit, numbered Meaning Zone Rules list (max 3 / min 1 / first = core / no forced filling / duplicates allowed to stay empty / same zone only / no expansion or narrowing / no POS shift).

word/example schema changed from `"target": "..."` (plain string) to `"target": { "core": "...", "meaning_zone": [...] }` for the word object; example strings remain plain strings.

Section 10 (Target-Language Expansion Guide) moved out of this manual — see Manual B, Section 10, since the universal 7-translation-prompt design (not this manual) is what generalizes across future target languages.
