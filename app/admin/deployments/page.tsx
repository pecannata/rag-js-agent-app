'use client';

import { useState, useEffect } from 'react';

interface BackupInfo {
  name: string;
  path: string;
  timestamp: string;
  created: string;
  version: string;
  domain: string;
  size: string;
  canRollback: boolean;
}

interface SystemInfo {
  serviceName: string;
  deployPath: string;
  serviceStatus: string;
  uptime: string;
}

interface DeploymentData {
  currentVersion: string;
  buildInfo: any;
  backups: BackupInfo[];
  systemInfo: SystemInfo;
}

export default function DeploymentsPage() {
  const [deploymentData, setDeploymentData] = useState<DeploymentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchDeploymentData = async () => {
    try {
      setRefreshing(true);
      const response = await fetch('/api/admin/deployments');
      
      if (!response.ok) {
        throw new Error('Failed to fetch deployment data');
      }
      
      const result = await response.json();
      
      if (result.success) {
        setDeploymentData(result.data);
        setError(null);
      } else {
        throw new Error(result.error || 'Unknown error');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load deployment data');
      console.error('Error fetching deployment data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDeploymentData();
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-green-600 bg-green-100';
      case 'inactive': return 'text-red-600 bg-red-100';
      case 'failed': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const formatSize = (size: string) => {
    if (size === 'unknown') return 'Unknown';
    return size;
  };

  const handleRollback = async (backupName: string) => {
    if (!confirm(`⚠️ Are you sure you want to rollback to ${backupName}?\n\nThis will:\n- Stop the current application\n- Restore the previous version\n- Preserve current user data\n\nFor safety, please use the rollback.sh script from your Mac instead.`)) {
      return;
    }

    try {
      const response = await fetch('/api/admin/deployments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'rollback',
          backupName
        })
      });

      const result = await response.json();
      
      if (result.success) {
        alert(`📋 ${result.message}\n\nTo perform the rollback:\n1. Open Terminal on your Mac\n2. Navigate to your project directory\n3. Run: ./rollback.sh`);
      } else {
        alert(`❌ Error: ${result.error}`);
      }
    } catch (err) {
      alert(`❌ Error initiating rollback: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center">
            <div className="text-lg">Loading deployment information...</div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <div className="text-red-800">
              <h3 className="font-semibold">Error Loading Deployment Data</h3>
              <p className="mt-2">{error}</p>
              <button
                onClick={fetchDeploymentData}
                className="mt-3 inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-red-600 hover:bg-red-700"
              >
                Retry
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const { currentVersion, buildInfo, backups, systemInfo } = deploymentData!;

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Deployment Management</h1>
              <p className="mt-2 text-gray-600">Monitor deployments and manage backups</p>
            </div>
            <button
              onClick={fetchDeploymentData}
              disabled={refreshing}
              className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white ${
                refreshing 
                  ? 'bg-gray-400 cursor-not-allowed' 
                  : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {refreshing ? 'Refreshing...' : '🔄 Refresh'}
            </button>
          </div>
        </div>

        {/* Current Status */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="text-2xl">📦</div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Current Version</dt>
                    <dd className="text-lg font-medium text-gray-900">{currentVersion}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="text-2xl">⚙️</div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Service Status</dt>
                    <dd className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(systemInfo.serviceStatus)}`}>
                      {systemInfo.serviceStatus}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="text-2xl">⏱️</div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Uptime</dt>
                    <dd className="text-lg font-medium text-gray-900">{systemInfo.uptime}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="text-2xl">💾</div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Available Backups</dt>
                    <dd className="text-lg font-medium text-gray-900">{backups.length}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Build Information */}
        {buildInfo && Object.keys(buildInfo).length > 0 && (
          <div className="bg-white shadow rounded-lg mb-8">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">🔧 Build Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Object.entries(buildInfo).map(([key, value]) => (
                  <div key={key} className="bg-gray-50 px-3 py-2 rounded">
                    <dt className="text-sm font-medium text-gray-500 capitalize">
                      {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                    </dt>
                    <dd className="text-sm text-gray-900 font-mono">
                      {typeof value === 'string' ? value : JSON.stringify(value)}
                    </dd>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Backup History */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-medium text-gray-900">📚 Backup History</h3>
              <div className="text-sm text-gray-500">
                Showing {backups.length} most recent backups
              </div>
            </div>

            {backups.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-4xl mb-4">📦</div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Backups Available</h3>
                <p className="text-gray-500">
                  Backups will appear here after your first deployment with the backup system.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Backup
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Version
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Created
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Size
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {backups.map((backup, index) => (
                      <tr key={backup.name} className={index === 0 ? 'bg-blue-50' : ''}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="text-2xl mr-3">
                              {index === 0 ? '🔥' : '📦'}
                            </div>
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {backup.name}
                                {index === 0 && (
                                  <span className="ml-2 inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                                    Most Recent
                                  </span>
                                )}
                              </div>
                              <div className="text-xs text-gray-500 font-mono">
                                {backup.timestamp}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{backup.version}</div>
                          <div className="text-xs text-gray-500">{backup.domain}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {backup.created}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatSize(backup.size)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          {backup.canRollback && (
                            <button
                              onClick={() => handleRollback(backup.name)}
                              className="text-indigo-600 hover:text-indigo-900 mr-4"
                            >
                              🔄 Rollback
                            </button>
                          )}
                          <span className="text-gray-400">📁 View</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Instructions */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <div className="text-xl">💡</div>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-blue-800">
                Deployment Instructions
              </h3>
              <div className="mt-2 text-sm text-blue-700">
                <p><strong>To deploy:</strong> Run <code className="bg-blue-100 px-1 rounded">./deploy.sh</code> from your Mac</p>
                <p><strong>To rollback:</strong> Run <code className="bg-blue-100 px-1 rounded">./rollback.sh</code> from your Mac</p>
                <p className="mt-2 text-xs">Backups are automatically created during deployment and stored on the Linux server at <code>/opt/backups/rag-js-agent/</code></p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
