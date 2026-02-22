# OPP Voice Control — Implementation Checklist

Implementation checklist for the behaviour described in **docs/OPP_VOICE_CONTROL_DOMAIN.md**. Use this document to manage development and verify completeness of the voice control feature in the Game Engine.

**Prerequisites:** GE routine execution flow (PlaySessionPage, session run, routines/steps, visit collection, SegmentGrid, submit visit → dart_scores). No backend or `@opp/data` schema changes required for core voice; same data path as manual.

**Scope:** Voice control is implemented entirely in `apps/web`. Manual input remains primary; voice is additive. Unsupported or failed voice must not block session completion.

---

## 1. Voice recognition (Web Speech API)

### 1.1 Browser support and secure context

- [x] **Support check:** Expose `isSupported` only when `window.isSecureContext` is true and `window.SpeechRecognition` or `window.webkitSpeechRecognition` is present.
- [x] **HTTPS:** Document that HTTPS (secure context) is required for the Web Speech API and microphone access.
- [x] **Fallback UI:** When `!isSupported`, show a clear fallback message (e.g. “Voice not supported in this browser; use manual input below.”) and ensure manual controls remain fully usable.
- [x] **Supported browsers:** Document supported browsers (e.g. Chrome, Edge (Chromium), Safari desktop/iOS where available) and any known limitations.

**Location:** Hook (e.g. `apps/web/src/hooks/useVoiceRecognition.ts`).

### 1.2 Recognition lifecycle

- [x] **One-shot recognition:** Use single-utterance mode (e.g. `continuous: false`, `interimResults: false`); one recognition result per start.
- [x] **Language:** Set recognition language (e.g. `lang: 'en-GB'` or product choice).
- [x] **Events:** Handle `onresult` (transcript), `onnomatch`, `onerror` (e.g. `not-allowed` → user-friendly message), `onend`.
- [x] **Status:** Expose a status: e.g. `'idle' | 'listening' | 'result' | 'no-match' | 'error' | 'unsupported'`.
- [x] **Methods:** Provide `startListening()`, `stopListening()` (or `abort()`), and a way to consume the result once (e.g. `consumeResult()`) so the same transcript is not applied twice.
- [x] **Error messages:** Map `error === 'not-allowed'` to a clear message (e.g. “Microphone access denied. Use manual input or allow the microphone.”); surface other errors without exposing internals.

**Location:** `apps/web/src/hooks/useVoiceRecognition.ts` (or equivalent).

### 1.3 Tests (optional for hook)

- [x] **Unit/behavior:** If the hook is tested in isolation, cover: supported vs unsupported context, start → result → consume, no-match, error. Otherwise document that coverage is via integration in PlaySessionPage. *(Coverage is via integration in PlaySessionPage; hook JSDoc documents behaviour.)*

---

## 2. Utterance mapping (transcript → segment code)

**Domain:** The player speaks **only absolute outcomes** (e.g. Single 20, 20, Double 16, Treble 5, 25, Bull, Miss). The system does **not** cater for “hit”, “miss”, or any other implicit outcome.

### 2.1 Mapping rules

- [x] **Segment names and codes only:** Map spoken segment names and codes to canonical codes: e.g. “Single 20”, “S20”, “single 20” → `'S20'`; “Double 16”, “D16” → `'D16'`; “Treble 5”, “T5” → `'T5'`; “25”, “Bull” / “bullseye” → `'25'`, `'Bull'`; “Miss” → `'M'`. Use existing `normaliseSegment` and `ALL_SEGMENT_CODES` where applicable.
- [x] **Optional bare number:** In singles context, bare number (e.g. “20”) may map to Single 20 (`'S20'`) when step target or context implies singles; document behaviour.
- [x] **Unrecognised:** Return `null` so the UI can show “I didn’t catch that” and offer retry / manual. Do **not** map “hit”, “miss”, “yes”, “no”, or other implicit outcomes; only absolute segment names/codes.
- [x] **Signature:** Pure function, e.g. `voiceTextToSegment(text: string, stepTarget: string): string | null`. Same output format as manual grid (segment code or M).
- [x] **Full visit:** `parseVisitFromTranscript(transcript, stepTarget, visitSize)` — split by comma and " and "; map each part to segment (bare numbers 1–20 → S1–S20); return array of length visitSize or null.

**Location:** `apps/web/src/utils/voiceToSegment.ts` (or equivalent); `apps/web/src/constants/segments.ts` for normalisation and constants.

### 2.2 Tests for mapping

- [x] **Segment names/codes:** “Single 20”, “S20”, “single 20”, “Double 8”, “D16”, “Treble 5”, “T5”, “25”, “Bull”, “Miss” → correct canonical code.
- [x] **Optional bare number:** If supported, “20” with step target S20 → `'S20'`.
- [x] **Empty/whitespace:** Return null.
- [x] **Unknown text:** Return null (no silent mis-mapping). Explicitly do **not** accept “hit”, “miss”, “yes”, “no” as segment outcomes.

**Location:** `apps/web/src/utils/voiceToSegment.test.ts` (or equivalent).

---

## 3. GE integration (PlaySessionPage)

### 3.1 Wiring voice into visit flow

- [x] **Hook usage:** In the running phase, use the voice recognition hook (e.g. `useVoiceRecognition()`).
- [x] **Apply result:** When status is “result”, consume the transcript. Parse full visit via `parseVisitFromTranscript(transcript, step.target, N)`; if array of N segments, add all to visit (same path as manual), then speak read-back “You scored 20, Treble 5, 1”. If transcript is “repeat”, re-speak target and restart listening. Otherwise no-match. One voice result = one full visit.
- [x] **No double-apply:** Use a single-consumption pattern (e.g. `consumeResult()`) so the same transcript is not applied twice.
- [x] **Phase/step safety:** Only process voice results when phase is “running” and current step/routine are valid; ignore or clear results when navigating away.

**Location:** `apps/web/src/pages/PlaySessionPage.tsx`.

### 3.2 Discovery and controls

- [x] **Discovery:** Users can discover voice (e.g. “Say the segment (e.g. Single 20, Double 16), or tap below” or “Voice / Manual” control). Manual segment grid (Score Input, Single/Double/Treble, numbers, 25, Bull, Miss) is always visible.
- [x] **Voice / Manual button:** Visible when voice is supported; toggles listening (e.g. “Voice / Manual” ↔ “Stop voice”). When listening, show “Listening…” or equivalent.
- [x] **Aria/labels:** Button has an appropriate aria-label (e.g. “Voice / Manual mode”, “Stop voice input” when listening). Status messages use `role="status"` and `aria-live="polite"` where appropriate.

**Location:** `apps/web/src/pages/PlaySessionPage.tsx`.

### 3.3 Error and no-match handling

- [x] **No match / timeout:** When recognition reports no match (or equivalent), show “I didn’t catch that” with options: **Retry** (start listening again) and **Use manual** (dismiss and use grid). No silent failure.
- [x] **Recognition error:** When status is “error”, show the hook’s error message and a way to dismiss (e.g. “OK”).
- [x] **Unsupported:** When voice is not supported, show fallback message and do not show the voice button (or show it disabled with explanation).

**Location:** `apps/web/src/pages/PlaySessionPage.tsx`.

---

## 4. Prompting (domain §1.5)

### 4.1 Segment routines (SS, SD, ST)

- [x] **SS (single segment):** When switching to voice and routine type is SS, prompt with target and ask for full visit: e.g. “Target is Single 20. Please tell me your visit scores.” Use step target to derive the phrase (Single N / Double N / Treble N).
- [x] **SD (double):** Same for SD: “Target is Double 16. Please tell me your visit scores.”
- [x] **ST (treble):** Same for ST: “Target is Treble 20. Please tell me your visit scores.”
- [x] **When to speak:** Define when the prompt is played (e.g. on entering the step, when switching to voice mode, or on demand). If using Web Speech API synthesis (SpeechSynthesis), ensure it does not conflict with recognition (e.g. turn off mic during prompt playback).
- [x] **Implementation note:** Prompting may be implemented as visual text only first (e.g. “Target is Single 20” on screen); audio prompt (text-to-speech) is optional and should be documented.

**Location:** `apps/web/src/pages/PlaySessionPage.tsx`; optional TTS in a small util or hook.

### 4.2 Checkout routine (C)

- [x] **Target and remaining:** For checkout steps, prompt includes current remaining (or “Target is X” where X is the checkout total for the attempt). Example: “Target is 100”.
- [x] **Recommended outshot:** Include the recommended checkout combination in the prompt, e.g. “Recommended outshot is: Treble 20, Double 20” (or “Treble 60, Double 20” as in domain). Use existing recommended-route data (e.g. `routeCombination` / `getRecommendedSegmentForRemaining` or equivalent) to build the phrase.
- [x] **Format:** “Target is 100. Recommended outshot is: Treble 60, Double 20. Please tell me your visit scores.” Implement and document.

**Location:** `apps/web/src/pages/PlaySessionPage.tsx`; reuse existing recommended-combination logic for the current remaining.

---

## 5. Feedback (domain §1.5)

### 5.1 Recognition confirmation (segment read-back)

- [x] **After recognition:** On successful full-visit recognition, OPP repeats the visit back: “You scored 20, Treble 5, 1” (short form: numbers for singles, “Treble 5”, “Double 16”, 25, Bull, Miss). Show visual confirmation and speak via TTS.
- [x] **Wording:** Use short form for read-back (S20 → “20”, S5 → “5”, T5 → “Treble 5”, D16 → “Double 16”, 25, Bull, M → “Miss”) via `segmentCodeToShortSpoken`.
- [x] **Optional audio:** If text-to-speech is used for feedback, ensure it does not interfere with the next recognition start; document behaviour.

**Location:** `apps/web/src/pages/PlaySessionPage.tsx`; optional small helper to format segment list as “You threw Single 20, Single 5, Single 1”.

### 5.2 Checkout: visit score declaration

- [x] **After checkout visit:** For routine type C, after recording the visit (and when feedback is shown), also declare the total score for the visit. Domain example: “You scored 26”. Compute visit total from the segments in the visit (e.g. sum of segment scores) and display/speak “You scored X”.
- [x] **When to show:** Align with when “Submit visit” or equivalent is used (e.g. after the visit is complete and before moving to next attempt/step).

**Location:** `apps/web/src/pages/PlaySessionPage.tsx`; use existing segment-to-score logic for visit total.

### 5.3 Feedback auto-clear

- [x] **Timeout:** After showing segment (or no-match) feedback, clear the message after a short delay (e.g. 2s) so the screen is not cluttered. No-match and error states may stay until user chooses Retry or Use manual.

**Location:** `apps/web/src/pages/PlaySessionPage.tsx`.

---

## 6. Accessibility and UX

### 6.1 Manual primary and accessibility

- [x] **Manual always available:** Manual segment grid and controls are always visible and usable. Voice never blocks completion; if voice is off or fails, user can complete the session with manual only.
- [x] **NFR-6:** Tap targets, contrast, and layout remain unchanged; voice is additive. Users who cannot or prefer not to use voice can complete sessions with manual only.
- [x] **No voice-only flow:** There is no step or screen that requires voice to proceed.

### 6.2 Status and live regions

- [x] **Feedback:** Status messages (e.g. “Hit recorded”, “You threw Single 20”, “I didn’t catch that”) are exposed to assistive tech (e.g. `role="status"`, `aria-live="polite"`).
- [x] **Listening state:** When the app is listening, the state is indicated visually and, if applicable, to screen readers (e.g. “Listening…” or aria-live announcement).

---

## 7. Data and schema

### 7.1 Same path as manual

- [x] **No separate voice API:** Voice produces a segment code (or M); that code is passed into the same `addSegmentToVisit` (or equivalent) flow as manual. Persistence (dart_scores, routine score, session score) is unchanged.
- [x] **No schema change for core:** No new columns or tables are required for core voice behaviour. Optional: add `dart_scores.input_method` ('manual' | 'voice') for analytics only; document and implement only if product requests.

---

## 8. Testing

### 8.1 Unit tests

- [x] **voiceTextToSegment:** Covered in §2.2 (segment codes, optional bare number, null cases).
- [x] **Segment formatting (if added):** If a helper formats segment codes for prompt/feedback (e.g. codeToSpokenSegment), add unit tests for edge cases.

### 8.2 Integration / E2E (optional)

- [x] **Manual:** Document how to test voice in browser (HTTPS, allow microphone, say the segment e.g. Single 20 or Double 16, check visit and dart_scores). Optional E2E: use a test that mocks or stubs recognition to simulate result/no-match/error.
- [x] **Fallback:** Confirm that when voice is unsupported or blocked, session can be completed with manual only.

**How to test voice manually:** Use HTTPS (or localhost). Open a session, go to a running step. Allow microphone when prompted. Click "Voice / Manual" and say a segment (e.g. "Single 20", "Double 16", "Miss"). Confirm the visit shows the segment and feedback shows "You threw Single 20" (or equivalent). Submit the visit and confirm dart_scores reflect the segment. For no-match: say something unrecognised and confirm "I didn't catch that" with Retry / Use manual. For fallback: in an unsupported context (e.g. HTTP, or deny microphone), confirm the grid and manual controls work and the session can be completed without voice.

---

## 9. Documentation

### 9.1 In-code and README

- [x] **README or docs:** Document that voice input is supported in the GE (segment names — absolute outcomes only); Web Speech API; HTTPS required; supported browsers and fallback. State that manual is primary.
- [x] **Hook and util:** Brief JSDoc on `useVoiceRecognition` and `voiceTextToSegment` (purpose, main return values, errors).

### 9.2 Domain and checklist

- [x] **Domain:** All behavioural requirements in **OPP_VOICE_CONTROL_DOMAIN.md** are reflected in this checklist and implemented or explicitly deferred.
- [x] **Deferred items:** If any domain requirement is deferred (e.g. audio TTS for prompts), record it here and in the domain doc with a short rationale.

**Deferred:** Audio TTS for prompts and feedback — optional in domain (§1.5). Implemented as visual text only (e.g. “Target is Single 20” on screen; “You threw …” for feedback). TTS can be added later if product requests; ensure it does not conflict with recognition (e.g. mute mic during prompt playback).

---

## 10. Summary: domain → checklist mapping

| Domain (§) | Checklist section |
|------------|--------------------|
| 1.1 Purpose and scope | §1–3 (recognition, mapping, integration); §7 (same data path). |
| 1.2 Product context | §6 (manual primary, NFR-6). |
| 1.3 Behaviour (when, options, **absolute outcomes only**; no hit/miss implicit; mutual exclusivity, primary) | §2.1, §3.1, §3.2, §6.1. |
| 1.4 Technical (Web Speech API, HTTPS, browsers, output) | §1.1, §1.2, §2.1, §7.1. |
| 1.5 Discovery | §3.2. |
| 1.5 Prompting (SS/SD/ST: “Target is …”; C: target + recommended) | §4.1, §4.2. |
| 1.5 Feedback (read-back segments; checkout “You scored X”) | §5.1, §5.2, §5.3. |
| 1.5 Error (no match, retry, use manual) | §3.3. |
| 1.5 NFR-6 | §6.1. |
| §2 Implementation overview | §1–3, §7. |
| §3 Code (hook, util, tests, page) | §1, §2, §3, §8. |

---

## 11. References

- **docs/OPP_VOICE_CONTROL_DOMAIN.md** — Domain definition, behaviour, prompting, feedback, technical constraints.
- **docs/P8_POLISH_SCALE_DOMAIN.md** — §4 Voice score input.
- **docs/P8_FEATURES.md** — §1 Voice score input (Game Engine).
- **docs/PRODUCT_REQUIREMENTS.md** — FR-5.2 (voice and manual score input).
