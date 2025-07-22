'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { redirect } from 'next/navigation';

interface CacheStats {
  totalKeys: number;
  cacheHits: number;
  cacheMisses: number;
  hitRate: string;
  keySize: number;
  valueSize: number;
  totalMemory: number;
  nodeCacheMemory?: number;
  estimatedMemory?: number;
  keys: Array<{
    key: string;
    ttl: string | null;
    remainingMinutes: number;
    hasData: boolean;
  }>;
  blogPostCache?: {
    size: number;
    maxSize: number;
    utilization: string;
    keys: string[];
  } | null;
  autoReprimeEnabled: boolean;
  checkPeriod: string;
  defaultTTL: string;
}

interface CacheStatsResponse {
  success: boolean;
  stats: CacheStats;
  timestamp: string;
}

export default function CacheAdminPage() {
  const { data: session, status } = useSession();
  const [stats, setStats] = useState<CacheStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string>('');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [invalidating, setInvalidating] = useState(false);

  // Redirect if not admin
  useEffect(() => {
    if (status === 'loading') return;
    if (!session || session.user.email !== 'phil.cannata@yahoo.com') {
      redirect('/');
    }
  }, [session, status]);

  const fetchStats = async () => {
    try {
      setError(null);
      const response = await fetch('/api/cache/stats');
      const data: CacheStatsResponse = await response.json();
      
      if (data.success) {
        setStats(data.stats);
        setLastUpdated(new Date(data.timestamp).toLocaleString());
      } else {
        setError('Failed to fetch cache stats');
      }
    } catch (err) {
      setError('Error fetching cache stats');
      console.error('Cache stats error:', err);
    } finally {
      setLoading(false);
    }
  };

  const invalidateCache = async (withReprime: boolean = false) => {
    setInvalidating(true);
    try {
      const response = await fetch('/api/blog/categories/invalidate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reprime: withReprime })
      });
      
      const result = await response.json();
      if (result.success) {
        alert(`✅ ${result.message}`);
        // Refresh stats after invalidation
        setTimeout(fetchStats, 1000);
      } else {
        alert(`❌ Error: ${result.message}`);
      }
    } catch (err) {
      alert('❌ Error invalidating cache');
      console.error('Cache invalidation error:', err);
    } finally {
      setInvalidating(false);
    }
  };

  useEffect(() => {
    fetchStats();
    
    let interval: NodeJS.Timeout;
    if (autoRefresh) {
      interval = setInterval(fetchStats, 30000); // Refresh every 30 seconds
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh]);

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading cache statistics...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 text-xl">❌ {error}</p>
          <button 
            onClick={fetchStats}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const formatMemory = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto p-6">
        {/* Header */}
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Cache Administration</h1>
              <p className="text-gray-600 mt-1">Monitor and manage application cache performance</p>
            </div>
            <div className="flex items-center gap-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={autoRefresh}
                  onChange={(e) => setAutoRefresh(e.target.checked)}
                  className="mr-2"
                />
                Auto-refresh (30s)
              </label>
              <button
                onClick={fetchStats}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                🔄 Refresh Now
              </button>
            </div>
          </div>
          <p className="text-sm text-gray-500 mt-2">Last updated: {lastUpdated}</p>
        </div>

        {stats && (
          <>
            {/* Performance Overview */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-white p-6 rounded-lg shadow">
                <div className="flex items-center">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <span className="text-2xl">📊</span>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Hit Rate</p>
                    <p className="text-2xl font-bold text-blue-600">{stats.hitRate}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg shadow">
                <div className="flex items-center">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <span className="text-2xl">🎯</span>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Cache Hits</p>
                    <p className="text-2xl font-bold text-green-600">{stats.cacheHits.toLocaleString()}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg shadow">
                <div className="flex items-center">
                  <div className="p-2 bg-yellow-100 rounded-lg">
                    <span className="text-2xl">❌</span>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Cache Misses</p>
                    <p className="text-2xl font-bold text-yellow-600">{stats.cacheMisses.toLocaleString()}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg shadow">
                <div className="flex items-center">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <span className="text-2xl">💾</span>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Memory Usage</p>
                    <p className="text-2xl font-bold text-purple-600">{formatMemory(stats.totalMemory)}</p>
                    {stats.nodeCacheMemory && stats.nodeCacheMemory !== stats.totalMemory && (
                      <p className="text-xs text-gray-500">NodeCache: {formatMemory(stats.nodeCacheMemory)}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Configuration & Controls */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              {/* Configuration */}
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">⚙️ Configuration</h2>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Default TTL:</span>
                    <span className="font-medium">{stats.defaultTTL}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Check Period:</span>
                    <span className="font-medium">{stats.checkPeriod}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Auto Re-prime:</span>
                    <span className={`font-medium ${stats.autoReprimeEnabled ? 'text-green-600' : 'text-red-600'}`}>
                      {stats.autoReprimeEnabled ? '✅ Enabled' : '❌ Disabled'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total Keys:</span>
                    <span className="font-medium">{stats.totalKeys}</span>
                  </div>
                </div>
              </div>

              {/* Cache Controls */}
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">🔧 Cache Controls</h2>
                <div className="space-y-4">
                  <button
                    onClick={() => invalidateCache(false)}
                    disabled={invalidating}
                    className="w-full px-4 py-3 bg-yellow-600 text-white rounded hover:bg-yellow-700 disabled:opacity-50 flex items-center justify-center"
                  >
                    {invalidating ? (
                      <span className="flex items-center">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Processing...
                      </span>
                    ) : (
                      '🧹 Simple Invalidate Cache'
                    )}
                  </button>
                  
                  <button
                    onClick={() => invalidateCache(true)}
                    disabled={invalidating}
                    className="w-full px-4 py-3 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center"
                  >
                    {invalidating ? (
                      <span className="flex items-center">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Processing...
                      </span>
                    ) : (
                      '🔥 Invalidate + Re-prime'
                    )}
                  </button>
                  
                  <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded">
                    <p className="font-medium">💡 Cache Management Tips:</p>
                    <ul className="list-disc list-inside mt-2 space-y-1">
                      <li><strong>Simple Invalidate:</strong> Clears cache, next request refills</li>
                      <li><strong>Invalidate + Re-prime:</strong> Immediate fresh data, zero delay</li>
                      <li><strong>Auto Re-prime:</strong> Happens automatically every 30 minutes</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            {/* Blog Post LRU Cache */}
            {stats.blogPostCache && (
              <div className="bg-white rounded-lg shadow mb-6">
                <div className="p-6 border-b border-gray-200">
                  <h2 className="text-xl font-semibold text-gray-900">💾 Blog Post LRU Cache</h2>
                  <p className="text-gray-600 text-sm mt-1">Individual blog posts with CLOB content (max 20 entries, 30min TTL)</p>
                </div>
                <div className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                    {/* Utilization */}
                    <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-indigo-800">Cache Utilization</p>
                          <p className="text-2xl font-bold text-indigo-900">{stats.blogPostCache.utilization}</p>
                        </div>
                        <div className="text-3xl text-indigo-600">📊</div>
                      </div>
                      <div className="mt-2">
                        <div className="bg-indigo-200 rounded-full h-2">
                          <div 
                            className="bg-indigo-600 rounded-full h-2" 
                            style={{ width: stats.blogPostCache.utilization }}
                          ></div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Size */}
                    <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-emerald-800">Current Size</p>
                          <p className="text-2xl font-bold text-emerald-900">{stats.blogPostCache.size}</p>
                        </div>
                        <div className="text-3xl text-emerald-600">📋</div>
                      </div>
                      <p className="text-xs text-emerald-600 mt-2">out of {stats.blogPostCache.maxSize} max</p>
                    </div>
                    
                    {/* LRU Info */}
                    <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-amber-800">LRU Policy</p>
                          <p className="text-sm font-bold text-amber-900">Auto Eviction</p>
                        </div>
                        <div className="text-3xl text-amber-600">🔄</div>
                      </div>
                      <p className="text-xs text-amber-600 mt-2">Least recently used posts evicted first</p>
                    </div>
                  </div>
                  
                  {/* Cached Posts */}
                  {stats.blogPostCache.keys.length > 0 ? (
                    <div>
                      <h4 className="font-medium text-gray-800 mb-3">🗺 Cached Blog Posts</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                        {stats.blogPostCache.keys.map((key, index) => {
                          const postId = key.replace('blog_post_', '');
                          const isRecent = index < 5; // First 5 are most recent
                          
                          return (
                            <div key={key} className={`p-3 rounded-lg border ${
                              isRecent ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'
                            }`}>
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-mono text-gray-700">ID: {postId}</span>
                                {isRecent && (
                                  <span className="text-xs bg-green-200 text-green-800 px-2 py-1 rounded-full">
                                    Recent
                                  </span>
                                )}
                              </div>
                              <div className="text-xs text-gray-500 mt-1">
                                Position: {index + 1}/{stats.blogPostCache?.maxSize}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <div className="text-6xl text-gray-300 mb-4">💭</div>
                      <p className="text-gray-500">No blog posts cached yet</p>
                      <p className="text-xs text-gray-400 mt-1">Posts will be cached when accessed individually</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Cache Priming Endpoints */}
            <div className="bg-white rounded-lg shadow mb-6">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900">🚀 Cache Priming Endpoints</h2>
                <p className="text-gray-600 text-sm mt-1">Endpoints used for automatic cache priming during deployment and TTL expiry</p>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Deployment Priming */}
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-3">📦 Deployment Priming</h3>
                    <p className="text-sm text-gray-600 mb-4">These endpoints are called during <code className="bg-gray-100 px-1 rounded">./deploy.sh</code> to warm the cache immediately after deployment:</p>
                    <div className="space-y-3">
                      <div className="bg-blue-50 border border-blue-200 rounded p-3">
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-sm text-blue-800">/api/blog/categories</span>
                          <span className="text-xs bg-blue-200 text-blue-800 px-2 py-1 rounded">30min TTL</span>
                        </div>
                        <p className="text-xs text-blue-600 mt-1">Categorized posts (AI, CS, Science)</p>
                      </div>
                      
                      <div className="bg-green-50 border border-green-200 rounded p-3">
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-sm text-green-800">/api/blog?lazy=true</span>
                          <span className="text-xs bg-green-200 text-green-800 px-2 py-1 rounded">10min TTL</span>
                        </div>
                        <p className="text-xs text-green-600 mt-1">BlogManager (Admin) - all posts without content</p>
                      </div>
                      
                      <div className="bg-purple-50 border border-purple-200 rounded p-3">
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-sm text-purple-800">/api/blog?status=published&includeContent=false</span>
                          <span className="text-xs bg-purple-200 text-purple-800 px-2 py-1 rounded">30min TTL</span>
                        </div>
                        <p className="text-xs text-purple-600 mt-1">Public blogs page - published posts only</p>
                      </div>
                      
                      <div className="bg-orange-50 border border-orange-200 rounded p-3">
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-sm text-orange-800">/api/blog?status=published&limit=3&includeContent=false</span>
                          <span className="text-xs bg-orange-200 text-orange-800 px-2 py-1 rounded">5min TTL</span>
                        </div>
                        <p className="text-xs text-orange-600 mt-1">Recent posts - latest 3 published posts</p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Auto Re-prime System */}
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-3">⏰ Auto Re-prime System</h3>
                    <p className="text-sm text-gray-600 mb-4">Automatic background refresh when TTL expires (every 2 minutes check):</p>
                    <div className="space-y-3">
                      <div className="bg-gray-50 border border-gray-200 rounded p-3">
                        <h4 className="font-medium text-gray-800 text-sm">🔄 TTL-Based Re-priming</h4>
                        <ul className="text-xs text-gray-600 mt-2 space-y-1">
                          <li>• <strong>Recent posts (5min):</strong> High frequency refresh</li>
                          <li>• <strong>Admin posts (10min):</strong> Medium frequency</li>
                          <li>• <strong>Published posts (30min):</strong> Standard refresh</li>
                          <li>• <strong>Categories (30min):</strong> Standard refresh</li>
                        </ul>
                      </div>
                      
                      <div className="bg-gray-50 border border-gray-200 rounded p-3">
                        <h4 className="font-medium text-gray-800 text-sm">🎯 Cache Key Intelligence</h4>
                        <ul className="text-xs text-gray-600 mt-2 space-y-1">
                          <li>• Parses cache keys to reconstruct queries</li>
                          <li>• Generates appropriate Oracle SQL automatically</li>
                          <li>• Maintains same query parameters as original</li>
                          <li>• Handles all parameter combinations</li>
                        </ul>
                      </div>
                      
                      <div className="bg-green-50 border border-green-200 rounded p-3">
                        <h4 className="font-medium text-green-800 text-sm">✅ Zero Cold Cache</h4>
                        <p className="text-xs text-green-600 mt-1">
                          Users never experience cache miss delays. All main queries stay warm through automatic background refresh.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Priming Status */}
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <h4 className="font-medium text-gray-800 mb-3">📊 Current Priming Status</h4>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {stats.keys.map((key, index) => {
                      const isPrimed = key.hasData && key.remainingMinutes > 0;
                      const isExpiringSoon = key.remainingMinutes > 0 && key.remainingMinutes < 5;
                      
                      return (
                        <div key={index} className={`p-3 rounded border ${
                          isPrimed ? (isExpiringSoon ? 'bg-yellow-50 border-yellow-200' : 'bg-green-50 border-green-200') : 'bg-red-50 border-red-200'
                        }`}>
                          <div className={`text-sm font-medium ${
                            isPrimed ? (isExpiringSoon ? 'text-yellow-800' : 'text-green-800') : 'text-red-800'
                          }`}>
                            {isPrimed ? (isExpiringSoon ? '⚠️ Expiring Soon' : '✅ Primed') : '❌ Cold'}
                          </div>
                          <div className="text-xs text-gray-600 mt-1 font-mono">
                            {key.key.length > 25 ? key.key.substring(0, 25) + '...' : key.key}
                          </div>
                          <div className={`text-xs mt-1 ${
                            isPrimed ? (isExpiringSoon ? 'text-yellow-600' : 'text-green-600') : 'text-red-600'
                          }`}>
                            {key.remainingMinutes > 0 ? `${key.remainingMinutes}min left` : 'Expired'}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* Cache Keys Detail */}
            <div className="bg-white rounded-lg shadow">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900">🗂️ Cache Keys Detail</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Key</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">TTL Expires</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Remaining</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {stats.keys.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                          No cache keys found
                        </td>
                      </tr>
                    ) : (
                      stats.keys.map((key, index) => (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="font-mono text-sm">{key.key}</span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              key.hasData ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                            }`}>
                              {key.hasData ? '✅ Active' : '❌ Empty'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {key.ttl ? new Date(key.ttl).toLocaleString() : 'No TTL'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {key.remainingMinutes > 0 ? (
                              <span className={`${key.remainingMinutes < 5 ? 'text-orange-600 font-medium' : 'text-gray-600'}`}>
                                {key.remainingMinutes} minutes
                              </span>
                            ) : (
                              <span className="text-red-600 font-medium">Expired</span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
