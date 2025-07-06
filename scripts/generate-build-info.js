#!/usr/bin/env node

/**
 * Generate build information file for deployment tracking
 * This script can be run during CI/CD to capture build metadata
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Function to increment patch version
function incrementPatchVersion() {
  const packageJsonPath = path.join(__dirname, '../package.json');
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  
  // Parse current version
  const versionParts = packageJson.version.split('.');
  const major = parseInt(versionParts[0]);
  const minor = parseInt(versionParts[1]);
  const patch = parseInt(versionParts[2]) + 1; // Increment patch
  
  // Create new version
  const newVersion = `${major}.${minor}.${patch}`;
  
  // Update package.json
  packageJson.version = newVersion;
  fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n');
  
  console.log(`📦 Version incremented: ${versionParts.join('.')} → ${newVersion}`);
  
  return newVersion;
}

function getGitInfo() {
  try {
    const branch = execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf8' }).trim();
    const commit = execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();
    const shortCommit = commit.slice(0, 8);
    const commitDate = execSync('git log -1 --format=%ci', { encoding: 'utf8' }).trim();
    const commitMessage = execSync('git log -1 --format=%s', { encoding: 'utf8' }).trim();
    
    return {
      branch,
      commit,
      shortCommit,
      commitDate,
      commitMessage
    };
  } catch (error) {
    console.warn('Could not get git info:', error.message);
    
    // Try to read from existing build info first
    try {
      const buildInfoPath = path.join(__dirname, '../public/build-info.json');
      if (fs.existsSync(buildInfoPath)) {
        const existingBuildInfo = JSON.parse(fs.readFileSync(buildInfoPath, 'utf8'));
        if (existingBuildInfo.git && existingBuildInfo.git.commit !== 'unknown') {
          console.log('📋 Using git info from existing build-info.json');
          return existingBuildInfo.git;
        }
      }
    } catch (err) {
      console.warn('Could not read existing build info:', err.message);
    }
    
    // Generate a reasonable deployment signature
    const timestamp = new Date().toISOString().slice(2, 19).replace(/[-:]/g, '').replace('T', '-');
    return {
      branch: 'main',
      commit: `deploy-${timestamp}`,
      shortCommit: `dep-${timestamp.slice(-8)}`,
      commitDate: new Date().toISOString(),
      commitMessage: 'Production deployment build'
    };
  }
}

function generateBuildInfo() {
  // FIRST: Capture the current (source) version before incrementing
  const packageJson = require('../package.json');
  const sourceVersion = packageJson.version;
  const sourceBuildDate = new Date().toLocaleDateString('en-US', { 
    month: '2-digit', 
    day: '2-digit', 
    year: '2-digit' 
  }).replace(/\//g, '');
  const sourceVersionString = `v${sourceVersion}.${sourceBuildDate}`;
  
  // THEN: Increment the version for the new build
  const newVersion = incrementPatchVersion();
  
  const gitInfo = getGitInfo();
  const buildTime = new Date().toISOString();
  const buildDate = new Date();
  const buildDateString = buildDate.toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric' 
  });
  
  // Re-read package.json to get the updated version (clear cache)
  const packageJsonPath = path.join(__dirname, '../package.json');
  delete require.cache[require.resolve(packageJsonPath)];
  const updatedPackageJson = require('../package.json');
  
  const buildInfo = {
    version: updatedPackageJson.version,
    name: updatedPackageJson.name,
    buildTime,
    buildDate: buildDateString,
    sourceVersion: sourceVersionString, // The dev version this was built from
    git: gitInfo,
    environment: process.env.NODE_ENV || 'development',
    ci: {
      // Vercel
      vercelUrl: process.env.VERCEL_URL,
      vercelGitCommitSha: process.env.VERCEL_GIT_COMMIT_SHA,
      vercelGitCommitRef: process.env.VERCEL_GIT_COMMIT_REF,
      
      // Netlify
      netlifyUrl: process.env.NETLIFY_URL,
      netlifyCommitRef: process.env.NETLIFY_COMMIT_REF,
      netlifyBranch: process.env.NETLIFY_BRANCH,
      
      // GitHub Actions
      githubSha: process.env.GITHUB_SHA,
      githubRef: process.env.GITHUB_REF,
      githubRefName: process.env.GITHUB_REF_NAME,
      
      // Generic
      buildId: process.env.BUILD_ID,
    },
    buildSignature: `${packageJson.version}-${gitInfo.shortCommit}-${buildTime.slice(0, 19).replace(/[-:]/g, '').replace('T', '-')}`
  };
  
  // Write to public directory so it can be accessed
  const outputPath = path.join(__dirname, '../public/build-info.json');
  fs.writeFileSync(outputPath, JSON.stringify(buildInfo, null, 2));
  
  console.log(`✅ Build info generated: ${buildInfo.buildSignature}`);
  console.log(`📄 Written to: ${outputPath}`);
  console.log(`🔗 Source version: ${sourceVersionString} → ${buildInfo.version}`);
  
  // Write source version to environment file for build process
  const envPath = path.join(__dirname, '../.env.build');
  const envContent = `NEXT_PUBLIC_SOURCE_VERSION=${sourceVersionString}\n`;
  fs.writeFileSync(envPath, envContent);
  
  return buildInfo;
}

// Run if called directly
if (require.main === module) {
  generateBuildInfo();
}

module.exports = { generateBuildInfo };
