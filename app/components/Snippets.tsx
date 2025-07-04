'use client';

import { useState, useEffect } from 'react';

interface Snippet {
  id: string;
  name: string;
  sqlQuery: string;
  userMessage: string;
  keywords: string[];
  createdAt: string;
}

interface SnippetsProps {
  onSelectSnippet: (sqlQuery: string, userMessage: string, keywords: string[]) => void;
  apiKey: string;
}

export default function Snippets({ onSelectSnippet, apiKey }: SnippetsProps) {
  const [snippets, setSnippets] = useState<Snippet[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    sqlQuery: '',
    userMessage: '',
    keywords: [] as string[]
  });
  const [searchFilter, setSearchFilter] = useState('');
  const [isGeneratingKeywords, setIsGeneratingKeywords] = useState(false);
  const [keywordsText, setKeywordsText] = useState('');

  // Load snippets from API and filter from localStorage on mount
  useEffect(() => {
    loadSnippets();
    
    // Load saved filter from localStorage
    const savedFilter = localStorage.getItem('snippets-filter');
    if (savedFilter) {
      setSearchFilter(savedFilter);
    }
  }, []);

  // Save filter to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('snippets-filter', searchFilter);
  }, [searchFilter]);

  const loadSnippets = async () => {
    try {
      const response = await fetch('/api/snippets');
      const data = await response.json();
      if (data.success) {
        setSnippets(data.snippets);
      } else {
        console.error('Failed to load snippets:', data.error);
      }
    } catch (error) {
      console.error('Error loading snippets:', error);
    }
  };

  const saveSnippetToAPI = async (snippet: Snippet, action: 'create' | 'update' | 'delete') => {
    try {
      const response = await fetch('/api/snippets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ snippet, action }),
      });
      
      const data = await response.json();
      if (data.success) {
        setSnippets(data.snippets);
        return true;
      } else {
        console.error('Failed to save snippet:', data.error);
        alert('Failed to save snippet: ' + data.error);
        return false;
      }
    } catch (error) {
      console.error('Error saving snippet:', error);
      alert('Error saving snippet: ' + error);
      return false;
    }
  };

  const handleSave = async () => {
    if (!formData.name.trim() || !formData.sqlQuery.trim() || !formData.userMessage.trim()) {
      alert('Please fill in all fields');
      return;
    }

    let snippet: Snippet;
    let action: 'create' | 'update';

    if (editingId) {
      // Update existing snippet
      snippet = {
        id: editingId,
        ...formData,
        createdAt: snippets.find(s => s.id === editingId)?.createdAt || new Date().toISOString()
      };
      action = 'update';
    } else {
      // Create new snippet
      snippet = {
        id: Date.now().toString(),
        ...formData,
        createdAt: new Date().toISOString()
      };
      action = 'create';
    }

    const success = await saveSnippetToAPI(snippet, action);
    if (success) {
      setFormData({ name: '', sqlQuery: '', userMessage: '', keywords: [] });
      setKeywordsText('');
      setEditingId(null);
      setIsCreating(false);
    }
  };

  const handleEdit = (snippet: Snippet) => {
    setFormData({
      name: snippet.name,
      sqlQuery: snippet.sqlQuery,
      userMessage: snippet.userMessage,
      keywords: snippet.keywords || []
    });
    setKeywordsText((snippet.keywords || []).join(', '));
    setEditingId(snippet.id);
    setIsCreating(true);
  };

  const handleGenerateKeywords = async () => {
    if (!formData.sqlQuery.trim()) {
      alert('Please enter a SQL query first');
      return;
    }
    
    setIsGeneratingKeywords(true);
    
    try {
      const response = await fetch('/api/keywords', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sqlQuery: formData.sqlQuery,
          apiKey: apiKey
        })
      });
      
      const data = await response.json();
      
      if (data.success && data.keywords) {
        const newKeywords = data.keywords;
        setFormData({ ...formData, keywords: newKeywords });
        setKeywordsText(newKeywords.join(', '));
      } else {
        console.error('Failed to generate keywords:', data.error);
        alert('Failed to generate keywords: ' + (data.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error generating keywords:', error);
      alert('Error generating keywords: ' + error);
    } finally {
      setIsGeneratingKeywords(false);
    }
  };

  const handleKeywordsChange = (value: string) => {
    setKeywordsText(value);
    const keywords = value.split(',').map(k => k.trim()).filter(k => k);
    setFormData({ ...formData, keywords });
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this snippet?')) {
      const snippet = snippets.find(s => s.id === id);
      if (snippet) {
        await saveSnippetToAPI(snippet, 'delete');
      }
    }
  };

  const handleCancel = () => {
    setFormData({ name: '', sqlQuery: '', userMessage: '', keywords: [] });
    setKeywordsText('');
    setEditingId(null);
    setIsCreating(false);
  };

  const handleUseSnippet = (snippet: Snippet) => {
    onSelectSnippet(snippet.sqlQuery, snippet.userMessage, snippet.keywords || []);
  };

  // Filter snippets based on SQL query content
  const filteredSnippets = snippets.filter(snippet => 
    snippet.sqlQuery.toLowerCase().includes(searchFilter.toLowerCase()) ||
    snippet.name.toLowerCase().includes(searchFilter.toLowerCase())
  );

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-4 flex justify-between items-center">
        <h2 className="text-xl font-bold text-gray-800">Query Snippets</h2>
        <button
          onClick={() => setIsCreating(true)}
          disabled={isCreating}
          className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 disabled:opacity-50"
        >
          + New Snippet
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {/* Filter Input */}
        {!isCreating && snippets.length > 0 && (
          <div className="bg-white border border-gray-300 rounded-lg p-4 mb-4 shadow-sm">
            <div className="flex items-center gap-3">
              <label className="text-sm font-medium text-gray-700 whitespace-nowrap">
                🔍 Filter:
              </label>
              <input
                type="text"
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                placeholder="Search by snippet name or SQL query..."
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              {searchFilter && (
                <button
                  onClick={() => setSearchFilter('')}
                  className="text-gray-500 hover:text-gray-700 px-2"
                  title="Clear filter"
                >
                  ✕
                </button>
              )}
            </div>
            {searchFilter && (
              <div className="mt-2 text-xs text-gray-600">
                Found {filteredSnippets.length} of {snippets.length} snippets
              </div>
            )}
          </div>
        )}

        {/* Create/Edit Form */}
        {isCreating && (
          <div className="bg-white border border-gray-300 rounded-lg p-4 mb-4 shadow-sm">
            <h3 className="text-lg font-semibold mb-3 text-gray-800">
              {editingId ? 'Edit Snippet' : 'Create New Snippet'}
            </h3>
            
            {/* Name Input */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Snippet Name
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Employee Population Query"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* SQL Query Input */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                SQL Query
              </label>
              <textarea
                value={formData.sqlQuery}
                onChange={(e) => setFormData({ ...formData, sqlQuery: e.target.value })}
                placeholder="SELECT * FROM emp JOIN dept ON emp.deptno = dept.deptno"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                rows={4}
              />
            </div>

            {/* User Message Input */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                User Message
              </label>
              <textarea
                value={formData.userMessage}
                onChange={(e) => setFormData({ ...formData, userMessage: e.target.value })}
                placeholder="Find the manager of each employee and tell me the department name..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={4}
              />
            </div>

            {/* Keywords Input */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-1">
                <label className="block text-sm font-medium text-gray-700">
                  Context Keywords (comma-separated)
                </label>
                <button
                  type="button"
                  onClick={handleGenerateKeywords}
                  disabled={isGeneratingKeywords || !formData.sqlQuery.trim()}
                  className="bg-blue-500 text-white px-3 py-1 rounded text-xs hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isGeneratingKeywords ? '🧠 Analyzing...' : '🧠 Generate'}
                </button>
              </div>
              <textarea
                value={keywordsText}
                onChange={(e) => handleKeywordsChange(e.target.value)}
                placeholder="Employee, Department, Manager"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                rows={2}
              />
              <div className="mt-1 text-xs text-gray-500">
                These keywords help determine when to execute the SQL query
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2">
              <button
                onClick={handleSave}
                className="bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600"
              >
                {editingId ? 'Update' : 'Save'}
              </button>
              <button
                onClick={handleCancel}
                className="bg-gray-500 text-white px-4 py-2 rounded-md hover:bg-gray-600"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Snippets List */}
        <div className="space-y-3">
          {snippets.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              No snippets yet. Create your first snippet to get started!
            </div>
          ) : filteredSnippets.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              <div className="mb-2">🔍 No snippets match your filter</div>
              <div className="text-sm">
                Try adjusting your search terms or{' '}
                <button 
                  onClick={() => setSearchFilter('')}
                  className="text-blue-500 hover:text-blue-700 underline"
                >
                  clear the filter
                </button>
              </div>
            </div>
          ) : (
            filteredSnippets.map((snippet) => (
              <div
                key={snippet.id}
                className="bg-white border border-gray-300 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow"
              >
                {/* Snippet Header */}
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800">{snippet.name}</h3>
                    <p className="text-xs text-gray-500">
                      Created: {new Date(snippet.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleUseSnippet(snippet)}
                      className="bg-blue-500 text-white px-3 py-1 rounded text-sm hover:bg-blue-600"
                      title="Use this snippet"
                    >
                      Use
                    </button>
                    <button
                      onClick={() => handleEdit(snippet)}
                      className="bg-yellow-500 text-white px-3 py-1 rounded text-sm hover:bg-yellow-600"
                      title="Edit snippet"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(snippet.id)}
                      className="bg-red-500 text-white px-3 py-1 rounded text-sm hover:bg-red-600"
                      title="Delete snippet"
                    >
                      Delete
                    </button>
                  </div>
                </div>

                {/* SQL Query Preview */}
                <div className="mb-3">
                  <label className="block text-sm font-medium text-gray-600 mb-1">
                    SQL Query:
                  </label>
                  <div className="bg-gray-100 p-2 rounded border font-mono text-sm text-gray-800 max-h-20 overflow-y-auto">
                    {snippet.sqlQuery}
                  </div>
                </div>

                {/* User Message Preview */}
                <div className="mb-3">
                  <label className="block text-sm font-medium text-gray-600 mb-1">
                    User Message:
                  </label>
                  <div className="bg-gray-100 p-2 rounded border text-sm text-gray-800 max-h-20 overflow-y-auto">
                    {snippet.userMessage}
                  </div>
                </div>

                {/* Keywords Preview */}
                {snippet.keywords && snippet.keywords.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">
                      Context Keywords:
                    </label>
                    <div className="bg-blue-50 p-2 rounded border text-sm text-blue-800">
                      {snippet.keywords.join(', ')}
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
