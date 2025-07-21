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
  keys: Array<{
    key: string;
    ttl: string | null;
    remainingMinutes: number;
    hasData: boolean;
  }>;
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
