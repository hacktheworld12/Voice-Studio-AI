import { useState, useRef, useEffect, useCallback } from 'react';
import { Recording, StudioSettings, ReverbPreset, EffectSettings } from '../types';

export type RecordingStatus = 'idle' | 'recording' | 'processing';

const generateStaticWaveform = async (blob: Blob): Promise<number[][]> => {
    try {
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const arrayBuffer = await blob.arrayBuffer();
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
        const data = audioBuffer.getChannelData(0);
        const samples = 200; 
        const blockSize = Math.floor(data.length / samples);
        const waveformData: number[][] = [];
        for (let i = 0; i < samples; i++) {
            const blockStart = blockSize * i;
            let min = 1.0;
            let max = -1.0;
            for (let j = 0; j < blockSize; j++) {
                const val = data[blockStart + j];
                if (val < min) min = val;
                if (val > max) max = val;
            }
            waveformData.push([min, max]);
        }
        return waveformData;
    } catch (e) {
        console.error("Failed to generate static waveform:", e);
        return Array(200).fill([0, 0]);
    }
}

export const useRecorder = (
  onRecordingComplete: (recording: Recording) => void,
  studioSettings: StudioSettings
) => {
  const [status, setStatus] = useState<RecordingStatus>('idle');
  const [waveformData, setWaveformData] = useState<number>(0);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const visualizerFrameRef = useRef<number | null>(null);
  const analyserNodeRef = useRef<AnalyserNode | null>(null);
  const recordingStartTimeRef = useRef<number>(0);

  const sourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const noiseGateNodeRef = useRef<GainNode | null>(null);
  const compressorNodeRef = useRef<DynamicsCompressorNode | null>(null);
  const eqBassNodeRef = useRef<BiquadFilterNode | null>(null);
  const eqMidsNodeRef = useRef<BiquadFilterNode | null>(null);
  const eqTrebleNodeRef = useRef<BiquadFilterNode | null>(null);
  const reverbNodeRef = useRef<ConvolverNode | null>(null);
  const reverbWetGainRef = useRef<GainNode | null>(null);
  const reverbDryGainRef = useRef<GainNode | null>(null);
  const recordingMixerNodeRef = useRef<GainNode | null>(null);
  const outputDestinationNodeRef = useRef<MediaStreamAudioDestinationNode | null>(null);
  
  const studioSettingsRef = useRef(studioSettings);
  useEffect(() => {
    studioSettingsRef.current = studioSettings;
  }, [studioSettings]);

  const createImpulseResponse = useCallback((context: AudioContext, preset: ReverbPreset): AudioBuffer | null => {
    if (preset === 'none' || !context) return null;
    const sampleRate = context.sampleRate;
    let duration = 2.0, decay = 4.0;
    switch (preset) {
      case 'small-room': duration = 1.2; decay = 2.0; break;
      case 'large-hall': duration = 2.5; decay = 2.5; break;
      case 'mosque': duration = 4.5; decay = 3.0; break;
    }
    const length = sampleRate * duration;
    const impulse = context.createBuffer(2, length, sampleRate);
    for (let channel = 0; channel < 2; channel++) {
        const channelData = impulse.getChannelData(channel);
        for (let i = 0; i < length; i++) {
            channelData[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, decay);
        }
    }
    return impulse;
  }, []);

  const cleanup = useCallback(() => {
    if (visualizerFrameRef.current) {
        cancelAnimationFrame(visualizerFrameRef.current);
        visualizerFrameRef.current = null;
    }
    if (mediaRecorderRef.current?.state === 'recording') {
        mediaRecorderRef.current.stop();
    }
    mediaStreamRef.current?.getTracks().forEach(track => track.stop());
    
    sourceNodeRef.current?.disconnect();
    analyserNodeRef.current?.disconnect();
    noiseGateNodeRef.current?.disconnect();
    compressorNodeRef.current?.disconnect();
    eqBassNodeRef.current?.disconnect();
    eqMidsNodeRef.current?.disconnect();
    eqTrebleNodeRef.current?.disconnect();
    reverbNodeRef.current?.disconnect();
    reverbWetGainRef.current?.disconnect();
    reverbDryGainRef.current?.disconnect();
    recordingMixerNodeRef.current?.disconnect();
    outputDestinationNodeRef.current?.disconnect();
    
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close().catch(console.error);
    }
    
    audioContextRef.current = null;
    mediaStreamRef.current = null;
    mediaRecorderRef.current = null;
    analyserNodeRef.current = null;
    sourceNodeRef.current = null;
    noiseGateNodeRef.current = null;
    compressorNodeRef.current = null;
    eqBassNodeRef.current = null;
    eqMidsNodeRef.current = null;
    eqTrebleNodeRef.current = null;
    reverbNodeRef.current = null;
    reverbWetGainRef.current = null;
    reverbDryGainRef.current = null;
    recordingMixerNodeRef.current = null;
    outputDestinationNodeRef.current = null;
    
    recordedChunksRef.current = [];
    setWaveformData(0);
  }, []);
  
  const applyEffects = useCallback((effects: EffectSettings) => {
      const { compressor, eq, reverb } = effects;
      if(compressorNodeRef.current) {
          compressorNodeRef.current.threshold.value = compressor.threshold;
          compressorNodeRef.current.ratio.value = compressor.ratio;
      }
      if(eqBassNodeRef.current) eqBassNodeRef.current.gain.value = eq.bass;
      if(eqMidsNodeRef.current) eqMidsNodeRef.current.gain.value = eq.mids;
      if(eqTrebleNodeRef.current) eqTrebleNodeRef.current.gain.value = eq.treble;
      if(reverbNodeRef.current && audioContextRef.current) {
          reverbNodeRef.current.buffer = createImpulseResponse(audioContextRef.current, reverb.preset);
      }
      if(reverbWetGainRef.current) reverbWetGainRef.current.gain.value = reverb.mix;
      if(reverbDryGainRef.current) reverbDryGainRef.current.gain.value = 1 - reverb.mix;
  }, [createImpulseResponse]);

  useEffect(() => {
    if (status === 'recording') {
      applyEffects(studioSettings.effects);
    }
  }, [studioSettings, status, applyEffects]);


  const startRecording = async () => {
    if (status !== 'idle') return;
    try {
      cleanup(); 
      
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { noiseSuppression: false, echoCancellation: false, autoGainControl: false } });
      mediaStreamRef.current = stream;

      const context = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioContextRef.current = context;

      const analyser = context.createAnalyser();
      analyser.fftSize = 1024;
      analyser.smoothingTimeConstant = 0.6;
      const timeDomainDataArray = new Uint8Array(analyser.fftSize);
      analyserNodeRef.current = analyser;

      const draw = () => {
        if (analyserNodeRef.current && audioContextRef.current && audioContextRef.current.state === 'running') {
            analyserNodeRef.current.getByteTimeDomainData(timeDomainDataArray);

            let sumSquares = 0.0;
            for (const amplitude of timeDomainDataArray) {
                const normalizedValue = (amplitude / 128.0) - 1.0;
                sumSquares += normalizedValue * normalizedValue;
            }
            const rms = Math.sqrt(sumSquares / timeDomainDataArray.length);
            
            setWaveformData(rms);

            if (noiseGateNodeRef.current) {
                const gateThreshold = studioSettingsRef.current.effects.noiseGate.threshold;
                const rmsDb = 20 * Math.log10(rms + 1e-6); // Epsilon to avoid log(0)
                const isAudible = rmsDb > gateThreshold;
                const targetGain = isAudible ? 1.0 : 0.0;
                
                noiseGateNodeRef.current.gain.linearRampToValueAtTime(targetGain, context.currentTime + 0.02);
            }
        }
        visualizerFrameRef.current = requestAnimationFrame(draw);
      };
      draw();
      
      const source = context.createMediaStreamSource(stream);
      sourceNodeRef.current = source;
      
      const noiseGate = context.createGain();
      noiseGateNodeRef.current = noiseGate;

      const compressor = context.createDynamicsCompressor();
      compressorNodeRef.current = compressor;

      const eqBass = context.createBiquadFilter(); 
      eqBass.type = 'lowshelf'; eqBass.frequency.value = 250;
      eqBassNodeRef.current = eqBass;
      
      const eqMids = context.createBiquadFilter(); 
      eqMids.type = 'peaking'; eqMids.frequency.value = 1000;
      eqMidsNodeRef.current = eqMids;

      const eqTreble = context.createBiquadFilter(); 
      eqTreble.type = 'highshelf'; eqTreble.frequency.value = 4000;
      eqTrebleNodeRef.current = eqTreble;

      const reverb = context.createConvolver();
      reverbNodeRef.current = reverb;

      const wetGain = context.createGain(); 
      reverbWetGainRef.current = wetGain;
      const dryGain = context.createGain();
      reverbDryGainRef.current = dryGain;
      
      const recordingMixer = context.createGain();
      recordingMixerNodeRef.current = recordingMixer;

      const destination = context.createMediaStreamDestination();
      outputDestinationNodeRef.current = destination;
      
      applyEffects(studioSettings.effects);

      source.connect(analyser);
      source.connect(noiseGate).connect(compressor).connect(eqBass).connect(eqMids).connect(eqTreble);
      eqTreble.connect(dryGain).connect(recordingMixer);
      eqTreble.connect(reverb).connect(wetGain).connect(recordingMixer);
      recordingMixer.connect(destination);
      
      mediaRecorderRef.current = new MediaRecorder(destination.stream, { mimeType: 'audio/webm;codecs=opus' });

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) recordedChunksRef.current.push(event.data);
      };

      mediaRecorderRef.current.onstop = async () => {
        const blob = new Blob(recordedChunksRef.current, { type: 'audio/webm;codecs=opus' });
        const audioURL = URL.createObjectURL(blob);
        const duration = (Date.now() - recordingStartTimeRef.current) / 1000;
        const staticWaveform = await generateStaticWaveform(blob);

        const newRecording: Recording = {
          id: `rec-${Date.now()}`,
          name: `Memo ${new Date().toLocaleDateString()}`,
          date: Date.now(),
          audioURL,
          settings: { ...studioSettingsRef.current },
          duration,
          waveform: staticWaveform,
        };
        onRecordingComplete(newRecording);
        cleanup();
        setStatus('idle');
      };
      
      recordingStartTimeRef.current = Date.now();
      mediaRecorderRef.current.start();
      setStatus('recording');
      
    } catch (error) {
      console.error("Error starting recording:", error);
      cleanup();
      setStatus('idle');
    }
  };

  const stopRecording = () => {
    if (status === 'recording') {
      setStatus('processing');
      mediaRecorderRef.current?.stop();
    }
  };

  return { status, startRecording, stopRecording, waveformData };
};