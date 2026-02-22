# OPP Voice Control — Domain Definition

**Document type:** Domain + implementation reference  
**Project:** OPP Darts Training Platform  
**Phase:** P8 (Polish and Scale)  
**References:** `docs/P8_POLISH_SCALE_DOMAIN.md` §4, `docs/P8_POLISH_SCALE_IMPLEMENTATION_TASKS.md` §1, `docs/P8_FEATURES.md` §1, `docs/PRODUCT_REQUIREMENTS.md` FR-5.2.

---

## 1. Domain definition

### 1.1 Purpose and scope

Voice control in OPP allows players to **speak** the outcome of a **visit** (e.g. 3 darts) during Game Engine (GE) routine execution, in addition to using the manual segment grid. The same data path is used: recognised speech is parsed into segment codes for the full visit and fed into the same visit/session flow as manual input, with **one voice response = one visit** and **no separate “voice” data model** unless analytics on input method are added later.

### 1.2 Product and requirement context

- **PRODUCT_REQUIREMENTS.md:** FR-5.2 — “GE shows routine name, step no, target segment; **supports voice and manual score input**. For each dart: target, actual, hit/miss recorded (dart_scores).”
- **PRD assumption:** Voice input is a **UX enhancement**; **manual input is primary** for reliability. Manual must be fully supported; voice failure or unavailability must not block session completion.
- **Platform (OPP Platform.md):** “Task outcome input: Via Voice input by user or manually via UI.”

### 1.3 Behaviour (domain)

- **When:** During GE routine execution, when the player is prompted to enter the outcome of a **visit** (e.g. 3 darts). Applies to segment (SS/SD/ST) and checkout (C) steps.
- **Voice input — one visit only:** The player **always** speaks **one visit** (3 darts) per voice response. This is fundamental: regardless of how many visits make up the step or how many attempts (e.g. for checkouts), each voice input is exactly one visit. OPP prompts with the target and asks for the visit scores (e.g. "Target is Single 20. Please tell me your visit scores."). The player responds with all three darts in one utterance (e.g. "20, Treble 5, 1" or "single one single one single one"). Only **absolute segment outcomes** are recognised (segment names/codes, bare numbers 1–20 for singles, 25, Bull, Miss). The system does **not** cater for "hit", "miss", or other implicit outcomes.
- **Options:** Player may (a) use **manual** control (tap segments or Miss on the score input grid), or (b) **speak** the full visit (3 darts). Recognised utterance is parsed into segment codes and applied as that one visit.
- **Mutual exclusivity:** One visit per voice response; voice and manual are mutually exclusive for that visit.
- **Primary input:** Manual remains primary. Voice is additive; if voice is unsupported, denied, or fails, the user completes the session with manual only.

### 1.4 Technical constraints (domain)

- **Recognition:** Browser **Web Speech API** (SpeechRecognition). **HTTPS** is required (and secure context) for the API and microphone access.
- **Supported browsers:** Chrome, Edge (Chromium), Safari (desktop and iOS where the API is available). Unsupported or insecure contexts must show a fallback message and manual only.
- **Output:** Recognised text is mapped to a **canonical segment code**; the same insert path to `dart_scores` as manual is used. No change to `dart_scores` schema for voice unless product adds e.g. `input_method` ('manual' | 'voice') for analytics.

### 1.5 Accessibility and UX (domain)

- **Discovery:** Users must be able to discover the voice option. Manual controls are always visible; no voice-only flow.
- **Prompting:** When switching to voice, the system prompts with the target and asks for the **full visit**. Example (SS): "Target is Single 20. Please tell me your visit scores." Same pattern for SD/ST (e.g. "Target is Double 16. Please tell me your visit scores."). For Checkout: "Target is 100. Recommended outshot is: Treble 60, Double 20. Please tell me your visit scores."
- **Feedback:** After the player speaks the visit (e.g. "20, Treble 5, 1"), OPP repeats the input back: "You scored 20, Treble 5, 1" (short form: numbers for singles, "Treble 5", "Double 16", etc.). For checkout, the visit total may also be stated (e.g. "You scored 26").
- **Error condition** On no match or timeout: “I didn’t catch that” with option to **retry** voice or **use manual**. No silent failure.
- **NFR-6 (accessibility):** Voice is additive; users who cannot or prefer not to use voice can complete sessions with manual only. Tap targets and contrast are unchanged.

**Deferred (implementation):** Audio TTS for prompts and feedback is optional; current implementation uses visual text only. TTS can be added later if product requests.

---

## 2. Implementation overview

Voice control is implemented entirely in the **web app** (`apps/web`). No backend or `@opp/data` changes are required; the same `dart_scores` insert and session flow used for manual input is used for voice.

| Layer | Role |
|-------|------|
| **Hook** | `useVoiceRecognition` — Web Speech API lifecycle, status, transcript, start/stop. |
| **Utility** | `voiceTextToSegment` — Map a single segment phrase to code. `parseVisitFromTranscript` — Parse a full-visit utterance (e.g. "20, Treble 5, 1") into an array of segment codes for the visit. |
| **Page** | `PlaySessionPage` — Integrates hook + mapping; applies result to current visit; feedback UI; fallback message. |
| **Constants** | `segments.ts` — `normaliseSegment`, `ALL_SEGMENT_CODES`, `SEGMENT_MISS` used by mapping. |

---

## 3. Code developed

### 3.1 Hook: `useVoiceRecognition`  
**Path:** `apps/web/src/hooks/useVoiceRecognition.ts`

- **Purpose:** Encapsulate the browser **Web Speech API** (SpeechRecognition / webkitSpeechRecognition) for one-shot recognition (one utterance per start).
- **Support check:** `isSupported` is true only when `window.isSecureContext` is true and `SpeechRecognition` or `webkitSpeechRecognition` is present. Unsupported or non-HTTPS shows fallback in UI.
- **Status:** `'idle' | 'listening' | 'result' | 'no-match' | 'error' | 'unsupported'`.
- **API usage:**
  - `continuous: false`, `interimResults: false`, `lang: 'en-GB'`.
  - `onresult` → transcript from `e.results[e.resultIndex][0].transcript`; set status `'result'` and store transcript.
  - `onnomatch` → set status `'no-match'`.
  - `onerror` → set status `'error'` and message (e.g. `not-allowed` → “Microphone access denied. Use manual input or allow the microphone.”).
  - `onend` → if no terminal event yet, set status back to `'idle'`.
- **Methods:**
  - `startListening()` — Creates recognition instance, attaches handlers, calls `start()`. Sets `'listening'` or `'error'`/`'unsupported'`.
  - `stopListening()` — Calls `abort()` on current instance; if status was `'listening'`, sets `'idle'`.
  - `clearFeedback()` — Clears transcript and error; sets status `'idle'`.
  - `consumeResult()` — Returns current transcript and clears it; sets status `'idle'`. Used so the page handles the result once and does not double-apply.
- **Return:** `{ isSupported, status, lastTranscript, errorMessage, startListening, stopListening, clearFeedback, consumeResult }`.

### 3.2 Utility: `voiceToSegment.ts`  
**Path:** `apps/web/src/utils/voiceToSegment.ts`

- **Purpose:** Map recognised speech to segment codes. **Single:** `voiceTextToSegment(text, stepTarget)`. **Full visit:** `parseVisitFromTranscript(transcript, stepTarget, N)` — split by comma/" and "; each part → segment; bare numbers 1–20 → S1–S20. Only **absolute outcomes** are recognised (e.g. "Single 20", "Double 16", "25", "Bull", "Miss"). No hit/miss or other implicit outcomes. Same codes as manual grid; output is passed into the same `addSegmentToVisit` flow.
- **Signatures:** `voiceTextToSegment(text, stepTarget): string | null`; `parseVisitFromTranscript(transcript, stepTarget, visitSize): string[] | null`.
- **Read-back:** Short form (S20→"20", T5→"Treble 5") for "You scored 20, Treble 5, 1". See `segmentCodeToShortSpoken` in segments.ts.
- **Mapping rules:**
  - **Segment names/codes:** If text normalises to a valid segment via `normaliseSegment` and is in `ALL_SEGMENT_CODES`, return that code (e.g. "Single 20", "S20", "single 20" → `'S20'`; "Double 16", "D16" → `'D16'`; "Treble 5", "T5" → `'T5'`; "25", "Bull", "Miss" → `'25'`, `'Bull'`, `'M'`). Optionally: bare number (e.g. "20") in context of step target S20 → `'S20'`.
  - **Unrecognised:** Return `null` (page shows “I didn’t catch that” and offers retry / manual).
- **Voice segment mapping (keywords and STT reconversion):**
  - **Single:** Keyword **"Single"** (e.g. "Single 20", "S20", "single 20" → `'S20'`).
  - **Double:** Keyword **"Double"** (e.g. "Double 16", "D16" → `'D16'`). **STT reconversion:** Some engines transcribe "Double 5" as **"55"**. Players never say "55" to mean fifty-five in this context. The app reconverts any token that is **two identical digits (11, 22, …, 99)** back to **"Double N"** (e.g. "55" → Double 5, "11" → Double 1) before mapping.
  - **Treble:** Keywords **"Treble"**, **"Triple"**, **"Trouble"** (all map to treble; e.g. "Treble 5", "Triple 5", "Trouble 5", "T5" → `'T5'`).
  - **"Two" mishearings:** STT often transcribes "two" as **"to"**, **"too"**, **"tube"**, or **"tune"**. These are normalised to 2 only in segment contexts: after a keyword (e.g. "Single to" → Single 2, "double too" → Double 2) or when the token stands alone as a segment (e.g. "20, to, 1" → 20, 2, 1). Bare "to"/"too"/"tube"/"tune" maps to the step target when it is S2, D2, or T2.
- **Dependencies:** `../constants/segments` — `normaliseSegment`, `ALL_SEGMENT_CODES`, `SEGMENT_MISS`.

### 3.3 Tests: `voiceToSegment.test.ts`  
**Path:** `apps/web/src/utils/voiceToSegment.test.ts`

- **Purpose:** Unit tests for voice utterance mapping (absolute outcomes only).
- **Coverage:** Segment names and codes ("Single 20", "S20", "Double 16", "Treble 5", "25", "Bull", "Miss"); optional bare number ("20" → S20 when step target S20); empty/whitespace → null; unknown text → null. No hit/miss implicit outcomes.

### 3.4 Integration: `PlaySessionPage.tsx`  
**Path:** `apps/web/src/pages/PlaySessionPage.tsx`

- **Hook usage:** `const voice = useVoiceRecognition();` plus local state `voiceFeedback: 'segment' | 'no-match' | null` for UI feedback.
- **Applying voice result:** A `useEffect` runs when `voice.status === 'result'` and `gameState.phase === 'running'`. It calls `voice.consumeResult()`, then `parseVisitFromTranscript(transcript, step.target, N)`. If the result is an array of N segments → add all to the visit (same as manual), set feedback, and speak read-back: "You scored 20, Treble 5, 1". If transcript is "repeat" → re-speak target prompt and restart listening. If null (unrecognised or wrong count) → `setVoiceFeedback('no-match')`. Thus **one voice result = one full visit**.
- **No-match:** Another effect sets `voiceFeedback` to `'no-match'` when `voice.status === 'no-match'` and clears it.
- **Feedback auto-clear:** A short timeout (2s) clears `voiceFeedback` after segment so the status message does not stay forever.
- **UI (running phase):**
  - If `voice.isSupported`: button “Voice / Manual” (aria-label “Voice / Manual mode”); when listening, button label “Stop voice” and “Listening…” text. Click toggles `startListening` / `stopListening`.
  - If `!voice.isSupported`: message “Voice not supported in this browser; use manual input below.”
  - When `voiceFeedback === 'segment'`: e.g. “Segment recorded” or read-back of segment (e.g. “Single 20 recorded”).
  - When `voiceFeedback === 'no-match'`: “I didn’t catch that.” plus buttons “Retry” (start listening again) and “Use manual” (clear feedback).
  - When `voice.status === 'error'`: show `voice.errorMessage` and “OK” to clear.
- **Copy:** Discovery: e.g. “Say the segment (e.g. Single 20, Double 16), or tap below.” Manual segment grid is always present (SegmentGrid with Score Input, Single/Double/Treble, numbers, 25, Bull, Miss).

### 3.5 Data path (unchanged)

- Voice does **not** introduce a new API or table. The segment code produced by `voiceTextToSegment` is passed to `addSegmentToVisit(segment)`, which appends to `visitSelections`. On “Submit visit”, the same logic that runs for manual input persists darts (e.g. `insertDartScores` / routine score / session score). So **dart_scores** rows are identical whether the segment was chosen by voice or by tap; no `input_method` column in the current schema.

---

## 4. Summary table

| Item | Location | Role |
|------|----------|------|
| Domain (when/where/behaviour) | P8_POLISH_SCALE_DOMAIN.md §4 | Voice as enhancement; manual primary; Web Speech API; HTTPS; feedback and fallback. |
| Implementation tasks | P8_POLISH_SCALE_IMPLEMENTATION_TASKS.md §1 | 1.1–1.5 voice integration, mapping, discovery, feedback, accessibility. |
| Feature summary | P8_FEATURES.md §1 | Delivered behaviour and constraints. |
| useVoiceRecognition | apps/web/src/hooks/useVoiceRecognition.ts | Web Speech API lifecycle, status, start/stop, consumeResult. |
| voiceTextToSegment | apps/web/src/utils/voiceToSegment.ts | Transcript → segment code (absolute outcomes only: Single 20, Double 16, etc., or null). |
| voiceToSegment.test | apps/web/src/utils/voiceToSegment.test.ts | Unit tests for mapping. |
| PlaySessionPage | apps/web/src/pages/PlaySessionPage.tsx | useVoiceRecognition + voiceTextToSegment; addSegmentToVisit; feedback and fallback UI. |
| segments.ts | apps/web/src/constants/segments.ts | normaliseSegment, ALL_SEGMENT_CODES, SEGMENT_MISS used by voiceToSegment. |

---

## 5. References

- **docs/P8_POLISH_SCALE_DOMAIN.md** — §4 Voice score input (when/where, technical options, accessibility, data).
- **docs/P8_POLISH_SCALE_IMPLEMENTATION_TASKS.md** — §1.1–1.6 voice tasks; §11.4 voice tests; §12.1 voice documentation.
- **docs/P8_FEATURES.md** — §1 Voice score input (Game Engine).
- **docs/PRODUCT_REQUIREMENTS.md** — FR-5.2 (voice and manual score input); assumption that manual is primary.
