// FIX: Removed self-import of 'EffectSettings' to resolve name conflict.
export interface EffectSettings {
  noiseGate: {
    threshold: number; // -100 to 0 dB
  };
  compressor: {
    threshold: number; // -100 to 0 dB
    ratio: number;     // 1 to 20
  };
  eq: {
    bass: number;      // -12 to 12 dB
    mids: number;      // -12 to 12 dB
    treble: number;    // -12 to 12 dB
  };
  reverb: {
    mix: number;       // 0 (dry) to 1 (wet)
    preset: ReverbPreset;
  };
}

export interface Recording {
  id: string;
  name: string;
  date: number;
  audioURL: string;
  settings: StudioSettings;
  duration: number; 
  waveform: number[][]; // Updated to store min/max pairs
}

export type ReverbPreset = 'none' | 'small-room' | 'large-hall' | 'mosque';

export interface StudioSettings {
  isEnhanced: boolean; 
  effects: EffectSettings;
}

export interface FeedbackData {
  positiveReinforcement: string;
  pointsOfExcellence: string[];
  areasForRefinement: {
    rule: string;
    explanation: string;
  }[];
  practiceTip: string;
}
