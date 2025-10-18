import React, { useState, useEffect, useCallback } from 'react';
import { Recording, StudioSettings, EffectSettings } from './types';
import { useRecorder } from './hooks/useRecorder';
import { RecordingList } from './components/RecordingList';
import { FeedbackModal } from './components/FeedbackModal';
import { TuneIcon } from './components/icons';
import { StudioEffects } from './components/StudioEffects';
import { LiveWaveform } from './components/LiveWaveform';

const defaultSettings: StudioSettings = {
    isEnhanced: true,
    effects: {
      noiseGate: { threshold: -50 },
      compressor: { threshold: -24, ratio: 4 },
      eq: { bass: 0, mids: 0, treble: 0 },
      reverb: { mix: 0, preset: 'none' },
    }
};

function App() {
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [studioSettings, setStudioSettings] = useState<StudioSettings>(defaultSettings);
  const [selectedRecordingForFeedback, setSelectedRecordingForFeedback] = useState<Recording | null>(null);
  const [isEffectsPanelOpen, setIsEffectsPanelOpen] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);

  const addRecording = useCallback((recording: Recording) => {
    setRecordings((prev) => [recording, ...prev]);
  }, []);

  const { status, startRecording, stopRecording, waveformData } = useRecorder(addRecording, studioSettings);

  const deleteRecording = (id: string) => {
    setRecordings((prev) => prev.filter((rec) => rec.id !== id));
  };

  const handleGetFeedback = (recording: Recording) => {
    setSelectedRecordingForFeedback(recording);
  };
  
  const handleCloseModal = () => {
    setSelectedRecordingForFeedback(null);
  }

  useEffect(() => {
    try {
      const savedRecordings = localStorage.getItem('recital-studio-pro-recordings');
      if (savedRecordings) {
        setRecordings(JSON.parse(savedRecordings));
      }
    } catch (error) {
      console.error("Failed to load recordings from localStorage", error);
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('recital-studio-pro-recordings', JSON.stringify(recordings));
    } catch (error) {
      console.error("Failed to save recordings to localStorage", error);
    }
  }, [recordings]);

  const handleEffectChange = (
    category: keyof EffectSettings,
    setting: string,
    value: number | string
  ) => {
    setStudioSettings(prev => ({
        ...prev,
        effects: {
            ...prev.effects,
            [category]: {
                // @ts-ignore
                ...prev.effects[category],
                [setting]: value
            }
        }
    }));
  };
  
  const isRecording = status === 'recording';
  
  useEffect(() => {
    if (isRecording) {
      setRecordingDuration(0);
      const timer = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [isRecording]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
    const secs = (seconds % 60).toString().padStart(2, '0');
    return `${mins}:${secs}`;
  }

  return (
    <div className="app-container">
      <div className="flex-grow flex flex-col p-6">
        <h1 className="text-3xl font-bold text-center text-white mb-6">Voice Memo</h1>
        
        <div className="flex-grow flex items-center justify-center">
            <LiveWaveform data={waveformData} isRecording={isRecording} />
        </div>
        
        <div className="text-center my-6">
            <p className="text-6xl font-mono text-white tracking-wider">
                {formatDuration(recordingDuration)}
            </p>
        </div>

        <div className="flex items-center justify-around">
            <div className="w-12 h-12"></div> 
            <button
                onClick={isRecording ? stopRecording : startRecording}
                disabled={status === 'processing'}
                className={`record-button ${isRecording ? 'recording' : ''}`}
                aria-label={isRecording ? "Stop Recording" : "Start Recording"}
            >
                <div className="record-button-icon"></div>
            </button>
            <button onClick={() => setIsEffectsPanelOpen(true)} className="p-3 text-slate-300 hover:text-white transition-colors" aria-label="Open Effects Panel">
                <TuneIcon className="w-6 h-6"/>
            </button>
        </div>
      </div>
      
      <div className="bg-black/40 max-h-[45vh] overflow-y-auto">
        <RecordingList 
            recordings={recordings} 
            onDelete={deleteRecording}
            onGetFeedback={handleGetFeedback}
        />
      </div>

      {selectedRecordingForFeedback && (
          <FeedbackModal
              isOpen={!!selectedRecordingForFeedback}
              onClose={handleCloseModal}
              recording={selectedRecordingForFeedback}
          />
      )}
      
      <div className={`fixed inset-0 z-20 bg-black/50 backdrop-blur-sm transition-opacity ${isEffectsPanelOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} onClick={() => setIsEffectsPanelOpen(false)}></div>
      <div className={`effects-drawer fixed bottom-0 left-0 right-0 z-30 w-full max-w-[420px] mx-auto ${isEffectsPanelOpen ? 'open' : ''}`}>
          <StudioEffects 
            settings={studioSettings.effects} 
            onChange={handleEffectChange} 
            onClose={() => setIsEffectsPanelOpen(false)}
          />
      </div>
    </div>
  );
}

export default App;
