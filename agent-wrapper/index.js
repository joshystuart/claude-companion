const { spawn } = require('child_process');
const Logger = require('./logger');

class ClaudeWrapper {
    constructor() {
        this.logger = new Logger();
        this.child = null;
    }

    log(message, type = 'INFO') {
        this.logger.log(message, type);
    }

    start() {
        this.log('Starting Claude CLI wrapper...');
        
        // Start Claude with output capture using tee
        const args = process.argv.slice(2);
        
        // Start Claude directly without piping to maintain TTY
        this.log(`Running command: claude ${args.join(' ')}`);
        
        this.child = spawn('claude', args, {
            stdio: 'inherit',
            env: { ...process.env, FORCE_COLOR: '1' }
        });
        
        // Capture output using the logger's built-in capability
        this.logger.captureAndForwardOutput(this.child);

        this.log('Claude process spawned with PID: ' + this.child.pid);
        this.log('Output being captured to: ' + this.logger.outputFile);

        // Handle process close
        this.child.on('close', (code) => {
            this.log(`Claude process exited with code ${code}`, 'EXIT');
            this.cleanup();
            process.exit(code);
        });

        // Handle process error
        this.child.on('error', (error) => {
            this.log(`Failed to start Claude process: ${error.message}`, 'ERROR');
            this.cleanup();
            process.exit(1);
        });

        // Handle wrapper termination
        process.on('SIGINT', () => {
            this.log('Received SIGINT, terminating...', 'SIGNAL');
            this.cleanup();
            if (this.child) {
                this.child.kill('SIGINT');
            }
            process.exit(0);
        });

        process.on('SIGTERM', () => {
            this.log('Received SIGTERM, terminating...', 'SIGNAL');
            this.cleanup();
            if (this.child) {
                this.child.kill('SIGTERM');
            }
            process.exit(0);
        });
    }

    cleanup() {
        this.log('Wrapper cleanup completed', 'CLEANUP');
    }
}

// Start the wrapper
if (require.main === module) {
    const wrapper = new ClaudeWrapper();
    wrapper.start();
}

module.exports = ClaudeWrapper;