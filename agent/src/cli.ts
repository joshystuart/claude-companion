#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { installHooks, uninstallHooks } from './installer';
import { getAgentContext } from './utils/context';
import { version } from '../package.json';

const program = new Command();

program
  .name('afk-agent')
  .description('Away From Klaude Agent - Remote monitoring hooks installer for claude code')
  .version(version);

program
  .command('install')
  .description('Install Claude Code hooks for monitoring')
  .option('-s, --server-url <url>', 'Server URL for hook events', 'http://localhost:3000')
  .option('-c, --computer-name <name>', 'Custom computer name (auto-detected if not provided)')
  .option('-t, --token <token>', 'Authentication token (optional)')
  .action(async (options) => {
    try {
      console.log(chalk.blue('🔧 Installing Claude Code Companion hooks...'));
      
      const config = {
        serverUrl: options.serverUrl,
        computerName: options.computerName,
        token: options.token
      };

      await installHooks(config);
      
      console.log('');
      console.log(chalk.yellow('💡 Your Claude Code sessions will now send monitoring events to the dashboard.'));
      console.log(chalk.yellow('💡 Open the dashboard at your server URL to view real-time activity.'));
      
    } catch (error) {
      console.error(chalk.red('❌ Installation failed:'), error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

program
  .command('uninstall')
  .description('Uninstall Claude Code hooks')
  .action(async () => {
    try {
      console.log(chalk.blue('🔧 Uninstalling Claude Code Companion hooks...'));
      
      await uninstallHooks();
      
      console.log(chalk.green('✅ Claude Code Companion hooks uninstalled successfully!'));
      
    } catch (error) {
      console.error(chalk.red('❌ Uninstallation failed:'), error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

program
  .command('status')
  .description('Check installation status')
  .action(async () => {
    try {
      const { checkInstallStatus } = await import('./installer');
      const status = await checkInstallStatus();
      
      if (status.installed) {
        console.log(chalk.green('✅ Claude Code Companion hooks are installed'));
        if (status.config) {
          console.log(chalk.cyan(`   Server URL: ${status.config.serverUrl}`));
          if (status.config.computerName) {
            console.log(chalk.cyan(`   Computer Name: ${status.config.computerName}`));
          }
        }
        
        // Show current context
        const context = getAgentContext();
        console.log(chalk.gray(`   Current Agent: ${context.agentName} (${context.agentId})`));
        console.log(chalk.gray(`   Working Directory: ${context.workingDirectory}`));
      } else {
        console.log(chalk.yellow('⚠️  Claude Code Companion hooks are not installed'));
        console.log(chalk.gray('   Run "claude-companion-agent install" to set up monitoring'));
      }
      
    } catch (error) {
      console.error(chalk.red('❌ Status check failed:'), error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

// Note: Agent ID is now auto-generated based on context in the hooks
// This function is no longer needed but kept for backward compatibility

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error(chalk.red('❌ Unhandled Rejection at:'), promise, 'reason:', reason);
  process.exit(1);
});

program.parse();