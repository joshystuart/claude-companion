#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { installHooks, uninstallHooks } from './installer';
import { version } from '../package.json';

const program = new Command();

program
  .name('claude-companion-agent')
  .description('Claude Code Companion Agent - Remote monitoring hooks installer')
  .version(version);

program
  .command('install')
  .description('Install Claude Code hooks for monitoring')
  .option('-s, --server-url <url>', 'Server URL for hook events', 'http://localhost:3000')
  .option('-a, --agent-id <id>', 'Unique agent identifier (auto-generated if not provided)')
  .option('-t, --token <token>', 'Authentication token (optional)')
  .action(async (options) => {
    try {
      console.log(chalk.blue('🔧 Installing Claude Code Companion hooks...'));
      
      const config = {
        serverUrl: options.serverUrl,
        agentId: options.agentId || generateAgentId(),
        token: options.token
      };

      await installHooks(config);
      
      console.log(chalk.green('✅ Claude Code Companion hooks installed successfully!'));
      console.log(chalk.cyan(`   Server URL: ${config.serverUrl}`));
      console.log(chalk.cyan(`   Agent ID: ${config.agentId}`));
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
        console.log(chalk.cyan(`   Server URL: ${status.config?.serverUrl || 'Unknown'}`));
        console.log(chalk.cyan(`   Agent ID: ${status.config?.agentId || 'Unknown'}`));
      } else {
        console.log(chalk.yellow('⚠️  Claude Code Companion hooks are not installed'));
        console.log(chalk.gray('   Run "claude-companion-agent install" to set up monitoring'));
      }
      
    } catch (error) {
      console.error(chalk.red('❌ Status check failed:'), error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

function generateAgentId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  const hostname = process.env.HOSTNAME || process.env.COMPUTERNAME || 'unknown';
  return `${hostname}-${timestamp}-${random}`;
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error(chalk.red('❌ Unhandled Rejection at:'), promise, 'reason:', reason);
  process.exit(1);
});

program.parse();