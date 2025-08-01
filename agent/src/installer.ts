import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import chalk from 'chalk';
import ora from 'ora';
import { getAgentContext } from './utils/context';

export interface AgentConfig {
  serverUrl: string;
  computerName?: string;
  token?: string;
}

export interface InstallStatus {
  installed: boolean;
  config?: AgentConfig;
}

const CLAUDE_CONFIG_DIR = join(homedir(), '.claude');
const CLAUDE_SETTINGS_FILE = join(CLAUDE_CONFIG_DIR, 'settings.json');
const COMPANION_CONFIG_FILE = join(CLAUDE_CONFIG_DIR, 'companion.json');

// Helper function to check if a hook command belongs to AFK
export function isAFKHook(command: string): boolean {
  return command.includes('claude-companion-agent') || 
         command.includes('claude-companion/agent') ||
         command.includes('pre-tool-use.js') ||
         command.includes('post-tool-use.js') ||
         command.includes('stop.js') ||
         command.includes('notification.js');
}

// Helper function to merge AFK hooks with existing hooks
export function mergeHooks(existingHooks: any, afkHooks: any): any {
  const merged = { ...existingHooks };
  
  for (const [hookType, afkHookArray] of Object.entries(afkHooks)) {
    if (!merged[hookType]) {
      // No existing hooks of this type, just add AFK hooks
      merged[hookType] = afkHookArray;
    } else {
      // Merge with existing hooks, ensuring we don't duplicate AFK hooks
      const existingArray = Array.isArray(merged[hookType]) ? merged[hookType] : [];
      
      // Remove any existing AFK hooks first to avoid duplicates
      const cleanedExisting = existingArray.map((hookConfig: any) => {
        if (hookConfig.hooks && Array.isArray(hookConfig.hooks)) {
          const nonAFKHooks = hookConfig.hooks.filter((hook: any) => 
            !hook.command || !isAFKHook(hook.command)
          );
          return nonAFKHooks.length > 0 ? { ...hookConfig, hooks: nonAFKHooks } : null;
        }
        return hookConfig;
      }).filter(Boolean);
      
      // Add AFK hooks to the cleaned existing hooks
      merged[hookType] = [...cleanedExisting, ...(afkHookArray as any[])];
    }
  }
  
  return merged;
}

// Helper function to remove only AFK hooks from existing hooks
export function removeAFKHooks(existingHooks: any): any {
  if (!existingHooks || typeof existingHooks !== 'object') {
    return existingHooks;
  }
  
  const cleaned: any = {};
  
  for (const [hookType, hookArray] of Object.entries(existingHooks)) {
    if (Array.isArray(hookArray)) {
      const cleanedArray = hookArray.map((hookConfig: any) => {
        if (hookConfig.hooks && Array.isArray(hookConfig.hooks)) {
          const nonAFKHooks = hookConfig.hooks.filter((hook: any) => 
            !hook.command || !isAFKHook(hook.command)
          );
          return nonAFKHooks.length > 0 ? { ...hookConfig, hooks: nonAFKHooks } : null;
        }
        return hookConfig;
      }).filter(Boolean);
      
      if (cleanedArray.length > 0) {
        cleaned[hookType] = cleanedArray;
      }
    } else {
      // Non-array hook format, preserve as-is
      cleaned[hookType] = hookArray;
    }
  }
  
  return Object.keys(cleaned).length > 0 ? cleaned : undefined;
}

export async function installHooks(config: AgentConfig): Promise<void> {
  const spinner = ora('Installing hooks...').start();
  
  try {
    // Ensure .claude directory exists
    if (!existsSync(CLAUDE_CONFIG_DIR)) {
      mkdirSync(CLAUDE_CONFIG_DIR, { recursive: true });
      spinner.text = 'Created .claude directory';
    }

    // Read existing settings or create new ones
    let settings: any = {};
    if (existsSync(CLAUDE_SETTINGS_FILE)) {
      try {
        const settingsContent = readFileSync(CLAUDE_SETTINGS_FILE, 'utf8');
        settings = JSON.parse(settingsContent);
        spinner.text = 'Read existing Claude settings';
      } catch (error) {
        spinner.warn('Could not parse existing settings.json, creating backup');
        const backupFile = `${CLAUDE_SETTINGS_FILE}.backup-${Date.now()}`;
        writeFileSync(backupFile, readFileSync(CLAUDE_SETTINGS_FILE));
      }
    }

    // Get the path to our hook executables
    const hookBasePath = getHookExecutablePath();
    
    // Set environment variable for computer name if provided
    const envVars = config.computerName ? `CLAUDE_COMPUTER_NAME="${config.computerName}" ` : '';
    
    // Create AFK hooks using the new array format
    // Note: agentId is now auto-generated in the hooks themselves
    const afkHooks = {
      PreToolUse: [
        {
          hooks: [
            {
              type: "command",
              command: `${envVars}node "${join(hookBasePath, 'pre-tool-use.js')}" "${config.serverUrl}" "auto-generated" "${config.token || ''}"`
            }
          ]
        }
      ],
      PostToolUse: [
        {
          hooks: [
            {
              type: "command",
              command: `${envVars}node "${join(hookBasePath, 'post-tool-use.js')}" "${config.serverUrl}" "auto-generated" "${config.token || ''}"`
            }
          ]
        }
      ],
      Stop: [
        {
          hooks: [
            {
              type: "command",
              command: `${envVars}node "${join(hookBasePath, 'stop.js')}" "${config.serverUrl}" "auto-generated" "${config.token || ''}"`
            }
          ]
        }
      ],
      Notification: [
        {
          hooks: [
            {
              type: "command",
              command: `${envVars}node "${join(hookBasePath, 'notification.js')}" "${config.serverUrl}" "auto-generated" "${config.token || ''}"`
            }
          ]
        }
      ]
    };

    // Merge AFK hooks with existing hooks instead of overwriting
    settings.hooks = mergeHooks(settings.hooks || {}, afkHooks);
    spinner.text = 'Merged AFK hooks with existing hooks';

    // Write updated settings
    writeFileSync(CLAUDE_SETTINGS_FILE, JSON.stringify(settings, null, 2));
    spinner.text = 'Updated Claude settings.json';

    // Save companion configuration
    writeFileSync(COMPANION_CONFIG_FILE, JSON.stringify(config, null, 2));
    spinner.text = 'Saved companion configuration';

    // Display context information
    const context = getAgentContext();
    spinner.succeed(`Hooks installed successfully for agent: ${context.agentName} (${context.agentId})`);
    console.log(chalk.gray(`  Computer: ${context.computerName}`));
    console.log(chalk.gray(`  Working Directory: ${context.workingDirectory}`));
    
  } catch (error) {
    spinner.fail('Installation failed');
    throw error;
  }
}

export async function uninstallHooks(): Promise<void> {
  const spinner = ora('Uninstalling hooks...').start();
  
  try {
    if (!existsSync(CLAUDE_SETTINGS_FILE)) {
      spinner.warn('No Claude settings.json found');
      return;
    }

    // Read existing settings
    const settingsContent = readFileSync(CLAUDE_SETTINGS_FILE, 'utf8');
    const settings = JSON.parse(settingsContent);

    // Remove only AFK hooks, preserving other hooks
    if (settings.hooks) {
      const cleanedHooks = removeAFKHooks(settings.hooks);
      if (cleanedHooks && Object.keys(cleanedHooks).length > 0) {
        settings.hooks = cleanedHooks;
        spinner.text = 'Removed AFK hooks, preserved other hooks';
      } else {
        delete settings.hooks;
        spinner.text = 'Removed all hooks (only AFK hooks were present)';
      }
    } else {
      spinner.text = 'No hooks found to remove';
    }

    // Write updated settings
    writeFileSync(CLAUDE_SETTINGS_FILE, JSON.stringify(settings, null, 2));
    spinner.text = 'Updated Claude settings.json';

    // Remove companion config if it exists
    if (existsSync(COMPANION_CONFIG_FILE)) {
      const fs = await import('fs-extra');
      await fs.remove(COMPANION_CONFIG_FILE);
      spinner.text = 'Removed companion configuration';
    }

    spinner.succeed('Hooks uninstalled successfully');
    
  } catch (error) {
    spinner.fail('Uninstallation failed');
    throw error;
  }
}

export async function checkInstallStatus(): Promise<InstallStatus> {
  try {
    if (!existsSync(CLAUDE_SETTINGS_FILE)) {
      return { installed: false };
    }

    const settingsContent = readFileSync(CLAUDE_SETTINGS_FILE, 'utf8');
    const settings = JSON.parse(settingsContent);

    const hasCompanionHooks = settings.hooks && 
      typeof settings.hooks === 'object' &&
      ['PreToolUse', 'PostToolUse', 'Stop', 'Notification'].some(hookType => {
        const hookArray = settings.hooks[hookType];
        return Array.isArray(hookArray) && hookArray.some((hookConfig: any) => {
          return hookConfig.hooks && Array.isArray(hookConfig.hooks) &&
            hookConfig.hooks.some((hook: any) => {
              return hook.type === 'command' && 
                typeof hook.command === 'string' && 
                isAFKHook(hook.command);
            });
        });
      });

    if (!hasCompanionHooks) {
      return { installed: false };
    }

    // Try to read companion config
    let config: AgentConfig | undefined;
    if (existsSync(COMPANION_CONFIG_FILE)) {
      try {
        const configContent = readFileSync(COMPANION_CONFIG_FILE, 'utf8');
        config = JSON.parse(configContent);
      } catch (error) {
        // Config file exists but is invalid, still consider installed
      }
    }

    return { installed: true, config };
    
  } catch (error) {
    return { installed: false };
  }
}

function getHookExecutablePath(): string {
  // In production (globally installed), hooks will be in the package directory
  const globalPath = join(__dirname, '..', 'dist', 'hooks');
  
  // In development, use the src directory  
  const devPath = join(__dirname, 'hooks');
  
  return existsSync(globalPath) ? globalPath : devPath;
}