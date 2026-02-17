/**
 * P8 — Voice recognition for GE score input. Web Speech API (SpeechRecognition).
 * Requires HTTPS; microphone permission when user opts in.
 * Supported browsers: Chrome, Edge (Chromium), Safari. Fallback: show "Voice not supported in this browser; use manual input."
 * See docs/P8_POLISH_SCALE_IMPLEMENTATION_TASKS.md §1.
 */

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

export function useVoiceRecognition() {
  const [status, setStatus] = useState<VoiceRecognitionStatus>('idle');
  const [lastTranscript, setLastTranscript] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const terminalRef = useRef(false);

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
    const Ctor = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new Ctor!();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-GB';
    terminalRef.current = false;
    recognition.onresult = (e: SpeechRecognitionEvent) => {
      terminalRef.current = true;
      const result = e.results[e.resultIndex];
      const transcript = result?.[0]?.transcript?.trim();
      if (transcript) {
        setLastTranscript(transcript);
        setStatus('result');
      } else {
        setStatus('no-match');
      }
    };
    recognition.onnomatch = () => {
      terminalRef.current = true;
      setStatus('no-match');
    };
    recognition.onerror = (e: SpeechRecognitionErrorEvent) => {
      terminalRef.current = true;
      if (e.error === 'not-allowed') {
        setErrorMessage('Microphone access denied. Use manual input or allow the microphone.');
      } else {
        setErrorMessage(e.message || `Voice error: ${e.error}`);
      }
      setStatus('error');
    };
    recognition.onend = () => {
      if (!terminalRef.current) setStatus('idle');
    };
    recognitionRef.current = recognition;
    setErrorMessage(null);
    setLastTranscript(null);
    setStatus('listening');
    try {
      recognition.start();
    } catch (err) {
      setStatus('error');
      setErrorMessage(err instanceof Error ? err.message : 'Failed to start voice recognition.');
    }
  }, [isSupported]);

  const stopListening = useCallback(() => {
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
