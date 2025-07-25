const fs = require('fs');
const path = require('path');

class Logger {
    constructor(options = {}) {
        this.logFile = options.logFile || path.join(__dirname, 'claude-session.log');
        this.outputFile = options.outputFile || path.join(__dirname, 'claude-output.log');
        
        // Clear output file on start
        if (options.clearOnStart !== false) {
            fs.writeFileSync(this.outputFile, '');
            fs.writeFileSync(this.logFile, '');
        }
    }

    log(message, type = 'INFO') {
        const timestamp = new Date().toISOString();
        const logEntry = `[${timestamp}] [${type}] ${message}\n`;
        
        // Log to console
        console.log(logEntry.trim());
        
        // Log to file
        fs.appendFileSync(this.logFile, logEntry);
    }

    writeOutput(data, stream = 'stdout') {
        const timestamp = new Date().toISOString();
        const outputEntry = `[${timestamp}] [${stream.toUpperCase()}] ${data}`;
        
        // Write to console (preserving original behavior)
        if (stream === 'stdout') {
            process.stdout.write(data);
        } else {
            process.stderr.write(data);
        }
        
        // Write to output file
        fs.appendFileSync(this.outputFile, outputEntry);
    }

    captureAndForwardOutput(childProcess) {
        if (childProcess.stdout) {
            childProcess.stdout.on('data', (data) => {
                const timestamp = new Date().toISOString();
                const outputEntry = `[${timestamp}] [STDOUT] ${data}`;
                
                // Write to output file
                fs.appendFileSync(this.outputFile, outputEntry);
                
                // Forward to terminal (preserving TTY behavior)
                process.stdout.write(data);
            });
        }

        if (childProcess.stderr) {
            childProcess.stderr.on('data', (data) => {
                const timestamp = new Date().toISOString();
                const outputEntry = `[${timestamp}] [STDERR] ${data}`;
                
                // Write to output file
                fs.appendFileSync(this.outputFile, outputEntry);
                
                // Forward to terminal (preserving TTY behavior)
                process.stderr.write(data);
            });
        }
    }

    // Keep the old methods for backward compatibility
    captureProcessOutput(childProcess) {
        this.captureAndForwardOutput(childProcess);
    }
}

module.exports = Logger;