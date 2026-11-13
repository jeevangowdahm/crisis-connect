// Voice SOS — Web Speech API wrapper
// Provides speech-to-text and text-to-speech for hands-free emergency use

export interface VoiceSOSCallbacks {
  onTranscript: (text: string, isFinal: boolean) => void;
  onEmergencyDetected?: (text: string) => void;
  onError?: (error: string) => void;
  onEnd?: () => void;
}

let recognition: any = null;
let isListening = false;

export function isVoiceSupported(): boolean {
  return 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window;
}

export function startListening(callbacks: VoiceSOSCallbacks): boolean {
  if (!isVoiceSupported()) {
    callbacks.onError?.('Speech recognition not supported in this browser');
    return false;
  }

  const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  recognition = new SpeechRecognition();
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.lang = 'en-IN';

  recognition.onresult = (event: any) => {
    let interimTranscript = '';
    let finalTranscript = '';

    for (let i = event.resultIndex; i < event.results.length; i++) {
      const transcript = event.results[i][0].transcript;
      if (event.results[i].isFinal) {
        finalTranscript += transcript;
      } else {
        interimTranscript += transcript;
      }
    }

    if (finalTranscript) {
      callbacks.onTranscript(finalTranscript, true);
    } else if (interimTranscript) {
      callbacks.onTranscript(interimTranscript, false);
    }
  };

  recognition.onerror = (event: any) => {
    callbacks.onError?.(event.error);
    isListening = false;
  };

  recognition.onend = () => {
    isListening = false;
    callbacks.onEnd?.();
  };

  try {
    recognition.start();
    isListening = true;
    return true;
  } catch {
    callbacks.onError?.('Failed to start speech recognition');
    return false;
  }
}

export function stopListening(): void {
  if (recognition) {
    recognition.stop();
    isListening = false;
  }
}

export function getIsListening(): boolean {
  return isListening;
}

// Text-to-Speech — read results aloud
export function speakResult(text: string): void {
  if (!('speechSynthesis' in window)) return;

  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 0.95;
  utterance.pitch = 1;
  utterance.lang = 'en-IN';
  window.speechSynthesis.speak(utterance);
}

export function stopSpeaking(): void {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
}
