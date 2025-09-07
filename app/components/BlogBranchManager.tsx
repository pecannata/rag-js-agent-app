'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import BranchDiffViewer from './BranchDiffViewer';

interface BlogBranch {
  branchId: string;
  postId: number;
  branchName: string;
  parentBranchId?: string;
  branchType: 'main' | 'feature' | 'hotfix' | 'draft' | 'review';
  title: string;
  content?: string;
  excerpt?: string;
  author?: string;
  status?: string;
  tags?: string;
  createdBy?: string;
  createdDate: string;
  modifiedBy?: string;
  modifiedDate?: string;
  isActive: boolean;
  isMerged: boolean;
  mergedDate?: string;
  mergedBy?: string;
}

interface BlogBranchManagerProps {
  postId: number;
  onBranchSwitch?: (branch: BlogBranch) => void;
  onClose?: () => void;
}

const BlogBranchManager: React.FC<BlogBranchManagerProps> = ({
  postId,
  onBranchSwitch,
  onClose
}) => {
  const { data: session } = useSession();
  const [branches, setBranches] = useState<BlogBranch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedBranches, setSelectedBranches] = useState<{ from: string | null; to: string | null }>({
    from: null,
    to: null
  });
  
  // Modals and UI state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showMergeModal, setShowMergeModal] = useState(false);
  const [showDiffViewer, setShowDiffViewer] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'branches' | 'history'>('branches');
  
  // Create branch form
  const [createForm, setCreateForm] = useState({
    branchName: '',
    branchType: 'feature' as BlogBranch['branchType'],
    parentBranchId: '',
    initialTitle: '',
    initialContent: ''
  });
  
  // Merge form
  const [mergeForm, setMergeForm] = useState({
    strategy: 'auto' as 'auto' | 'manual' | 'ai-assisted',
    commitMessage: ''
  });

  const [history, setHistory] = useState<any[]>([]);

  useEffect(() => {
    loadBranches();
    loadHistory();
  }, [postId]);

  const loadBranches = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/blog/branches?postId=${postId}`, {
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error('Failed to load branches');
      }

      const data = await response.json();
      setBranches(data.branches || []);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const loadHistory = async () => {
    try {
      const response = await fetch(`/api/blog/branches/history?postId=${postId}`);
      if (response.ok) {
        const data = await response.json();
        setHistory(data.history || []);
      }
    } catch (err) {
      console.error('Failed to load history:', err);
    }
  };

  const handleCreateBranch = async () => {
    if (!createForm.branchName.trim()) {
      alert('Branch name is required');
      return;
    }

    try {
      const response = await fetch('/api/blog/branches', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json'
        },
        credentials: 'include', // Ensure cookies are sent
        body: JSON.stringify({
          postId,
          branchName: createForm.branchName,
          parentBranchId: createForm.parentBranchId || null,
          branchType: createForm.branchType,
          initialChanges: {
            title: createForm.initialTitle || undefined,
            content: createForm.initialContent || undefined
          }
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error || errorData.details || `Failed to create branch (${response.status})`;
        console.error('Branch creation error:', errorMessage);
        throw new Error(errorMessage);
      }

      setShowCreateModal(false);
      setCreateForm({
        branchName: '',
        branchType: 'feature',
        parentBranchId: '',
        initialTitle: '',
        initialContent: ''
      });
      
      await loadBranches();
      await loadHistory();
    } catch (err) {
      alert((err as Error).message);
    }
  };

  const handleMergeBranches = async () => {
    if (!selectedBranches.from || !selectedBranches.to) {
      alert('Please select source and target branches');
      return;
    }

    try {
      const response = await fetch('/api/blog/branches/merge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          postId,
          fromBranch: selectedBranches.from,
          toBranch: selectedBranches.to,
          strategy: mergeForm.strategy,
          commitMessage: mergeForm.commitMessage || `Merge ${selectedBranches.from} into ${selectedBranches.to}`
        })
      });

      if (!response.ok) {
        throw new Error('Failed to merge branches');
      }

      const data = await response.json();
      if (data.success) {
        alert('Branches merged successfully!');
        setShowMergeModal(false);
        setSelectedBranches({ from: null, to: null });
        setMergeForm({ strategy: 'auto', commitMessage: '' });
        await loadBranches();
        await loadHistory();
      } else {
        alert('Merge failed: ' + (data.conflicts ? 'Conflicts detected' : 'Unknown error'));
      }
    } catch (err) {
      alert((err as Error).message);
    }
  };

  const handleDeleteBranch = async (branchId: string, branchName: string) => {
    if (!confirm(`Are you sure you want to delete branch "${branchName}"?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/blog/branches?postId=${postId}&branchId=${branchId}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Failed to delete branch');
      }

      await loadBranches();
      await loadHistory();
    } catch (err) {
      alert((err as Error).message);
    }
  };

  const getBranchTypeColor = (type: string) => {
    switch (type) {
      case 'main': return 'bg-purple-100 text-purple-800';
      case 'feature': return 'bg-blue-100 text-blue-800';
      case 'hotfix': return 'bg-red-100 text-red-800';
      case 'draft': return 'bg-yellow-100 text-yellow-800';
      case 'review': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getBranchTypeIcon = (type: string) => {
    switch (type) {
      case 'main': return '🎯';
      case 'feature': return '🚀';
      case 'hotfix': return '🔥';
      case 'draft': return '📝';
      case 'review': return '👀';
      default: return '🌿';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 max-w-4xl w-full mx-4 max-h-full overflow-auto">
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent"></div>
            <span className="ml-2">Loading branches...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg max-w-6xl w-full mx-4 max-h-full overflow-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-bold text-gray-900">🌿 Blog Post Versions</h2>
            <p className="text-sm text-gray-600">Manage branches and version history for Post #{postId}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowCreateModal(true)}
              className="bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600 text-sm"
            >
              ➕ New Branch
            </button>
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

        {/* Tab Navigation */}
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab('branches')}
            className={`px-6 py-3 text-sm font-medium ${
              activeTab === 'branches'
                ? 'border-b-2 border-blue-500 text-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            🌿 Branches ({branches.length})
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-6 py-3 text-sm font-medium ${
              activeTab === 'history'
                ? 'border-b-2 border-blue-500 text-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            📋 History ({history.length})
          </button>
        </div>

        {/* Main Content */}
        <div className="p-6">
          {error && (
            <div className="bg-red-50 border border-red-200 p-3 rounded-md mb-4">
              <p className="text-red-600">{error}</p>
            </div>
          )}

          {activeTab === 'branches' ? (
            <>
              {/* Branch Actions */}
              <div className="flex items-center gap-2 mb-4">
                <select
                  value={selectedBranches.from || ''}
                  onChange={(e) => setSelectedBranches(prev => ({ ...prev, from: e.target.value || null }))}
                  className="px-3 py-2 border border-gray-300 rounded text-sm"
                  disabled={branches.length === 0}
                >
                  <option value="">Select source branch...</option>
                  <option value="main">🎯 Main Post (published version)</option>
                  {branches.filter(b => b.isActive).map(branch => (
                    <option key={branch.branchId} value={branch.branchId}>
                      {branch.branchName} ({branch.branchType})
                    </option>
                  ))}
                </select>
                <span>→</span>
                <select
                  value={selectedBranches.to || ''}
                  onChange={(e) => setSelectedBranches(prev => ({ ...prev, to: e.target.value || null }))}
                  className="px-3 py-2 border border-gray-300 rounded text-sm"
                  disabled={branches.length === 0}
                >
                  <option value="">Select target branch...</option>
                  {selectedBranches.from !== 'main' && (
                    <option value="main">🎯 Main Post (published version)</option>
                  )}
                  {branches.filter(b => b.isActive && b.branchId !== selectedBranches.from).map(branch => (
                    <option key={branch.branchId} value={branch.branchId}>
                      {branch.branchName} ({branch.branchType})
                    </option>
                  ))}
                </select>
                
                <button
                  onClick={() => setShowDiffViewer(true)}
                  disabled={!selectedBranches.from || !selectedBranches.to}
                  className="bg-blue-500 text-white px-3 py-2 rounded text-sm hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  👀 Compare
                </button>
                <button
                  onClick={() => setShowMergeModal(true)}
                  disabled={!selectedBranches.from || !selectedBranches.to}
                  className="bg-purple-500 text-white px-3 py-2 rounded text-sm hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  🔀 Merge
                </button>
              </div>

              {/* Branches List */}
              <div className="space-y-3">
                {branches.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <p>No branches found. Create your first branch to get started!</p>
                  </div>
                ) : (
                  branches.map(branch => (
                    <div
                      key={branch.branchId}
                      className={`border rounded-lg p-4 ${
                        !branch.isActive ? 'bg-gray-50 opacity-75' : 'bg-white'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <input
                            type="radio"
                            name="fromBranch"
                            checked={selectedBranches.from === branch.branchId}
                            onChange={() => setSelectedBranches(prev => ({ ...prev, from: branch.branchId }))}
                            className="text-blue-500"
                            disabled={!branch.isActive}
                          />
                          <input
                            type="radio"
                            name="toBranch"
                            checked={selectedBranches.to === branch.branchId}
                            onChange={() => setSelectedBranches(prev => ({ ...prev, to: branch.branchId }))}
                            className="text-green-500"
                            disabled={!branch.isActive}
                          />
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-gray-900">{branch.branchName}</span>
                              <span className={`px-2 py-1 text-xs rounded-full ${getBranchTypeColor(branch.branchType)}`}>
                                {getBranchTypeIcon(branch.branchType)} {branch.branchType}
                              </span>
                              {branch.isMerged && (
                                <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">
                                  ✅ Merged
                                </span>
                              )}
                              {!branch.isActive && (
                                <span className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-800">
                                  🗑️ Deleted
                                </span>
                              )}
                            </div>
                            <div className="text-sm text-gray-600 mt-1">
                              <span className="font-medium">{branch.title}</span>
                              <br />
                              Created by {branch.createdBy} on {formatDate(branch.createdDate)}
                              {branch.modifiedDate && branch.modifiedDate !== branch.createdDate && (
                                <span> • Modified {formatDate(branch.modifiedDate)}</span>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-1">
                          {onBranchSwitch && (
                            <button
                              onClick={() => onBranchSwitch(branch)}
                              className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                              title="Switch to this branch"
                            >
                              🔄
                            </button>
                          )}
                          {branch.isActive && branch.branchType !== 'main' && (
                            <button
                              onClick={() => handleDeleteBranch(branch.branchId, branch.branchName)}
                              className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                              title="Delete branch"
                            >
                              🗑️
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </>
          ) : (
            /* History Tab */
            <div className="space-y-3">
              {history.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <p>No history found.</p>
                </div>
              ) : (
                history.map((entry, index) => (
                  <div key={index} className="border rounded-lg p-4 bg-white">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 text-sm font-medium">
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-gray-900">{entry.change_type}</span>
                          <span className="text-sm text-gray-500">by {entry.changed_by}</span>
                          <span className="text-sm text-gray-500">
                            {formatDate(entry.changed_date)}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600">{entry.change_description}</p>
                        {entry.field_name && (
                          <p className="text-xs text-gray-500 mt-1">Field: {entry.field_name}</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Create Branch Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-60">
            <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4">
              <h3 className="text-lg font-bold mb-4">Create New Branch</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Branch Name</label>
                  <input
                    type="text"
                    value={createForm.branchName}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, branchName: e.target.value }))}
                    placeholder="e.g., feature/new-content, hotfix/typo-fix"
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Branch Type</label>
                    <select
                      value={createForm.branchType}
                      onChange={(e) => setCreateForm(prev => ({ ...prev, branchType: e.target.value as BlogBranch['branchType'] }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="feature">🚀 Feature</option>
                      <option value="hotfix">🔥 Hotfix</option>
                      <option value="draft">📝 Draft</option>
                      <option value="review">👀 Review</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Parent Branch</label>
                    <select
                      value={createForm.parentBranchId}
                      onChange={(e) => setCreateForm(prev => ({ ...prev, parentBranchId: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">From main post</option>
                      {branches.filter(b => b.isActive).map(branch => (
                        <option key={branch.branchId} value={branch.branchId}>
                          {branch.branchName}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Initial Title (Optional)</label>
                  <input
                    type="text"
                    value={createForm.initialTitle}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, initialTitle: e.target.value }))}
                    placeholder="Override post title for this branch"
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              
              <div className="flex justify-end gap-2 mt-6">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateBranch}
                  className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
                >
                  Create Branch
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Merge Modal */}
        {showMergeModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-60">
            <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4">
              <h3 className="text-lg font-bold mb-4">Merge Branches</h3>
              
              <div className="space-y-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600">
                    Merge <strong>{branches.find(b => b.branchId === selectedBranches.from)?.branchName}</strong> 
                    {' → '}
                    <strong>{branches.find(b => b.branchId === selectedBranches.to)?.branchName}</strong>
                  </p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Merge Strategy</label>
                  <select
                    value={mergeForm.strategy}
                    onChange={(e) => setMergeForm(prev => ({ ...prev, strategy: e.target.value as any }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="auto">🤖 Auto (Automatic merge)</option>
                    <option value="manual">👤 Manual (Manual resolution)</option>
                    <option value="ai-assisted">🧠 AI Assisted (AI conflict resolution)</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Commit Message</label>
                  <input
                    type="text"
                    value={mergeForm.commitMessage}
                    onChange={(e) => setMergeForm(prev => ({ ...prev, commitMessage: e.target.value }))}
                    placeholder="Optional merge commit message"
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              
              <div className="flex justify-end gap-2 mt-6">
                <button
                  onClick={() => setShowMergeModal(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
                <button
                  onClick={handleMergeBranches}
                  className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600"
                >
                  🔀 Merge
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Diff Viewer Modal */}
        {showDiffViewer && selectedBranches.from && selectedBranches.to && (
          <BranchDiffViewer
            postId={postId}
            fromBranch={selectedBranches.from}
            toBranch={selectedBranches.to}
            onClose={() => setShowDiffViewer(false)}
          />
        )}
      </div>
    </div>
  );
};

export default BlogBranchManager;
