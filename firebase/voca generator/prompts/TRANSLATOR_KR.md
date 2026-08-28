# Universal Translation Prompt - Korean (kr) - v3

This prompt is target-language-agnostic. It is reused, unmodified, across every vocabulary manual in this system (EN-target, ES-target, JP-target, ZH-target, and so on). Only the input changes from one run to the next; this document never changes.

# 1. Purpose

Given one batch's target-language word data (5 blocks, each with id, core, meaning_zone, POS, and 3 example sentences), produce this batch's Korean column: word.kr (core plus meaning_zone) and examples[].kr (3 strings, same order as the target) for every block. Output is a single TRANSLATION_BLOCK JSON object consumed by Manual B (Merge and Final QA) - never a final deliverable by itself.

# 2. Mirror vs. Translation Branch

Check the run's TARGET_LANGUAGE value first.

If TARGET_LANGUAGE = Korean: this is a MIRROR run. word.kr.core = word.target.core exactly; word.kr.meaning_zone = word.target.meaning_zone exactly, entry for entry; examples[].kr = examples[].target exactly, sentence for sentence. Because the target's own examples must already be core-only (per the target generation manual), the mirror inherits that compliance automatically - no separate check needed here.

If TARGET_LANGUAGE is any other language: this is a TRANSLATION run. Proceed to Sections 3 to 7 below.

# 3. Input Received (Translation run only)

The batch id (e.g. "001"), and per block: the block's own id (e.g. "block_001"), TARGET_LANGUAGE name, the target word's POS, DOMAIN, POLYSEMY_FLAG (plus USED_MEANING/EXCLUDED_MEANINGS if applicable), CULTURAL_FLAG, the target language's own core plus meaning_zone (as plain glosses so the intended concept is clear, not as literal strings to copy), and the 3 target-language example sentences, provided as situational context only. Each block's id is carried through unchanged into the output - never renumbered, dropped, or invented.

# 4. Core and Meaning Zone Declaration

Declare, independently in Korean, from the target concept itself - never by chain-translating through the specific wording of the target-language example sentences, and never through English as an intermediate hub even when English happens to be involved elsewhere in the pipeline.

core: the single most direct, natural Korean expression for this concept, matching POS, and selected as the closest 1:1 equivalent to the target language's own core - same register, same part of speech, same semantic scope. Do not pick a broader, narrower, or merely more-common expression instead; alignment with the target's core takes priority over general frequency.

meaning_zone: an ordered list of 1 to 3 natural Korean expressions occupying the exact same semantic zone as core. meaning_zone[0] is always identical to core. meaning_zone[1:] exists for glossary/reference purposes only - it documents related expressions a learner might also encounter. It is never used in any example sentence, in this language or any other; see Section 6.

An earlier version of this prompt let each example pick whichever meaning_zone entry sounded most natural in context. That produced Korean examples that never independently reused the same core word - learners could not recover the target word by reading the examples, and downstream scoring had no reliable signal to check whether examples matched their word entry. The current design keeps meaning_zone as a richer glossary (up to 3 same-zone variants) but requires every example to be built around core specifically; if core cannot be made to sound natural in a given situation, the fix is to flag that situation (Section 6), not to quietly substitute a different meaning_zone entry.

Meaning Zone Rules (apply identically in every language):
1. meaning_zone contains a maximum of 3 expressions.
2. At least 1 expression is required.
3. meaning_zone[0] must always be identical to core.
4. If no additional natural semantic variant exists, do not invent one artificially - naturalness has priority over quantity.
5. Empty slots beyond the first are allowed; the array length may be 1, 2, or 3.
6. All expressions must belong to the same semantic zone.
7. Duplicate expressions are prohibited.
8. Expressions that broaden or narrow the original meaning are prohibited.
9. Expressions that shift part of speech are prohibited.
10. meaning_zone[1:] entries are reference-only and must never appear in an example sentence.

# 5. Regional Standard - Standard Korean (ko-KR)

Standard Korean (표준어), Seoul/Gyeonggi standard. No regional dialect (사투리) vocabulary or sentence endings. No archaic or purely literary forms as the taught rendering. Avoid translation-influenced phrasing (번역투) - the example must read as something a Korean speaker would naturally say, not a word-for-word rendering of the source sentence's structure. Register must stay internally consistent within a single example (do not mix 해요체 and 합니다체 mid-sentence). Subject-drop is natural and preferred in Korean, even when the target language (e.g. English) requires an explicit subject - do not force an unnatural explicit subject into Korean just because the target language has one.

# 6. Example Translation Rule

Translate each of the 3 example sentences from the target-language concept (core/meaning_zone/situation), never from the surface wording of the target-language sentence word for word, and never by first translating into English and then into Korean. Preserve the declarative, negative, question order. Preserve the situation but re-express it with natural Korean particle usage, word order, and a single consistent register; adjust particles, word order, or tense freely to achieve naturalness.

Use ONLY core in every example. meaning_zone[1:] must never appear in an example - those entries are glossary-only (Section 4). If particle, word-order, or tense adjustment cannot make core sound natural in this situation - naturalness and core genuinely conflict for this specific example - do not force an unnatural, awkward, or semantically incorrect sentence to include core, and do not silently swap in a different word to dodge the conflict (e.g. do not shorten 말하다-based phrasing into a generic phrase that drops 말하다 entirely just because it reads more smoothly). Instead, output the literal string "FLAG: <short reason>" in place of that example's translation and move on to the next example. A flagged example signals that this situation needs reconsideration upstream (a different situation for this block, or a different core choice) - it is not this step's job to force a fix.

Reading the Korean example alone must allow recovery of the underlying concept (reverse reconstruction) - this is only possible when core is actually present.

# 7. Output Format

Output exactly one JSON object for the whole batch - not 5 separate fragments. Every block's "id" must be copied verbatim from that block's input id.

```
{
  "id": "<batch id, copied from input>",
  "lang": "kr",
  "blocks": [
    {
      "id": "<block id, copied from input, e.g. block_001>",
      "word": { "kr": { "core": "", "meaning_zone": [""] } },
      "examples": [
        { "kr": "" },
        { "kr": "" },
        { "kr": "" }
      ]
    },
    { "id": "<block_002>", "word": { "kr": { "core": "", "meaning_zone": [""] } }, "examples": [ { "kr": "" }, { "kr": "" }, { "kr": "" } ] },
    { "id": "<block_003>", "word": { "kr": { "core": "", "meaning_zone": [""] } }, "examples": [ { "kr": "" }, { "kr": "" }, { "kr": "" } ] },
    { "id": "<block_004>", "word": { "kr": { "core": "", "meaning_zone": [""] } }, "examples": [ { "kr": "" }, { "kr": "" }, { "kr": "" } ] },
    { "id": "<block_005>", "word": { "kr": { "core": "", "meaning_zone": [""] } }, "examples": [ { "kr": "" }, { "kr": "" }, { "kr": "" } ] }
  ]
}
```
This single object covers all 5 blocks of the batch. This is a TRANSLATION_BLOCK fragment; Manual B (merge.py) merges it into the final 8-column JSON, matching blocks by "id".

Any example value may instead be the literal string "FLAG: <short reason>" per Section 6, when core could not be used naturally for that situation. Manual B / QA treats FLAG entries as requiring human review, never as a valid translation to merge silently.

# 8. Self-Check Before Output

Is this a mirror run or translation run - was the correct branch (Section 2) followed? Does meaning_zone satisfy all 10 rules? Does every example use ONLY core, with zero meaning_zone[1:] expressions present anywhere? Was FLAG used, instead of a forced or unnatural sentence, wherever core genuinely did not fit (after trying particle/word-order/tense adjustment)? Is this language's core the closest direct 1:1 equivalent to the target's core - same register, POS, and semantic scope - rather than just a same-zone alternative chosen for convenience? Is the register consistent within each example (no 해요체/합니다체 mixing)? Is there any 사투리 or 번역투? Can the concept be recovered from each (non-flagged) example alone? Is the output a single JSON object (not 5 separate fragments) with "id", "lang", and a "blocks" array? Does every block in "blocks" carry the same "id" as its corresponding input block, unchanged?

# 9. Absolutely Prohibited

Chain-translating through the target language's (or English's) literal sentence wording instead of its meaning. Inventing a meaning_zone entry not independently natural. Using any meaning_zone[1:] expression anywhere in an example. Forcing core into an example where it produces an unnatural or incorrect sentence, instead of using FLAG. Silently substituting a different word to avoid a naturalness conflict without flagging it, when a particle/word-order/tense adjustment could have been tried first. 사투리 (regional dialect) or register-mixing within one example. 번역투 (translation-influenced phrasing). Renumbering, omitting, or inventing block ids. Splitting the batch into multiple separate JSON objects instead of one "blocks" array. Outputting anything beyond the Section 7 JSON format.
