import React, { useState } from 'react';

interface AIInsightsModalProps {
  isOpen: boolean;
  onClose: () => void;
  year: number;
  teamCode: string;
  teamName: string;
}

type AnalysisType = 'trends' | 'draft';

export default function AIInsightsModal({ isOpen, onClose, year, teamCode, teamName }: AIInsightsModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [analysisType, setAnalysisType] = useState<AnalysisType>('trends');

  const fetchAnalysis = async (type: AnalysisType) => {
    setLoading(true);
    setError(null);
    setAnalysis(null);
    setAnalysisType(type);

    try {
      const endpoint = type === 'trends' 
        ? `/api/archive/${year}/ai/trends/${teamCode}`
        : `/api/archive/${year}/ai/draft/${teamCode}`;
      
      const response = await fetch(endpoint);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Analysis failed');
      }

      setAnalysis(data.analysis);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate analysis');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700 bg-gradient-to-r from-blue-600/20 to-purple-600/20">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z" />
              </svg>
              AI Insights: {teamName}
            </h2>
            <p className="text-sm text-slate-400">{year} Season Analysis</p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-slate-700 rounded-lg transition-colors text-slate-400 hover:text-white"
          >
            ✕
          </button>
        </div>

        {/* Analysis Type Buttons */}
        <div className="flex gap-2 px-6 py-4 bg-slate-800/50">
          <button
            onClick={() => fetchAnalysis('trends')}
            disabled={loading}
            className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              analysisType === 'trends' && analysis
                ? 'bg-blue-600 text-white'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            } disabled:opacity-50`}
          >
            📈 Season Trends
          </button>
          <button
            onClick={() => fetchAnalysis('draft')}
            disabled={loading}
            className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              analysisType === 'draft' && analysis
                ? 'bg-purple-600 text-white'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            } disabled:opacity-50`}
          >
            💵 Draft Analysis
          </button>
        </div>

        {/* Content Area */}
        <div className="px-6 py-4 overflow-y-auto max-h-[50vh]">
          {!loading && !analysis && !error && (
            <div className="text-center py-12 text-slate-400">
              <div className="text-4xl mb-3">🧠</div>
              <p className="text-lg font-medium">Select an analysis type above</p>
              <p className="text-sm mt-2">AI will analyze {teamName}'s {year} season data</p>
            </div>
          )}

          {loading && (
            <div className="text-center py-12 text-slate-400">
              <div className="animate-pulse text-4xl mb-3">⚡</div>
              <p className="text-lg font-medium">Generating AI analysis...</p>
              <p className="text-sm mt-2">This may take a few seconds</p>
            </div>
          )}

          {error && (
            <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-4 text-red-300">
              <div className="font-medium mb-1">⚠️ Analysis Error</div>
              <p className="text-sm">{error}</p>
              {error.includes('API key') && (
                <p className="text-xs mt-2 text-red-400">
                  Add <code className="bg-red-900/50 px-1 rounded">GEMINI_API_KEY</code> to your .env file
                </p>
              )}
            </div>
          )}

          {analysis && (
            <div className="prose prose-invert prose-sm max-w-none">
              {analysis.split('\n\n').map((paragraph, i) => (
                <p key={i} className="text-slate-300 leading-relaxed mb-4">
                  {paragraph}
                </p>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-700 bg-slate-800/30 text-xs text-slate-500 flex justify-between">
          <span>Powered by Google Gemini AI</span>
          {analysis && (
            <button 
              onClick={() => navigator.clipboard.writeText(analysis)}
              className="hover:text-slate-300 transition-colors"
            >
              📋 Copy
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
