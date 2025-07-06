import packageJson from '../../package.json';

// Generate a unique build identifier based on current timestamp
const BUILD_TIMESTAMP = new Date().toISOString().slice(0, 19).replace(/[-:]/g, '').replace('T', '-');
const BUILD_DATE = new Date();
const BUILD_DATE_STRING = BUILD_DATE.toLocaleDateString('en-US', { 
  year: 'numeric', 
  month: 'short', 
  day: 'numeric' 
});
const BUILD_DATE_SHORT = BUILD_DATE.toLocaleDateString('en-US', { 
  month: '2-digit', 
  day: '2-digit', 
  year: '2-digit' 
}).replace(/\//g, '');

// Get deployment environment
function getEnvironment(): string {
  if (typeof window !== 'undefined') {
    // Client-side detection
    return window.location.hostname === 'localhost' ? 'development' : 'production';
  }
  // Server-side detection
  return process.env.NODE_ENV === 'production' ? 'production' : 'development';
}

// Get Git branch information
function getGitBranch(): string {
  return process.env.VERCEL_GIT_COMMIT_REF || 
         process.env.NETLIFY_BRANCH || 
         process.env.GITHUB_REF_NAME ||
         process.env.GIT_BRANCH ||
         'main';
}

// Get source version from build info (populated during build)
function getSourceVersionFromBuildInfo(): string | null {
  try {
    // First try environment variable
    if (process.env.NEXT_PUBLIC_SOURCE_VERSION) {
      return process.env.NEXT_PUBLIC_SOURCE_VERSION;
    }
    
    // Fallback: try to read from build-info.json (for client-side or when env var missing)
    if (typeof window === 'undefined') {
      // Server-side: try to read build-info.json
      try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const fs = require('fs');
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const path = require('path');
        const buildInfoPath = path.join(process.cwd(), 'public', 'build-info.json');
        if (fs.existsSync(buildInfoPath)) {
          const buildInfo = JSON.parse(fs.readFileSync(buildInfoPath, 'utf8'));
          return buildInfo.sourceVersion || null;
        }
      } catch (err) {
        // eslint-disable-next-line no-console
        console.warn('Could not read build-info.json:', err);
      }
    }
    
    return null;
  } catch {
    return null;
  }
}

// Get source commit/dev version info
function getSourceVersion(): string {
  // First try to get from build info (for deployments)
  const sourceFromBuild = getSourceVersionFromBuildInfo();
  if (sourceFromBuild) {
    return sourceFromBuild;
  }
  
  const branch = getGitBranch();
  const commitSha = process.env.VERCEL_GIT_COMMIT_SHA || 
                   process.env.NETLIFY_COMMIT_REF ||
                   process.env.GITHUB_SHA;
  
  if (commitSha) {
    return `${branch}@${commitSha.slice(0, 8)}`;
  }
  
  // Fallback for development
  return `${branch}@dev-${BUILD_TIMESTAMP.slice(-8)}`;
}

// Get build identifier (in production, this could be injected via CI/CD)
function getBuildId(): string {
  // Check for environment variables that deployment platforms provide
  const deploymentId = 
    process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 8) || // Vercel
    process.env.NETLIFY_DEPLOY_ID?.slice(0, 8) || // Netlify
    process.env.GITHUB_SHA?.slice(0, 8) || // GitHub Actions
    process.env.BUILD_ID?.slice(0, 8) || // Generic CI
    BUILD_TIMESTAMP.slice(-8); // Fallback to timestamp
  
  return deploymentId;
}

// Get deployment URL or environment info
function getDeploymentInfo(): string {
  const env = getEnvironment();
  if (env === 'production') {
    return process.env.VERCEL_URL || 
           process.env.NETLIFY_URL || 
           process.env.DEPLOY_URL || 
           'production';
  }
  return 'localhost';
}

export const VERSION_INFO = {
  version: packageJson.version,
  name: packageJson.name,
  buildId: getBuildId(),
  buildTime: BUILD_TIMESTAMP,
  buildDate: BUILD_DATE_STRING,
  buildDateShort: BUILD_DATE_SHORT,
  environment: getEnvironment(),
  deployment: getDeploymentInfo(),
  sourceVersion: getSourceVersion(),
  gitBranch: getGitBranch(),
  fullVersion: `v${packageJson.version}-${getBuildId()}`,
  displayVersion: `v${packageJson.version}${getEnvironment() === 'development' ? '-dev' : ''} (${BUILD_DATE_STRING})`,
  deploymentVersion: `v${packageJson.version} (${BUILD_DATE_STRING}, from ${getSourceVersion()})`,
  compactVersion: `v${packageJson.version}.${BUILD_DATE_SHORT}`
};

export function getVersionString(): string {
  return VERSION_INFO.displayVersion;
}

export function getFullVersionString(): string {
  return VERSION_INFO.fullVersion;
}

export function getDetailedVersionInfo(): string {
  const env = VERSION_INFO.environment === 'production' ? '🚀 Production' : '🔧 Development';
  const sourceInfo = VERSION_INFO.environment === 'production' 
    ? ` | Source: ${VERSION_INFO.sourceVersion}`
    : '';
  return `${VERSION_INFO.name} ${VERSION_INFO.fullVersion} (${VERSION_INFO.buildDate}, ${env}${sourceInfo})`;
}

export function getBuildInfo(): string {
  const sourceInfo = VERSION_INFO.environment === 'production' 
    ? ` | Built from: ${VERSION_INFO.sourceVersion}`
    : '';
  return `Build: ${VERSION_INFO.buildId} | ${VERSION_INFO.buildDate}${sourceInfo}`;
}

export function getCompactVersionInfo(): string {
  return VERSION_INFO.compactVersion;
}

export function getDeploymentVersionInfo(): string {
  return VERSION_INFO.deploymentVersion;
}
