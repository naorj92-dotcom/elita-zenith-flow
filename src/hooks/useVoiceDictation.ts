import { useState, useRef, useCallback, useEffect } from 'react';

interface UseVoiceDictationOptions {
  onTranscript: (text: string) => void;
  onAutoFill?: (fills: AutoFillResult[]) => void;
  silenceTimeout?: number;
}

export interface AutoFillResult {
  field: 'amount_units' | 'lot_number' | 'adverse_reaction' | 'product_used';
  value: string;
  label: string;
}

const SpeechRecognitionAPI =
  typeof window !== 'undefined'
    ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    : null;

export const isSpeechSupported = !!SpeechRecognitionAPI;

export function useVoiceDictation({
  onTranscript,
  onAutoFill,
  silenceTimeout = 30000,
}: UseVoiceDictationOptions) {
  const [isListening, setIsListening] = useState(false);
  const [showDone, setShowDone] = useState(false);
  const recognitionRef = useRef<any>(null);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const fullTranscriptRef = useRef('');

  const resetSilenceTimer = useCallback(() => {
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    silenceTimerRef.current = setTimeout(() => {
      stop();
    }, silenceTimeout);
  }, [silenceTimeout]);

  const parseAutoFills = useCallback((text: string): AutoFillResult[] => {
    const fills: AutoFillResult[] = [];
    const lower = text.toLowerCase();

    // Match "X units" or "Xu"
    const unitsMatch = lower.match(/(\d+)\s*(?:units?|u\b)/);
    if (unitsMatch) {
      fills.push({ field: 'amount_units', value: `${unitsMatch[1]} units`, label: 'Amount/Units' });
    }

    // Match "lot number X" or "lot X"
    const lotMatch = lower.match(/lot\s*(?:number\s*)?([a-z0-9-]+)/i);
    if (lotMatch) {
      fills.push({ field: 'lot_number', value: lotMatch[1].toUpperCase(), label: 'Lot Number' });
    }

    // Match adverse reaction indicators
    if (/no\s*(?:adverse|reaction)|all\s*good/i.test(lower)) {
      fills.push({ field: 'adverse_reaction', value: 'none', label: 'Adverse Reactions' });
    }

    // Match known product names
    const products = ['botox', 'juvederm', 'restylane', 'sculptra', 'kybella', 'dysport', 'xeomin', 'radiesse', 'belotero'];
    for (const product of products) {
      if (lower.includes(product)) {
        const capitalized = product.charAt(0).toUpperCase() + product.slice(1);
        fills.push({ field: 'product_used', value: capitalized, label: 'Product Used' });
        break;
      }
    }

    return fills;
  }, []);

  const stop = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    setIsListening(false);
    setShowDone(true);
    setTimeout(() => setShowDone(false), 2000);

    // Parse auto-fills from full transcript
    if (onAutoFill && fullTranscriptRef.current) {
      const fills = parseAutoFills(fullTranscriptRef.current);
      if (fills.length > 0) onAutoFill(fills);
    }
    fullTranscriptRef.current = '';
  }, [onAutoFill, parseAutoFills]);

  const start = useCallback(() => {
    if (!SpeechRecognitionAPI) return;

    const recognition = new SpeechRecognitionAPI();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    recognitionRef.current = recognition;
    fullTranscriptRef.current = '';

    recognition.onresult = (event: any) => {
      resetSilenceTimer();
      let finalText = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          finalText += event.results[i][0].transcript;
        }
      }
      if (finalText) {
        fullTranscriptRef.current += ' ' + finalText;
        onTranscript(finalText);
      }
    };

    recognition.onerror = () => stop();
    recognition.onend = () => {
      if (isListening) setIsListening(false);
    };

    recognition.start();
    setIsListening(true);
    resetSilenceTimer();
  }, [onTranscript, resetSilenceTimer, stop, isListening]);

  const toggle = useCallback(() => {
    if (isListening) {
      stop();
    } else {
      start();
    }
  }, [isListening, start, stop]);

  useEffect(() => {
    return () => {
      if (recognitionRef.current) recognitionRef.current.stop();
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    };
  }, []);

  return { isListening, showDone, toggle, isSupported: isSpeechSupported };
}
