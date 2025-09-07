'use client';

import React, { useState, useEffect } from 'react';

interface BranchDiff {
  field: string;
  originalValue: string;
  newValue: string;
  changeType: 'added' | 'modified' | 'removed';
  conflicted: boolean;
}

interface AnalysisResult {
  changesSummary: string;
  impactScore: number;
  changeTypes: string[];
  recommendedActions: string[];
  aiRecommendations?: string;
}

interface BranchDiffViewerProps {
  postId: number;
  fromBranch: string;
  toBranch: string;
  onClose?: () => void;
}

const BranchDiffViewer: React.FC<BranchDiffViewerProps> = ({
  postId,
  fromBranch,
  toBranch,
  onClose
}) => {
  const [diffs, setDiffs] = useState<BranchDiff[]>([]);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'side-by-side' | 'unified'>('side-by-side');
  const [contentMode, setContentMode] = useState<'html' | 'text'>('text');

  useEffect(() => {
    loadDiff();
  }, [postId, fromBranch, toBranch]);

  const loadDiff = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/blog/branches/diff?postId=${postId}&fromBranch=${fromBranch}&toBranch=${toBranch}`
      );

      if (!response.ok) {
        throw new Error('Failed to load diff');
      }

      const data = await response.json();
      setDiffs(data.diffs || []);
      setAnalysis(data.analysis || null);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const getChangeTypeColor = (changeType: string) => {
    switch (changeType) {
      case 'added': return 'text-green-600 bg-green-50';
      case 'removed': return 'text-red-600 bg-red-50';
      case 'modified': return 'text-blue-600 bg-blue-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getChangeTypeIcon = (changeType: string) => {
    switch (changeType) {
      case 'added': return '➕';
      case 'removed': return '➖';
      case 'modified': return '✏️';
      default: return '📝';
    }
  };

  const stripHtmlTags = (html: string) => {
    return html
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .replace(/&nbsp;/g, ' ') // Replace &nbsp; with spaces
      .replace(/&amp;/g, '&') // Replace &amp; with &
      .replace(/&lt;/g, '<') // Replace &lt; with <
      .replace(/&gt;/g, '>') // Replace &gt; with >
      .replace(/&quot;/g, '"') // Replace &quot; with "
      .replace(/&#39;/g, "'") // Replace &#39; with '
      .replace(/\\+"/g, '"') // Remove excessive backslash escaping
      .replace(/\s+/g, ' ') // Replace multiple whitespace with single space
      .trim();
  };

  const processContentForDisplay = (content: string) => {
    return contentMode === 'text' ? stripHtmlTags(content) : content;
  };

  const renderTextDiff = (original: string, modified: string) => {
    // Process content based on display mode
    const processedOriginal = processContentForDisplay(original);
    const processedModified = processContentForDisplay(modified);
    
    // Simple line-by-line comparison
    const originalLines = processedOriginal.split('\n');
    const modifiedLines = processedModified.split('\n');
    const maxLines = Math.max(originalLines.length, modifiedLines.length);

    return (
      <div className="grid grid-cols-2 gap-4 text-sm font-mono">
        <div>
          <div className="font-semibold text-red-600 mb-2">Original ({fromBranch})</div>
          <div className="bg-red-50 border border-red-200 rounded p-3 h-64 overflow-auto">
            {originalLines.map((line, index) => (
              <div key={index} className="whitespace-pre-wrap">
                <span className="text-gray-400 mr-2">{index + 1}</span>
                {line}
              </div>
            ))}
          </div>
        </div>
        <div>
          <div className="font-semibold text-green-600 mb-2">Modified ({toBranch})</div>
          <div className="bg-green-50 border border-green-200 rounded p-3 h-64 overflow-auto">
            {modifiedLines.map((line, index) => (
              <div key={index} className="whitespace-pre-wrap">
                <span className="text-gray-400 mr-2">{index + 1}</span>
                {line}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const renderUnifiedDiff = (original: string, modified: string) => {
    // Process content based on display mode
    const processedOriginal = processContentForDisplay(original);
    const processedModified = processContentForDisplay(modified);
    
    const originalLines = processedOriginal.split('\n');
    const modifiedLines = processedModified.split('\n');
    
    return (
      <div className="text-sm font-mono">
        <div className="bg-gray-50 border rounded p-3 h-64 overflow-auto">
          <div className="text-red-600 mb-2">- {fromBranch}</div>
          {originalLines.map((line, index) => (
            <div key={`original-${index}`} className="text-red-600">
              <span className="text-gray-400 mr-2">-{index + 1}</span>
              {line}
            </div>
          ))}
          <div className="text-green-600 mt-4 mb-2">+ {toBranch}</div>
          {modifiedLines.map((line, index) => (
            <div key={`modified-${index}`} className="text-green-600">
              <span className="text-gray-400 mr-2">+{index + 1}</span>
              {line}
            </div>
          ))}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 max-w-6xl w-full mx-4 max-h-full overflow-auto">
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent"></div>
            <span className="ml-2">Loading diff...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-red-600">Error Loading Diff</h2>
            {onClose && (
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            )}
          </div>
          <p className="text-red-600">{error}</p>
          <button
            onClick={onClose}
            className="mt-4 px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-6xl w-full mx-4 max-h-full overflow-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900">
            Comparing {fromBranch} → {toBranch}
          </h2>
          <div className="flex items-center gap-2">
            <select
              value={viewMode}
              onChange={(e) => setViewMode(e.target.value as 'side-by-side' | 'unified')}
              className="px-3 py-1 border border-gray-300 rounded text-sm"
            >
              <option value="side-by-side">Side by Side</option>
              <option value="unified">Unified</option>
            </select>
            <select
              value={contentMode}
              onChange={(e) => setContentMode(e.target.value as 'html' | 'text')}
              className="px-3 py-1 border border-gray-300 rounded text-sm"
            >
              <option value="text">📝 Text Only</option>
              <option value="html">🌐 HTML</option>
            </select>
            {onClose && (
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Analysis Summary */}
        {analysis && (
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h3 className="font-semibold text-blue-800 mb-2">Change Analysis</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <span className="font-medium">Impact Score:</span>
                <div className="mt-1">
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full ${
                        analysis.impactScore > 75 ? 'bg-red-500' :
                        analysis.impactScore > 50 ? 'bg-yellow-500' : 'bg-green-500'
                      }`}
                      style={{ width: `${analysis.impactScore}%` }}
                    ></div>
                  </div>
                  <span className="text-xs text-gray-600">{analysis.impactScore}% impact</span>
                </div>
              </div>
              <div>
                <span className="font-medium">Changes:</span>
                <p className="text-gray-600 mt-1">{analysis.changesSummary}</p>
              </div>
              <div>
                <span className="font-medium">Change Types:</span>
                <div className="mt-1">
                  {analysis.changeTypes.map((type, index) => (
                    <span
                      key={index}
                      className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded mr-1 mb-1"
                    >
                      {type}
                    </span>
                  ))}
                </div>
              </div>
            </div>
            {analysis.recommendedActions.length > 0 && (
              <div className="mt-3">
                <span className="font-medium">Recommended Actions:</span>
                <ul className="list-disc list-inside text-sm text-gray-600 mt-1">
                  {analysis.recommendedActions.map((action, index) => (
                    <li key={index}>{action}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Diff Content */}
        {diffs.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>No differences found between the selected branches.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {diffs.map((diff, index) => (
              <div key={index} className="border border-gray-200 rounded-lg">
                <div className={`px-4 py-2 border-b border-gray-200 ${getChangeTypeColor(diff.changeType)}`}>
                  <div className="flex items-center justify-between">
                    <span className="font-medium">
                      {getChangeTypeIcon(diff.changeType)} {diff.field}
                    </span>
                    <span className="text-xs capitalize">
                      {diff.changeType}
                    </span>
                  </div>
                </div>
                <div className="p-4">
                  {diff.changeType === 'added' ? (
                    <div className="bg-green-50 border border-green-200 rounded p-3">
                      <div className="font-semibold text-green-600 mb-2">Added Content</div>
                      <div className="whitespace-pre-wrap text-sm">{processContentForDisplay(diff.newValue)}</div>
                    </div>
                  ) : diff.changeType === 'removed' ? (
                    <div className="bg-red-50 border border-red-200 rounded p-3">
                      <div className="font-semibold text-red-600 mb-2">Removed Content</div>
                      <div className="whitespace-pre-wrap text-sm">{processContentForDisplay(diff.originalValue)}</div>
                    </div>
                  ) : (
                    viewMode === 'side-by-side' 
                      ? renderTextDiff(diff.originalValue, diff.newValue)
                      : renderUnifiedDiff(diff.originalValue, diff.newValue)
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
          >
            Close
          </button>
          <button
            onClick={() => window.print()}
            className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
          >
            📄 Print
          </button>
        </div>
      </div>
    </div>
  );
};

export default BranchDiffViewer;
