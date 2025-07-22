import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';

const execPromise = promisify(exec);

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

interface DeploymentHistory {
  currentVersion: string;
  buildInfo: any;
  backups: BackupInfo[];
  systemInfo: {
    serviceName: string;
    deployPath: string;
    serviceStatus: string;
    uptime: string;
  };
}

export async function GET() {
  try {
    console.log('📊 Fetching deployment history and backup information...');

    // Get current build info
    let buildInfo: any = {};
    try {
      const buildInfoResponse = await fetch('http://localhost:3000/build-info.json');
      if (buildInfoResponse.ok) {
        buildInfo = await buildInfoResponse.json();
      }
    } catch (error) {
      console.log('⚠️ Could not fetch build info:', error);
    }

    // Get available backups
    const backups = await getAvailableBackups();

    // Get system information
    const systemInfo = await getSystemInfo();

    const deploymentHistory: DeploymentHistory = {
      currentVersion: buildInfo.version || 'unknown',
      buildInfo,
      backups,
      systemInfo
    };

    return NextResponse.json({
      success: true,
      data: deploymentHistory,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error fetching deployment history:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch deployment history',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

async function getAvailableBackups(): Promise<BackupInfo[]> {
  try {
    const backupDir = '/opt/backups/rag-js-agent';
    
    // List backup directories
    const { stdout: lsOutput } = await execPromise(`ls -la ${backupDir} 2>/dev/null || echo "NO_BACKUPS"`);
    
    if (lsOutput.includes('NO_BACKUPS')) {
      return [];
    }

    // Get detailed backup information
    const { stdout: backupList } = await execPromise(`ls -dt ${backupDir}/backup_* 2>/dev/null || echo ""`);
    
    if (!backupList.trim()) {
      return [];
    }

    const backupDirs = backupList.trim().split('\n').filter(dir => dir);
    const backups: BackupInfo[] = [];

    for (const backupPath of backupDirs.slice(0, 10)) { // Limit to 10 most recent
      try {
        const backupName = backupPath.split('/').pop() || '';
        
        // Get backup info file
        let backupInfo: any = {};
        try {
          const { stdout: infoContent } = await execPromise(`cat "${backupPath}/backup_info.txt" 2>/dev/null || echo ""`);
          if (infoContent) {
            const lines = infoContent.split('\n');
            for (const line of lines) {
              if (line.includes(':')) {
                const [key, value] = line.split(':', 2);
                if (key && value) {
                  backupInfo[key.trim().toLowerCase().replace(/ /g, '_')] = value.trim();
                }
              }
            }
          }
        } catch (error) {
          console.log('⚠️ Could not read backup info for:', backupName);
        }

        // Get backup size
        let size = 'unknown';
        try {
          const { stdout: sizeOutput } = await execPromise(`du -sh "${backupPath}" 2>/dev/null || echo "unknown"`);
          size = sizeOutput.split('\t')[0] || 'unknown';
        } catch (error) {
          // Size calculation failed
        }

        // Extract timestamp from backup name (backup_YYYYMMDD_HHMMSS)
        const timestampMatch = backupName.match(/backup_(\d{8}_\d{6})/);
        const timestamp = timestampMatch?.[1] ?? 'unknown';
        
        // Convert timestamp to readable format
        let created = 'unknown';
        if (timestamp && timestamp !== 'unknown') {
          try {
            const year = timestamp.substring(0, 4);
            const month = timestamp.substring(4, 6);
            const day = timestamp.substring(6, 8);
            const hour = timestamp.substring(9, 11);
            const minute = timestamp.substring(11, 13);
            const second = timestamp.substring(13, 15);
            const date = new Date(`${year}-${month}-${day}T${hour}:${minute}:${second}`);
            created = date.toLocaleString();
          } catch (error) {
            created = timestamp;
          }
        }

        backups.push({
          name: backupName,
          path: backupPath,
          timestamp,
          created,
          version: backupInfo.application_version || 'unknown',
          domain: backupInfo.domain || 'none',
          size,
          canRollback: true // All backups are potentially rollback-able
        });

      } catch (error) {
        console.log('⚠️ Error processing backup:', backupPath, error);
      }
    }

    return backups.sort((a, b) => b.timestamp.localeCompare(a.timestamp));

  } catch (error) {
    console.error('❌ Error getting backups:', error);
    return [];
  }
}

async function getSystemInfo() {
  const serviceName = 'rag-js-agent';
  const deployPath = '/opt/rag-js-agent-app';

  try {
    // Get service status
    let serviceStatus = 'unknown';
    let uptime = 'unknown';
    
    try {
      const { stdout: statusOutput } = await execPromise(`systemctl is-active ${serviceName} 2>/dev/null || echo "inactive"`);
      serviceStatus = statusOutput.trim();
      
      if (serviceStatus === 'active') {
        // Get service uptime
        const { stdout: uptimeOutput } = await execPromise(`systemctl show ${serviceName} --property=ActiveEnterTimestamp --value 2>/dev/null || echo ""`);
        if (uptimeOutput.trim()) {
          try {
            const startTime = new Date(uptimeOutput.trim());
            const now = new Date();
            const uptimeMs = now.getTime() - startTime.getTime();
            const uptimeHours = Math.floor(uptimeMs / (1000 * 60 * 60));
            const uptimeMinutes = Math.floor((uptimeMs % (1000 * 60 * 60)) / (1000 * 60));
            uptime = `${uptimeHours}h ${uptimeMinutes}m`;
          } catch (error) {
            uptime = 'calculation failed';
          }
        }
      }
    } catch (error) {
      console.log('⚠️ Could not get service status');
    }

    return {
      serviceName,
      deployPath,
      serviceStatus,
      uptime
    };

  } catch (error) {
    console.error('❌ Error getting system info:', error);
    return {
      serviceName,
      deployPath,
      serviceStatus: 'unknown',
      uptime: 'unknown'
    };
  }
}

// POST endpoint for rollback operations
export async function POST(request: NextRequest) {
  try {
    const { action, backupName } = await request.json();

    if (action === 'rollback' && backupName) {
      // This is a simplified rollback trigger - in production you might want more validation
      console.log(`🔄 Rollback requested for backup: ${backupName}`);
      
      return NextResponse.json({
        success: true,
        message: `Rollback to ${backupName} would be initiated here. For security, use the rollback.sh script instead.`,
        action: 'rollback_requested'
      });
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Invalid action or missing parameters'
      },
      { status: 400 }
    );

  } catch (error) {
    console.error('❌ Error processing deployment action:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to process deployment action',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
