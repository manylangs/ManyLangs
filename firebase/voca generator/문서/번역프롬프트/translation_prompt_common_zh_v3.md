# Universal Translation Prompt - Chinese, Simplified (zh) - v3

This prompt is target-language-agnostic. It is reused, unmodified, across every vocabulary manual in this system (EN-target, ES-target, JP-target, ZH-target, and so on). Only the input changes from one run to the next; this document never changes.

# 1. Purpose

Given one batch's target-language word data (5 blocks, each with id, core, meaning_zone, POS, and 3 example sentences), produce this batch's Chinese column: word.zh (core plus meaning_zone) and examples[].zh (3 strings, same order as the target) for every block. Output is a single TRANSLATION_BLOCK JSON object consumed by Manual B (Merge and Final QA) - never a final deliverable by itself.

# 2. Mirror vs. Translation Branch

Check the run's TARGET_LANGUAGE value first.

If TARGET_LANGUAGE = Chinese: this is a MIRROR run. word.zh.core = word.target.core exactly; word.zh.meaning_zone = word.target.meaning_zone exactly, entry for entry; examples[].zh = examples[].target exactly, sentence for sentence. Because the target's own examples must already be core-only (per the target generation manual), the mirror inherits that compliance automatically - no separate check needed here.

If TARGET_LANGUAGE is any other language: this is a TRANSLATION run. Proceed to Sections 3 to 7 below.

# 3. Input Received (Translation run only)

The batch id (e.g. "001"), and per block: the block's own id (e.g. "block_001"), TARGET_LANGUAGE name, the target word's POS, DOMAIN, POLYSEMY_FLAG (plus USED_MEANING/EXCLUDED_MEANINGS if applicable), CULTURAL_FLAG, the target language's own core plus meaning_zone (as plain glosses so the intended concept is clear, not as literal strings to copy), and the 3 target-language example sentences, provided as situational context only. Each block's id is carried through unchanged into the output - never renumbered, dropped, or invented.

# 4. Core and Meaning Zone Declaration

Declare, independently in Chinese, from the target concept itself - never by chain-translating through the specific wording of the target-language example sentences, and never through English as an intermediate hub even when English happens to be involved elsewhere in the pipeline:

core: the single most direct, natural Chinese expression for this concept, matching POS, and selected as the closest 1:1 equivalent to the target language's own core - same register, same part of speech, same semantic scope. Do not pick a broader, narrower, or merely more-common expression instead; alignment with the target's core takes priority over general frequency.

meaning_zone: an ordered list of 1 to 3 natural Chinese expressions occupying the exact same semantic zone as core. meaning_zone[0] is always identical to core. meaning_zone[1:] exists for glossary/reference purposes only - it documents related expressions a learner might also encounter. It is never used in any example sentence, in this language or any other; see Section 6.

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

# 5. Regional Standard - Mainland Standard Mandarin (zh-CN)

Mainland Standard Mandarin (现代标准汉语/普通话). Simplified characters only (简体字) - Traditional characters (繁体字) are never used, anywhere in the zh column, including core and meaning_zone entries. No Cantonese, Hokkien, or Taiwan Mandarin-specific vocabulary or function words. Measure words (量词) must be grammatically correct for the noun in question. Full-width punctuation is used throughout. Avoid Classical/Literary Chinese (文言文) register below C1.

# 6. Example Translation Rule

Translate each of the 3 example sentences from the target-language concept (core/meaning_zone/situation), never from the surface wording of the target-language sentence word for word, and never by first translating into English and then into Chinese. Preserve the declarative, negative, question order. Preserve the situation but re-express it in natural Mainland Mandarin word order and register, with correct measure words and full-width punctuation.

Use ONLY core in every example. meaning_zone[1:] must never appear in an example - those entries are glossary-only (Section 4). If a situation genuinely cannot be expressed naturally while using core - naturalness and core conflict for this specific example - do not force an unnatural, awkward, or semantically incorrect sentence to include core, and do not silently swap in a different word to dodge the conflict. Instead, output the literal string "FLAG: <short reason>" in place of that example's translation and move on to the next example. A flagged example signals that this situation needs reconsideration upstream (a different situation for this block, or a different core choice) - it is not this step's job to force a fix.

Reading the Chinese example alone must allow recovery of the underlying concept (reverse reconstruction) - this is only possible when core is actually present.

# 7. Output Format

Output exactly one JSON object for the whole batch - not 5 separate fragments. Every block's "id" must be copied verbatim from that block's input id.

```
{
  "id": "<batch id, copied from input>",
  "lang": "zh",
  "blocks": [
    {
      "id": "<block id, copied from input, e.g. block_001>",
      "word": { "zh": { "core": "", "meaning_zone": [""] } },
      "examples": [
        { "zh": "" },
        { "zh": "" },
        { "zh": "" }
      ]
    },
    { "id": "<block_002>", "word": { "zh": { "core": "", "meaning_zone": [""] } }, "examples": [ { "zh": "" }, { "zh": "" }, { "zh": "" } ] },
    { "id": "<block_003>", "word": { "zh": { "core": "", "meaning_zone": [""] } }, "examples": [ { "zh": "" }, { "zh": "" }, { "zh": "" } ] },
    { "id": "<block_004>", "word": { "zh": { "core": "", "meaning_zone": [""] } }, "examples": [ { "zh": "" }, { "zh": "" }, { "zh": "" } ] },
    { "id": "<block_005>", "word": { "zh": { "core": "", "meaning_zone": [""] } }, "examples": [ { "zh": "" }, { "zh": "" }, { "zh": "" } ] }
  ]
}
```
This single object covers all 5 blocks of the batch. This is a TRANSLATION_BLOCK fragment; Manual B (merge.py) merges it into the final 8-column JSON, matching blocks by "id".

Any example value may instead be the literal string "FLAG: <short reason>" per Section 6, when core could not be used naturally for that situation. Manual B / QA treats FLAG entries as requiring human review, never as a valid translation to merge silently.

# 8. Self-Check Before Output

Is this a mirror run or translation run - was the correct branch (Section 2) followed? Does meaning_zone satisfy all 10 rules? Does every example use ONLY core, with zero meaning_zone[1:] expressions present anywhere? Was FLAG used, instead of a forced or unnatural sentence, wherever core genuinely did not fit? Is this language's core the closest direct 1:1 equivalent to the target's core - same register, POS, and semantic scope - rather than just a same-zone alternative chosen for convenience? Are all characters Simplified, with no Traditional characters anywhere? Is full-width punctuation used? Are measure words correct? Is there any Cantonese, Hokkien, or Taiwan-Mandarin-specific vocabulary? Can the concept be recovered from each (non-flagged) example alone? Is the output a single JSON object (not 5 separate fragments) with "id", "lang", and a "blocks" array? Does every block in "blocks" carry the same "id" as its corresponding input block, unchanged?

# 9. Absolutely Prohibited

Chain-translating through the target language's (or English's) literal sentence wording instead of its meaning. Inventing a meaning_zone entry not independently natural. Using any meaning_zone[1:] expression anywhere in an example. Forcing core into an example where it produces an unnatural or incorrect sentence, instead of using FLAG. Silently substituting a different word to avoid a naturalness conflict without flagging it. Any Traditional Chinese character anywhere in the zh column. Cantonese, Hokkien, or Taiwan Mandarin-specific vocabulary. Incorrect measure words. Half-width punctuation. Renumbering, omitting, or inventing block ids. Splitting the batch into multiple separate JSON objects instead of one "blocks" array. Outputting anything beyond the Section 7 JSON format.
