const { spawn } = require('child_process');
const readline = require('readline');
const fs = require('fs');
const path = require('path');

class ClaudeWrapper {
    constructor() {
        this.logFile = path.join(__dirname, 'claude-session.log');
        this.child = null;
        this.rl = null;
        this.userInput = null;
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
        
        // Spawn the claude process
        this.child = spawn('claude', process.argv.slice(2), {
            stdio: ['pipe', 'pipe', 'pipe']
        });

        this.log('Claude process spawned with PID: ' + this.child.pid);

        // Set up readline interface for child's stdout
        this.rl = readline.createInterface({
            input: this.child.stdout,
            crlfDelay: Infinity
        });

        // Set up readline interface for user input
        this.userInput = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });

        // Handle stdout from claude
        this.rl.on('line', (line) => {
            this.log(line, 'CLAUDE_OUT');
            
            // Forward output to user
            console.log(line);
            
            // Check if claude is asking for input
            if (this.isPromptingForInput(line)) {
                this.handleUserInput();
            }
        });

        // Handle stderr from claude
        this.child.stderr.on('data', (data) => {
            const errorMessage = data.toString().trim();
            this.log(errorMessage, 'CLAUDE_ERR');
            console.error(errorMessage);
        });

        // Handle process close
        this.child.on('close', (code) => {
            this.log(`Claude process exited with code ${code}`, 'EXIT');
            console.log(`Process exited with code ${code}`);
            this.cleanup();
            process.exit(code);
        });

        // Handle process error
        this.child.on('error', (error) => {
            this.log(`Failed to start Claude process: ${error.message}`, 'ERROR');
            console.error(`Failed to start Claude process: ${error.message}`);
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

    isPromptingForInput(line) {
        // Common patterns that indicate Claude is waiting for input
        const promptPatterns = [
            /.*\?$/,  // Lines ending with a question mark
            /.*:$/,   // Lines ending with a colon
            /.*>\s*$/,  // Lines ending with > and optional whitespace
            /press.*enter/i,
            /continue\?/i,
            /\(y\/n\)/i,
            /\[y\/n\]/i
        ];
        
        return promptPatterns.some(pattern => pattern.test(line.trim()));
    }

    handleUserInput() {
        this.userInput.question('', (input) => {
            this.log(input, 'USER_IN');
            
            // Send input to claude process
            if (this.child && this.child.stdin.writable) {
                this.child.stdin.write(input + '\n');
            }
        });
    }

    cleanup() {
        if (this.rl) {
            this.rl.close();
        }
        if (this.userInput) {
            this.userInput.close();
        }
        this.log('Wrapper cleanup completed', 'CLEANUP');
    }
}

// Start the wrapper
if (require.main === module) {
    const wrapper = new ClaudeWrapper();
    wrapper.start();
}

module.exports = ClaudeWrapper;