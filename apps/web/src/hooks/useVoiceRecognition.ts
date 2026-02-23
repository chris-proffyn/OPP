/**
 * P8 — Voice recognition for GE score input. Web Speech API (SpeechRecognition).
 *
 * **HTTPS required:** The Web Speech API and microphone access require a secure context
 * (HTTPS or localhost). `isSupported` is false over HTTP or when the API is unavailable.
 *
 * **Supported browsers:** Chrome, Edge (Chromium), Safari (desktop and iOS where the API
 * is available). Firefox does not support SpeechRecognition at time of writing. Unsupported
 * or insecure contexts must show fallback message and manual-only input.
 *
 * **Lifecycle:** Continuous recognition so the user can speak a full visit (e.g. 3 scores).
 * Stays listening until (a) SILENCE_AFTER_MS (2.5s) with no new speech, or (b) MAX_LISTENING_MS
 * (15s) total. Transcript is accumulated from all final results; consumeResult() returns it once.
 *
 * See docs/OPP_VOICE_CONTROL_DOMAIN.md and OPP_VOICE_CONTROL_IMPLEMENTATION_CHECKLIST.md §1.
 *
 * @returns { isSupported, status, lastTranscript, errorMessage, startListening, stopListening, clearFeedback, consumeResult }
 *   - status: 'idle' | 'listening' | 'result' | 'no-match' | 'error' | 'unsupported'
 *   - consumeResult() returns transcript once and clears it (single-consumption to avoid double-apply)
 *   - Errors: status 'error' with errorMessage (e.g. not-allowed → microphone denied)
 */

/** Silence after this many ms with no new speech → commit transcript and stop. */
const SILENCE_AFTER_MS = 2500;
/** Stop listening after this many ms regardless (safety cap). */
const MAX_LISTENING_MS = 15000;

import { useCallback, useRef, useState } from 'react';

declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognitionInstance;
    webkitSpeechRecognition?: new () => SpeechRecognitionInstance;
  }
}

interface SpeechRecognitionInstance extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((e: SpeechRecognitionEvent) => void) | null;
  onerror: ((e: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  onnomatch: (() => void) | null;
}

interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message?: string;
}

export type VoiceRecognitionStatus =
  | 'unsupported'
  | 'idle'
  | 'listening'
  | 'result'
  | 'no-match'
  | 'error';

/** Single result in the results list (has isFinal and transcript). */
interface RecognitionResultItem {
  isFinal?: boolean;
  0?: { transcript?: string };
  length?: number;
}

/** Build full transcript from continuous results (final segments only; if isFinal missing, include anyway for Safari). */
function getAccumulatedTranscript(results: SpeechRecognitionResultList): string {
  const parts: string[] = [];
  for (let i = 0; i < results.length; i++) {
    const result = results[i] as RecognitionResultItem;
    const transcript = result?.[0]?.transcript;
    if (transcript && result?.isFinal !== false) {
      parts.push(String(transcript).trim());
    }
  }
  return parts.join(' ').trim();
}

export function useVoiceRecognition() {
  const [status, setStatus] = useState<VoiceRecognitionStatus>('idle');
  const [lastTranscript, setLastTranscript] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const terminalRef = useRef(false);
  const silenceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const maxListeningTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const accumulatedRef = useRef('');

  const isSupported =
    typeof window !== 'undefined' &&
    window.isSecureContext &&
    !!(window.SpeechRecognition || window.webkitSpeechRecognition);

  const startListening = useCallback(() => {
    if (!isSupported) {
      setStatus('unsupported');
      setErrorMessage('Voice not supported in this browser; use manual input.');
      return;
    }
    // Clear any previous timeouts
    if (silenceTimeoutRef.current) {
      clearTimeout(silenceTimeoutRef.current);
      silenceTimeoutRef.current = null;
    }
    if (maxListeningTimeoutRef.current) {
      clearTimeout(maxListeningTimeoutRef.current);
      maxListeningTimeoutRef.current = null;
    }
    const Ctor = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Ctor) return;
    const recognition = new Ctor();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = 'en-GB';
    terminalRef.current = false;
    accumulatedRef.current = '';

    const commitAndStop = (finalTranscript: string) => {
      terminalRef.current = true;
      if (silenceTimeoutRef.current) {
        clearTimeout(silenceTimeoutRef.current);
        silenceTimeoutRef.current = null;
      }
      if (maxListeningTimeoutRef.current) {
        clearTimeout(maxListeningTimeoutRef.current);
        maxListeningTimeoutRef.current = null;
      }
      try {
        recognition.stop();
      } catch {
        /* ignore */
      }
      recognitionRef.current = null;
      if (finalTranscript) {
        console.log('[OPP Voice Recog] Commit transcript after silence/max:', finalTranscript);
        setLastTranscript(finalTranscript);
        setStatus('result');
      } else {
        console.log('[OPP Voice Recog] No transcript accumulated → no-match');
        setStatus('no-match');
      }
    };

    recognition.onresult = (e: SpeechRecognitionEvent) => {
      const accumulated = getAccumulatedTranscript(e.results);
      accumulatedRef.current = accumulated;
      console.log('[OPP Voice Recog] Recognition result (continuous):', { accumulated, resultLength: e.results.length });
      if (silenceTimeoutRef.current) clearTimeout(silenceTimeoutRef.current);
      silenceTimeoutRef.current = setTimeout(() => {
        silenceTimeoutRef.current = null;
        commitAndStop(accumulatedRef.current);
      }, SILENCE_AFTER_MS);
    };
    recognition.onnomatch = () => {
      terminalRef.current = true;
      console.log('[OPP Voice Recog] onnomatch — recognition heard nothing it could transcribe');
      setStatus('no-match');
    };
    recognition.onerror = (e: SpeechRecognitionErrorEvent) => {
      terminalRef.current = true;
      if (silenceTimeoutRef.current) clearTimeout(silenceTimeoutRef.current);
      if (maxListeningTimeoutRef.current) clearTimeout(maxListeningTimeoutRef.current);
      console.log('[OPP Voice Recog] Recognition error:', e.error, e.message);
      if (e.error === 'not-allowed') {
        setErrorMessage('Microphone access denied. Use manual input or allow the microphone.');
      } else {
        setErrorMessage(e.message || `Voice error: ${e.error}`);
      }
      setStatus('error');
    };
    recognition.onend = () => {
      if (silenceTimeoutRef.current) {
        clearTimeout(silenceTimeoutRef.current);
        silenceTimeoutRef.current = null;
      }
      if (!terminalRef.current) {
        const accumulated = accumulatedRef.current;
        if (accumulated) {
          terminalRef.current = true;
          console.log('[OPP Voice Recog] Engine ended with transcript:', accumulated);
          setLastTranscript(accumulated);
          setStatus('result');
        } else {
          setStatus('idle');
        }
      }
      recognitionRef.current = null;
    };
    recognitionRef.current = recognition;
    setErrorMessage(null);
    setLastTranscript(null);
    setStatus('listening');
    maxListeningTimeoutRef.current = setTimeout(() => {
      maxListeningTimeoutRef.current = null;
      if (!terminalRef.current && recognitionRef.current === recognition) {
        commitAndStop(accumulatedRef.current);
      }
    }, MAX_LISTENING_MS);
    try {
      recognition.start();
    } catch (err) {
      if (maxListeningTimeoutRef.current) clearTimeout(maxListeningTimeoutRef.current);
      setStatus('error');
      setErrorMessage(err instanceof Error ? err.message : 'Failed to start voice recognition.');
    }
  }, [isSupported]);

  const stopListening = useCallback(() => {
    terminalRef.current = true;
    if (silenceTimeoutRef.current) {
      clearTimeout(silenceTimeoutRef.current);
      silenceTimeoutRef.current = null;
    }
    if (maxListeningTimeoutRef.current) {
      clearTimeout(maxListeningTimeoutRef.current);
      maxListeningTimeoutRef.current = null;
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch {
        /* ignore */
      }
      recognitionRef.current = null;
    }
    if (status === 'listening') setStatus('idle');
  }, [status]);

  const clearFeedback = useCallback(() => {
    setLastTranscript(null);
    setErrorMessage(null);
    setStatus('idle');
  }, []);

  const consumeResult = useCallback((): string | null => {
    const t = lastTranscript;
    setLastTranscript(null);
    setStatus('idle');
    return t;
  }, [lastTranscript]);

  return {
    isSupported,
    status,
    lastTranscript,
    errorMessage,
    startListening,
    stopListening,
    clearFeedback,
    consumeResult,
  };
}
