import React, { useState, useEffect } from 'react';
// FIX: Import FeedbackData type for structured AI feedback.
import { Recording, FeedbackData } from '../types';
import { getRecitationFeedback } from '../services/geminiService';
import { CloseIcon, SparklesIcon } from './icons';

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  recording: Recording;
}

export const FeedbackModal: React.FC<FeedbackModalProps> = ({ isOpen, onClose, recording }) => {
  const [verse, setVerse] = useState('');
  // FIX: Change feedback state to handle a structured object or null.
  const [feedback, setFeedback] = useState<FeedbackData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Reset state when the modal is closed or the recording changes
  useEffect(() => {
    if (!isOpen) {
      setTimeout(() => {
        setVerse('');
        // FIX: Reset feedback state to null.
        setFeedback(null);
        setError('');
        setIsLoading(false);
      }, 300); // Delay reset until after close animation
    }
  }, [isOpen]);

  const handleGetFeedback = async () => {
    if (!verse.trim()) {
      setError('Please enter the verse you recited.');
      return;
    }
    setIsLoading(true);
    setError('');
    // FIX: Clear previous feedback before new request.
    setFeedback(null);
    try {
      const result = await getRecitationFeedback(verse);
      setFeedback(result);
    } catch (err) {
      // FIX: Display a more user-friendly error message from the thrown error.
      setError(err instanceof Error ? err.message : 'Failed to get feedback. Please try again later.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-950 bg-opacity-80 backdrop-blur-md flex justify-center items-center z-50 p-4 transition-opacity duration-300" onClick={onClose}>
      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl w-full max-w-2xl transform transition-all p-6 sm:p-8 relative" onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-500 hover:text-white transition-colors" aria-label="Close modal">
          <CloseIcon className="h-6 w-6" />
        </button>
        
        <div className="flex items-center mb-4">
          <SparklesIcon className="h-8 w-8 text-sky-400 mr-3 flex-shrink-0"/>
          <h2 className="text-2xl font-bold text-white">AI Tajweed Analysis</h2>
        </div>
        
        <p className="text-slate-400 mb-4">
          Enter the Quranic verse you recited for AI-powered feedback. For example, "بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ".
        </p>

        <textarea
          dir="rtl"
          className="w-full p-3 bg-slate-950 border border-slate-700 rounded-lg text-white font-amiri text-2xl placeholder-slate-500 focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition mb-4 resize-none"
          rows={3}
          placeholder="اكتب الآية هنا..."
          value={verse}
          onChange={(e) => setVerse(e.target.value)}
        />

        <button
          onClick={handleGetFeedback}
          disabled={isLoading}
          className="w-full bg-sky-500 text-slate-950 font-bold py-3 px-4 rounded-lg hover:bg-sky-400 transition-colors disabled:bg-slate-600 disabled:cursor-not-allowed flex items-center justify-center text-base"
        >
          {isLoading ? (
            <>
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Analyzing Recitation...
            </>
          ) : (
            'Analyze Recitation'
          )}
        </button>

        {error && <p className="text-red-400 mt-4 text-center">{error}</p>}

        {/* FIX: Rework rendering logic to display structured feedback data instead of a markdown string. */}
        {feedback && (
          <div className="mt-6 p-4 bg-slate-950/70 border border-slate-800 rounded-lg max-h-60 overflow-y-auto text-sm">
            <h3 className="text-lg font-semibold text-sky-300 mb-3">Analysis Results</h3>
            <div className="space-y-4 text-slate-300">
              <p className="italic">"{feedback.positiveReinforcement}"</p>
              
              <div>
                <h4 className="font-semibold text-slate-100 mb-1">Points of Excellence</h4>
                <ul className="list-disc list-inside space-y-1 pl-2">
                  {feedback.pointsOfExcellence.map((point, i) => <li key={`excellence-${i}`}>{point}</li>)}
                </ul>
              </div>
              
              <div>
                <h4 className="font-semibold text-slate-100 mb-1">Areas for Refinement</h4>
                <ol className="list-decimal list-inside space-y-2 pl-2">
                  {feedback.areasForRefinement.map((item, i) => (
                    <li key={`refinement-${i}`}>
                      <strong className="text-sky-400">{item.rule}:</strong> {item.explanation}
                    </li>
                  ))}
                </ol>
              </div>
              
              <div>
                <h4 className="font-semibold text-slate-100 mb-1">Practice Tip</h4>
                <p>{feedback.practiceTip}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
