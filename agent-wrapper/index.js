const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

class ClaudeWrapper {
    constructor() {
        this.logFile = path.join(__dirname, 'claude-session.log');
        this.child = null;
    }

    log(message, type = 'INFO') {
        const timestamp = new Date().toISOString();
        const logEntry = `[${timestamp}] [${type}] ${message}\n`;
        
        // Log to console
        console.log(logEntry.trim());
        
        // Log to file
        fs.appendFileSync(this.logFile, logEntry);
    }

    start() {
        this.log('Starting Claude CLI wrapper...');
        
        // Spawn the claude process with inherited stdio for proper TTY handling
        this.child = spawn('claude', process.argv.slice(2), {
            stdio: 'inherit'
        });

        this.log('Claude process spawned with PID: ' + this.child.pid);

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