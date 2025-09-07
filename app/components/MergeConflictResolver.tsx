'use client';

import React, { useState, useEffect } from 'react';

interface BranchDiff {
  field: string;
  originalValue: string;
  newValue: string;
  changeType: 'added' | 'modified' | 'removed';
  conflicted: boolean;
}

interface ConflictResolution {
  field: string;
  resolution: 'original' | 'new' | 'merge' | 'custom';
  customValue?: string;
  aiSuggestion?: string;
}

interface MergeConflictResolverProps {
  postId: number;
  fromBranch: string;
  toBranch: string;
  conflicts: BranchDiff[];
  onResolve?: (resolutions: ConflictResolution[]) => void;
  onCancel?: () => void;
}

const MergeConflictResolver: React.FC<MergeConflictResolverProps> = ({
  postId,
  fromBranch,
  toBranch,
  conflicts,
  onResolve,
  onCancel
}) => {
  const [resolutions, setResolutions] = useState<ConflictResolution[]>([]);
  const [loading, setLoading] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<Record<string, string>>({});
  const [activeTab, setActiveTab] = useState(0);

  useEffect(() => {
    // Initialize resolutions for each conflict
    const initialResolutions = conflicts.map(conflict => ({
      field: conflict.field,
      resolution: 'new' as const, // Default to accepting new changes
      customValue: undefined,
      aiSuggestion: undefined
    }));
    setResolutions(initialResolutions);
  }, [conflicts]);

  const handleGenerateAISuggestions = async () => {
    setLoading(true);
    try {
      // This would call an AI service to suggest conflict resolutions
      // For now, we'll create mock suggestions
      const suggestions: Record<string, string> = {};
      
      conflicts.forEach(conflict => {
        if (conflict.field === 'title') {
          suggestions[conflict.field] = `Enhanced ${conflict.originalValue} with ${conflict.newValue.split(' ').slice(-2).join(' ')}`;
        } else if (conflict.field === 'content') {
          suggestions[conflict.field] = `${conflict.originalValue}\n\n--- Updated Content ---\n${conflict.newValue}`;
        } else {
          suggestions[conflict.field] = conflict.newValue; // Default to new value
        }
      });
      
      setAiSuggestions(suggestions);
      
      // Update resolutions with AI suggestions
      setResolutions(prev => prev.map(res => ({
        ...res,
        aiSuggestion: suggestions[res.field]
      })));
      
    } catch (error) {
      console.error('Failed to generate AI suggestions:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateResolution = (field: string, updates: Partial<ConflictResolution>) => {
    setResolutions(prev => prev.map(res => 
      res.field === field ? { ...res, ...updates } : res
    ));
  };

  const getResolutionPreview = (conflict: BranchDiff, resolution: ConflictResolution) => {
    switch (resolution.resolution) {
      case 'original':
        return conflict.originalValue;
      case 'new':
        return conflict.newValue;
      case 'merge':
        return `${conflict.originalValue}\n\n${conflict.newValue}`;
      case 'custom':
        return resolution.customValue || '';
      default:
        return conflict.newValue;
    }
  };

  const handleResolve = () => {
    if (onResolve) {
      onResolve(resolutions);
    }
  };

  const conflict = conflicts[activeTab];
  const resolution = resolutions[activeTab];

  if (!conflict || !resolution) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg max-w-6xl w-full mx-4 max-h-full overflow-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-bold text-gray-900">🔀 Resolve Merge Conflicts</h2>
            <p className="text-sm text-gray-600">
              Merging {fromBranch} → {toBranch} • {conflicts.length} conflict(s) found
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleGenerateAISuggestions}
              disabled={loading}
              className="bg-purple-500 text-white px-4 py-2 rounded-md hover:bg-purple-600 text-sm disabled:opacity-50"
            >
              {loading ? '🧠 Generating...' : '🧠 AI Suggestions'}
            </button>
            {onCancel && (
              <button
                onClick={onCancel}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Conflict Tabs */}
        <div className="flex border-b border-gray-200 overflow-x-auto">
          {conflicts.map((conflict, index) => (
            <button
              key={conflict.field}
              onClick={() => setActiveTab(index)}
              className={`px-6 py-3 text-sm font-medium whitespace-nowrap ${
                activeTab === index
                  ? 'border-b-2 border-red-500 text-red-600 bg-red-50'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {conflict.field} ⚠️
            </button>
          ))}
        </div>

        {/* Conflict Resolution Interface */}
        <div className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Options Panel */}
            <div className="space-y-4">
              <h3 className="font-semibold text-gray-900">Resolution Options</h3>
              
              {/* Keep Original */}
              <div className="border rounded-lg p-4">
                <label className="flex items-start gap-3">
                  <input
                    type="radio"
                    name={`resolution-${conflict.field}`}
                    checked={resolution.resolution === 'original'}
                    onChange={() => updateResolution(conflict.field, { resolution: 'original' })}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <div className="font-medium text-gray-900 mb-1">
                      🔵 Keep Original ({fromBranch})
                    </div>
                    <div className="text-sm text-gray-600 bg-blue-50 p-3 rounded border max-h-40 overflow-auto">
                      {conflict.originalValue || <em>Empty</em>}
                    </div>
                  </div>
                </label>
              </div>

              {/* Accept New */}
              <div className="border rounded-lg p-4">
                <label className="flex items-start gap-3">
                  <input
                    type="radio"
                    name={`resolution-${conflict.field}`}
                    checked={resolution.resolution === 'new'}
                    onChange={() => updateResolution(conflict.field, { resolution: 'new' })}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <div className="font-medium text-gray-900 mb-1">
                      🟢 Accept New ({toBranch})
                    </div>
                    <div className="text-sm text-gray-600 bg-green-50 p-3 rounded border max-h-40 overflow-auto">
                      {conflict.newValue || <em>Empty</em>}
                    </div>
                  </div>
                </label>
              </div>

              {/* Merge Both */}
              <div className="border rounded-lg p-4">
                <label className="flex items-start gap-3">
                  <input
                    type="radio"
                    name={`resolution-${conflict.field}`}
                    checked={resolution.resolution === 'merge'}
                    onChange={() => updateResolution(conflict.field, { resolution: 'merge' })}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <div className="font-medium text-gray-900 mb-1">
                      🔀 Merge Both
                    </div>
                    <div className="text-sm text-gray-600 bg-yellow-50 p-3 rounded border max-h-40 overflow-auto">
                      {conflict.originalValue && <div className="mb-2">{conflict.originalValue}</div>}
                      {conflict.originalValue && conflict.newValue && <hr className="my-2" />}
                      {conflict.newValue && <div>{conflict.newValue}</div>}
                    </div>
                  </div>
                </label>
              </div>

              {/* AI Suggestion */}
              {aiSuggestions[conflict.field] && (
                <div className="border rounded-lg p-4 border-purple-200">
                  <label className="flex items-start gap-3">
                    <input
                      type="radio"
                      name={`resolution-${conflict.field}`}
                      checked={resolution.resolution === 'custom' && resolution.customValue === aiSuggestions[conflict.field]}
                      onChange={() => updateResolution(conflict.field, { 
                        resolution: 'custom', 
                        customValue: aiSuggestions[conflict.field] 
                      })}
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <div className="font-medium text-purple-900 mb-1">
                        🧠 AI Suggestion
                      </div>
                      <div className="text-sm text-gray-600 bg-purple-50 p-3 rounded border max-h-40 overflow-auto">
                        {aiSuggestions[conflict.field]}
                      </div>
                    </div>
                  </label>
                </div>
              )}

              {/* Custom Resolution */}
              <div className="border rounded-lg p-4">
                <label className="flex items-start gap-3">
                  <input
                    type="radio"
                    name={`resolution-${conflict.field}`}
                    checked={resolution.resolution === 'custom' && resolution.customValue !== aiSuggestions[conflict.field]}
                    onChange={() => updateResolution(conflict.field, { resolution: 'custom', customValue: '' })}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <div className="font-medium text-gray-900 mb-1">
                      ✏️ Custom Resolution
                    </div>
                    {resolution.resolution === 'custom' && (
                      <textarea
                        value={resolution.customValue || ''}
                        onChange={(e) => updateResolution(conflict.field, { customValue: e.target.value })}
                        placeholder="Enter your custom resolution..."
                        className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                        rows={6}
                      />
                    )}
                  </div>
                </label>
              </div>
            </div>

            {/* Preview Panel */}
            <div>
              <h3 className="font-semibold text-gray-900 mb-4">Resolution Preview</h3>
              <div className="border rounded-lg p-4 bg-gray-50 min-h-96">
                <div className="font-medium text-gray-700 mb-2">
                  Final {conflict.field}:
                </div>
                <div className="text-sm text-gray-900 bg-white p-3 rounded border whitespace-pre-wrap">
                  {getResolutionPreview(conflict, resolution) || <em className="text-gray-500">Empty</em>}
                </div>
              </div>

              {/* Progress Indicator */}
              <div className="mt-4 p-3 bg-blue-50 rounded border border-blue-200">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-blue-800">
                    Progress: {activeTab + 1} of {conflicts.length} conflicts
                  </span>
                  <span className="text-blue-600">
                    {Math.round(((activeTab + 1) / conflicts.length) * 100)}% complete
                  </span>
                </div>
                <div className="mt-2 w-full bg-blue-200 rounded-full h-2">
                  <div 
                    className="bg-blue-500 h-2 rounded-full transition-all"
                    style={{ width: `${((activeTab + 1) / conflicts.length) * 100}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab(Math.max(0, activeTab - 1))}
              disabled={activeTab === 0}
              className="px-3 py-2 text-gray-600 hover:text-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              ← Previous
            </button>
            <button
              onClick={() => setActiveTab(Math.min(conflicts.length - 1, activeTab + 1))}
              disabled={activeTab === conflicts.length - 1}
              className="px-3 py-2 text-gray-600 hover:text-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next →
            </button>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={onCancel}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleResolve}
              className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
            >
              ✅ Resolve All Conflicts
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MergeConflictResolver;
