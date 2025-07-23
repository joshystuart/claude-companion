import * as os from 'os';
import * as crypto from 'crypto';
import * as path from 'path';
import * as fs from 'fs';
import { execSync } from 'child_process';

export interface AgentContext {
  computerId: string;
  computerName: string;
  hostname: string;
  platform: string;
  agentId: string;
  agentName: string;
  workingDirectory: string;
}

export function generateComputerId(): string {
  const hostname = os.hostname();
  const platform = os.platform();
  const cpus = os.cpus();
  
  // Create a stable hash based on system characteristics
  const systemHash = crypto
    .createHash('sha256')
    .update(`${hostname}:${platform}:${cpus[0]?.model || 'unknown'}`)
    .digest('hex')
    .substring(0, 8);
    
  return `computer-${systemHash}`;
}

export function findGitRoot(startPath: string): string | null {
  let currentPath = startPath;
  
  while (currentPath !== path.parse(currentPath).root) {
    if (fs.existsSync(path.join(currentPath, '.git'))) {
      return currentPath;
    }
    currentPath = path.dirname(currentPath);
  }
  
  return null;
}

export function getGitRepoName(workingDir: string): string | null {
  try {
    const gitRoot = findGitRoot(workingDir);
    if (!gitRoot) return null;
    
    // Try to get remote origin URL
    const remoteUrl = execSync('git config --get remote.origin.url', {
      cwd: gitRoot,
      encoding: 'utf8'
    }).trim();
    
    if (remoteUrl) {
      // Extract repo name from URL
      const match = remoteUrl.match(/\/([^\/]+?)(\.git)?$/);
      if (match) {
        return match[1];
      }
    }
    
    // Fallback to directory name
    return path.basename(gitRoot);
  } catch (error) {
    return null;
  }
}

export function getPackageJsonName(workingDir: string): string | null {
  try {
    let currentPath = workingDir;
    
    while (currentPath !== path.parse(currentPath).root) {
      const packageJsonPath = path.join(currentPath, 'package.json');
      
      if (fs.existsSync(packageJsonPath)) {
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
        if (packageJson.name) {
          return packageJson.name;
        }
      }
      
      currentPath = path.dirname(currentPath);
    }
  } catch (error) {
    // Ignore errors
  }
  
  return null;
}

export function generateAgentId(): string {
  const hostname = os.hostname();
  const username = os.userInfo().username;
  const workingDir = process.cwd();
  
  // Use git repo root if available for consistent IDs
  const gitRoot = findGitRoot(workingDir);
  const contextPath = gitRoot || workingDir;
  
  // Create stable hash of context
  const contextHash = crypto
    .createHash('sha256')
    .update(`${hostname}:${username}:${contextPath}`)
    .digest('hex')
    .substring(0, 8);
    
  // Human-readable format: username-hostname-contexthash
  const shortHostname = hostname.split('.')[0];
  return `${username}-${shortHostname}-${contextHash}`;
}

export function generateAgentName(): string {
  const workingDir = process.cwd();
  
  // Priority order for name detection:
  // 1. Git repository name
  const gitRepoName = getGitRepoName(workingDir);
  if (gitRepoName) return gitRepoName;
  
  // 2. Package.json name (for Node projects)
  const packageName = getPackageJsonName(workingDir);
  if (packageName) return packageName;
  
  // 3. Directory name
  return path.basename(workingDir);
}

export function generateSessionId(): string {
  // Unique per Claude instance
  const timestamp = Date.now();
  const random = crypto.randomBytes(4).toString('hex');
  return `session-${timestamp}-${random}`;
}

export function getAgentContext(): AgentContext {
  const hostname = os.hostname();
  const username = os.userInfo().username;
  
  return {
    computerId: generateComputerId(),
    computerName: process.env.CLAUDE_COMPUTER_NAME || `${username}'s ${hostname}`,
    hostname,
    platform: os.platform(),
    agentId: generateAgentId(),
    agentName: generateAgentName(),
    workingDirectory: process.cwd()
  };
}