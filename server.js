const express = require('express');
const cors = require('cors');
const { parse: babelParse } = require('@babel/parser');
const { PythonShell } = require('python-shell');
const fs = require('fs').promises;
const path = require('path');
const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const TEMP_DIR = process.env.TEMP_DIR || './temp';
const DOCKER_JAVA_IMAGE = process.env.DOCKER_JAVA_IMAGE || 'openjdk:11';
const DOCKER_PYTHON_IMAGE = process.env.DOCKER_PYTHON_IMAGE || 'python:3.9-slim';
const DOCKER_CPP_IMAGE = process.env.DOCKER_CPP_IMAGE || 'gcc:latest';
const DOCKER_C_IMAGE = process.env.DOCKER_C_IMAGE || 'gcc:latest';
const MAX_CODE_SIZE = parseInt(process.env.MAX_CODE_SIZE || '1048576', 10);
const CLEANUP_INTERVAL = parseInt(process.env.CLEANUP_INTERVAL || '3600000', 10);
const DEBUG = process.env.DEBUG === 'true';
const EXECUTION_TIMEOUT = parseInt(process.env.EXECUTION_TIMEOUT || '10000', 10);
const COMPILE_TIMEOUT = parseInt(process.env.COMPILE_TIMEOUT || '15000', 10);

// Debug logging function
const debugLog = (...args) => {
    if (DEBUG) {
        console.log('[DEBUG]', ...args);
    }
};

// Execute command with timeout
async function executeWithTimeout(cmd, timeout) {
    return new Promise((resolve, reject) => {
        const process = exec(cmd, { timeout }, (error, stdout, stderr) => {
            if (error) {
                if (error.signal === 'SIGTERM') {
                    reject(new Error('Command timed out'));
                } else {
                    reject(error);
                }
            } else {
                resolve({ stdout, stderr });
            }
        });
    });
}

// Middleware
app.use(cors());
app.use(express.json({
    limit: MAX_CODE_SIZE
}));

// Authentication middleware
const authenticateRequest = (req, res, next) => {
    const apiKey = req.headers['x-api-key'];
    if (!apiKey) {
        return res.status(401).json({ error: 'API key is required' });
    }
    // In production, you would validate the API key against a database
    next();
};

// Create temp directory if it doesn't exist
const tempDir = path.join(__dirname, TEMP_DIR);
fs.mkdir(tempDir, { recursive: true, mode: 0o777 }).catch(console.error);

// Periodic cleanup of temporary files
setInterval(async () => {
    try {
        const files = await fs.readdir(tempDir);
        const now = Date.now();
        for (const file of files) {
            const filePath = path.join(tempDir, file);
            const stats = await fs.stat(filePath);
            if (now - stats.mtimeMs > 3600000) { // Remove files older than 1 hour
                await cleanupTempFile(filePath);
            }
        }
    } catch (error) {
        console.error('Error during temp file cleanup:', error);
    }
}, CLEANUP_INTERVAL); // Run every hour

// Cleanup function for temporary files
async function cleanupTempFile(filePath) {
    try {
        await fs.access(filePath);
        await fs.unlink(filePath);
    } catch (error) {
        if (error.code !== 'ENOENT') {
            console.error('Error cleaning up temp file:', error);
        }
    }
}

// Language normalization map
const LANGUAGE_ALIASES = {
    'javascript': 'javascript',
    'js': 'javascript',
    'node': 'javascript',
    'nodejs': 'javascript',
    'ecmascript': 'javascript',
    'typescript': 'javascript', // TypeScript is handled by the JavaScript checker
    'ts': 'javascript',        // TypeScript alias

    'python': 'python',
    'py': 'python',
    'python3': 'python',
    'py3': 'python',

    'java': 'java',
    'javase': 'java',

    'cpp': 'cpp',
    'c++': 'cpp',
    'cplusplus': 'cpp',
    'c++11': 'cpp',
    'c++14': 'cpp',
    'c++17': 'cpp',
    'c++20': 'cpp',

    'c': 'c',
    'ansi-c': 'c',
    'c11': 'c',
    'c17': 'c'
};

// Function to normalize language name
function normalizeLanguage(lang) {
    return LANGUAGE_ALIASES[lang.toLowerCase()] || null;
}

// Helper function to wrap code snippets
function wrapCodeSnippet(code, language) {
    // For C++, return the code as-is without any wrapping or indentation changes
    if (language.toLowerCase() === 'cpp') {
        return code;
    }

    // Remove common indentation from the code
    const lines = code.split('\n');
    const indentation = lines[0].match(/^\s*/)[0].length;
    const unindentedCode = lines.map(line => line.slice(indentation)).join('\n');

    switch(language.toLowerCase()) {
        case 'java':
            // Check if code already contains class definition
            if (code.includes('class')) {
                // Add imports before the class definition
                return `import java.util.*;
import java.util.stream.*;
import java.util.function.*;
import java.time.*;
import java.math.*;
import java.text.*;
import java.security.*;
import java.util.concurrent.*;
import java.util.regex.*;
import java.io.*;
import static java.util.stream.Collectors.*;

${unindentedCode.replace(/public\s+class\s+(\w+)/, 'class $1')}`;
            }
            const className = `Solution_${Date.now()}`;
            return `import java.util.*;
import java.util.stream.*;
import java.util.function.*;
import java.time.*;
import java.math.*;
import java.text.*;
import java.security.*;
import java.util.concurrent.*;
import java.util.regex.*;
import java.io.*;
import static java.util.stream.Collectors.*;

class ${className} {
    public static void main(String[] args) {
        ${unindentedCode}
    }
}`;
        
        case 'python':
            // Python doesn't need wrapping, but we'll add common imports
            return `from typing import List, Optional
import math
import collections
import heapq

${unindentedCode}`;
        
        case 'c':
            if (code.includes('main(')) {
                return unindentedCode;
            }
            return `#include <stdio.h>
#include <stdlib.h>
#include <string.h>

int main() {
    ${unindentedCode}
    return 0;
}`;
        
        default:
            return code;
    }
}

// Function to adjust error line numbers based on wrapper code
function adjustErrorLineNumbers(error, language, hasWrapper) {
    if (!hasWrapper) return error;

    const wrapperLines = {
        'cpp': 24,  // Number of lines in C++ wrapper before user code
        'java': 13, // Number of lines in Java wrapper before user code
        'python': 5, // Number of lines in Python wrapper before user code
        'c': 5     // Number of lines in C wrapper before user code
    };

    if (error.line) {
        error.line -= wrapperLines[language.toLowerCase()] || 0;
        error.line = Math.max(1, error.line); // Ensure line number is at least 1
    }
    if (error.errors) {
        error.errors = error.errors.map(err => {
            if (err.line) {
                err.line -= wrapperLines[language.toLowerCase()] || 0;
                err.line = Math.max(1, err.line);
            }
            return err;
        });
    }
    return error;
}

// Function to execute JavaScript code
async function executeJavaScript(code) {
    const tempFile = path.join(tempDir, `js_${Date.now()}.js`);
    try {
        // Write the code directly to file
        await fs.writeFile(tempFile, code);
        
        // Execute the code
        const { stdout, stderr } = await execAsync(`node "${tempFile}"`);
        await cleanupTempFile(tempFile);

        if (stderr) {
            return { success: false, error: stderr };
        }

        return {
            success: true,
            output: stdout || 'Code executed successfully with no output'
        };
    } catch (error) {
        await cleanupTempFile(tempFile);
        return { success: false, error: error.message };
    }
}

// Function to execute Python code
async function executePython(code) {
    const pythonFile = path.join(tempDir, `script_${Date.now()}.py`);
    try {
        await fs.writeFile(pythonFile, code);
        debugLog('Running Python code...');
        const { stdout, stderr } = await executeWithTimeout(
            `docker run --rm -v "${tempDir}:/code" -w /code ${DOCKER_PYTHON_IMAGE} python /code/$(basename "${pythonFile}")`,
            EXECUTION_TIMEOUT
        );
        return { success: true, output: stdout, error: stderr || null };
    } catch (error) {
        debugLog('Python execution error:', error);
        return { 
            success: false, 
            output: null, 
            error: error.message.includes('timed out') ? 
                'Execution timed out. Your code took too long to run.' : 
                error.message 
        };
    } finally {
        await cleanupTempFile(pythonFile);
    }
}

// Helper function to extract Java class name
function extractJavaClassName(code) {
    const classMatch = code.match(/public\s+class\s+(\w+)/);
    return classMatch ? classMatch[1] : null;
}

// Function to execute Java code
async function executeJava(code) {
    let javaFile = null;
    let classFile = null;
    try {
        const className = extractJavaClassName(code) || `Solution_${Date.now()}`;
        javaFile = path.join(tempDir, `${className}.java`);
        classFile = path.join(tempDir, `${className}.class`);
        
        await fs.writeFile(javaFile, code);
        
        // Compile Java code with timeout
        debugLog('Compiling Java code...');
        await executeWithTimeout(
            `docker run --rm -v "${tempDir}:/code" -w /code ${DOCKER_JAVA_IMAGE} javac /code/$(basename "${javaFile}")`,
            COMPILE_TIMEOUT
        );
        
        // Run Java code with timeout
        debugLog('Running Java code...');
        const { stdout, stderr } = await executeWithTimeout(
            `docker run --rm -v "${tempDir}:/code" -w /code ${DOCKER_JAVA_IMAGE} java -cp /code ${className}`,
            EXECUTION_TIMEOUT
        );
        
        return { success: true, output: stdout, error: stderr || null };
    } catch (error) {
        debugLog('Java execution error:', error);
        return { 
            success: false, 
            output: null, 
            error: error.message.includes('timed out') ? 
                'Execution timed out. Your code took too long to run.' : 
                error.message 
        };
    } finally {
        if (javaFile) await cleanupTempFile(javaFile);
        if (classFile) await cleanupTempFile(classFile);
    }
}

// Function to execute C++ code
async function executeCPP(code) {
    const timestamp = Date.now();
    const cppFile = path.join(tempDir, `program_${timestamp}.cpp`);
    const execFile = path.join(tempDir, `program_${timestamp}`);
    
    try {
        // Process the code to ensure proper structure
        let processedCode = code;
        
        // Add necessary headers
        let headers = '';
        headers += '#include <iostream>\n';
        headers += '#include <stdexcept>\n';
        headers += '#include <string>\n';
        headers += '#include <vector>\n';
        headers += '#include <algorithm>\n';
        headers += '#include <memory>\n';
        headers += '#include <cstdlib>\n';
        headers += '#include <cstring>\n';
        headers += '#include <cctype>\n';
        headers += '#include <cmath>\n\n';
        
        // Add namespace
        headers += 'using namespace std;\n\n';
        
        // Write the code to a temporary file
        const finalCode = headers + processedCode;
        debugLog('Writing code to file:', finalCode);
        await fs.writeFile(cppFile, finalCode, 'utf8');
        
        // Get absolute paths for Docker volume mounting
        const absoluteTempDir = path.resolve(tempDir);
        const relativeFilePath = path.basename(cppFile);
        const relativeExecPath = path.basename(execFile);
        
        // Create a Docker container for compilation and execution
        debugLog('Compiling and running C++ code...');
        
        // First, create a Dockerfile
        const dockerfilePath = path.join(tempDir, `Dockerfile_${timestamp}`);
        const dockerfileContent = `FROM ${DOCKER_CPP_IMAGE}
WORKDIR /workspace
COPY ${relativeFilePath} .
RUN g++ -Wall -Wextra -std=c++20 ${relativeFilePath} -o ${relativeExecPath}
CMD ["./program_${timestamp}"]`;
        
        await fs.writeFile(dockerfilePath, dockerfileContent);
        
        // Build and run the Docker container
        try {
            // Build the container
            const buildCmd = `docker build -t cpp_program_${timestamp} -f "${dockerfilePath}" "${absoluteTempDir}"`;
            debugLog('Build command:', buildCmd);
            
            const { stdout: buildStdout, stderr: buildStderr } = await executeWithTimeout(buildCmd, COMPILE_TIMEOUT);
            
            if (buildStderr) {
                // Process compilation errors to make them more readable
                const errorLines = buildStderr.split('\n');
                const errors = [];
                let mainError = '';
                
                for (const line of errorLines) {
                    const match = line.match(/(.*?):(\d+):(\d+):\s*(warning|error):\s*(.*)/);
                    if (match) {
                        const [_, file, lineNum, col, type, msg] = match;
                        
                        if (type === 'error' && !mainError) {
                            mainError = msg;
                        }

                        // Adjust line numbers to account for added headers
                        const adjustedLineNum = parseInt(lineNum) - headers.split('\n').length + 1;

                        errors.push({
                            line: Math.max(1, adjustedLineNum),
                            column: parseInt(col),
                            type: type,
                            message: msg.trim(),
                            suggestion: getSuggestionForError(msg)
                        });
                    }
                }
                
                return { 
                    success: false, 
                    output: null, 
                    error: mainError || 'Compilation failed',
                    errors: errors
                };
            }
            
            // Run the container
            const runCmd = `docker run --rm cpp_program_${timestamp}`;
            debugLog('Run command:', runCmd);
            
            const { stdout, stderr } = await executeWithTimeout(runCmd, EXECUTION_TIMEOUT);
            
            return { 
                success: true, 
                output: stdout, 
                error: stderr || null 
            };
        } catch (error) {
            debugLog('Docker error:', error);
            return { 
                success: false, 
                output: null, 
                error: error.message.includes('timed out') ? 
                    'Execution timed out. Your code took too long to run.' : 
                    error.message 
            };
        } finally {
            // Cleanup Docker resources
            try {
                await execAsync(`docker rmi cpp_program_${timestamp}`);
            } catch (e) {
                debugLog('Error cleaning up Docker image:', e);
            }
        }
    } catch (error) {
        debugLog('C++ execution error:', error);
        return { 
            success: false, 
            output: null, 
            error: error.message.includes('timed out') ? 
                'Execution timed out. Your code took too long to run.' : 
                error.message 
        };
    } finally {
        await cleanupTempFile(cppFile);
        await cleanupTempFile(execFile);
        await cleanupTempFile(path.join(tempDir, `Dockerfile_${timestamp}`));
    }
}

// Function to execute C code
async function executeC(code) {
    const cFile = path.join(tempDir, `program_${Date.now()}.c`);
    const execFile = path.join(tempDir, `program_${Date.now()}`);
    try {
        // Add error handling code
        const wrappedCode = `
#include <stdio.h>
#include <stdlib.h>
#include <signal.h>
#include <string.h>

void signal_handler(int signal_num) {
    switch (signal_num) {
        case SIGSEGV:
            fprintf(stderr, "Segmentation fault (accessing invalid memory)\\n");
            exit(1);
        case SIGFPE:
            fprintf(stderr, "Floating point exception (division by zero)\\n");
            exit(1);
        case SIGABRT:
            fprintf(stderr, "Aborted (assertion failed or abort() called)\\n");
            exit(1);
    }
}

int main() {
    signal(SIGSEGV, signal_handler);
    signal(SIGFPE, signal_handler);
    signal(SIGABRT, signal_handler);
    ${code.includes('main()') ? code.replace(/int\s+main\s*\([^)]*\)\s*{/, '').slice(0, -1) : code}
    return 0;
}`;
        
        await fs.writeFile(cFile, wrappedCode);
        
        // Compile C code with timeout and all warnings
        debugLog('Compiling C code...');
        await executeWithTimeout(
            `docker run --rm -v "${tempDir}:/code" -w /code ${DOCKER_C_IMAGE} gcc -Wall -Wextra -std=c17 /code/$(basename "${cFile}") -o /code/$(basename "${execFile}")`,
            COMPILE_TIMEOUT
        );
        
        // Run C code with timeout
        debugLog('Running C code...');
        const { stdout, stderr } = await executeWithTimeout(
            `docker run --rm -v "${tempDir}:/code" -w /code ${DOCKER_C_IMAGE} /code/$(basename "${execFile}")`,
            EXECUTION_TIMEOUT
        );
        
        return { success: stderr ? false : true, output: stdout, error: stderr || null };
    } catch (error) {
        debugLog('C execution error:', error);
        return { 
            success: false, 
            output: null, 
            error: error.message.includes('timed out') ? 
                'Execution timed out. Your code took too long to run.' : 
                error.message 
        };
    } finally {
        await cleanupTempFile(cFile);
        await cleanupTempFile(execFile);
    }
}

// Modify the check-syntax endpoint
app.post('/check-syntax', authenticateRequest, async (req, res) => {
    let { code, language } = req.body;

    if (!code || !language) {
        return res.status(400).json({ 
            error: 'Both code and language are required' 
        });
    }

    // Ensure code is a string and handle any potential encoding issues
    try {
        code = decodeURIComponent(code);
    } catch (e) {
        // If decoding fails, use the original code
        code = String(code);
    }

    const normalizedLang = normalizeLanguage(language);
    if (!normalizedLang) {
        return res.status(400).json({ 
            error: 'Unsupported language' 
        });
    }

    try {
        let syntaxResult;
        let executionResult = null;

        // First check syntax
        switch (normalizedLang) {
            case 'javascript':
                syntaxResult = checkJavaScriptSyntax(code);
                if (syntaxResult.valid) {
                    executionResult = await executeJavaScript(code);
                }
                break;
            case 'python':
                syntaxResult = await checkPythonSyntax(code);
                if (syntaxResult.valid) {
                    executionResult = await executePython(code);
                }
                break;
            case 'java':
                syntaxResult = await checkJavaSyntax(code);
                if (syntaxResult.valid) {
                    executionResult = await executeJava(code);
                }
                break;
            case 'cpp':
                // For C++, use the code as-is without any wrapping
                syntaxResult = await checkCPPSyntax(code);
                if (syntaxResult.valid) {
                    executionResult = await executeCPP(code);
                }
                break;
            case 'c':
                syntaxResult = await checkCSyntax(code);
                if (syntaxResult.valid) {
                    executionResult = await executeC(code);
                }
                break;
            default:
                return res.status(400).json({ error: 'Unsupported language' });
        }

        // Prepare the response
        const response = {
            valid: syntaxResult.valid,
            message: syntaxResult.message,
            error: syntaxResult.error,
            details: syntaxResult.details,
            language: {
                requested: language,
                normalized: normalizedLang
            }
        };

        // Add execution result if syntax was valid
        if (syntaxResult.valid && executionResult) {
            response.execution = {
                success: executionResult.success,
                output: executionResult.success ? executionResult.output : null,
                error: executionResult.success ? null : executionResult.error
            };
        }

        res.json(response);
    } catch (error) {
        console.error('Error processing request:', error);
        res.status(500).json({ 
            error: 'Internal server error',
            details: error.message 
        });
    }
});

// JavaScript syntax checker
function checkJavaScriptSyntax(code) {
    // Check code size
    if (code.length > 1000000) { // 1MB limit
        return {
            valid: false,
            error: 'Code size exceeds maximum limit of 1MB'
        };
    }

    try {
        // First try as a module with all features
        try {
            babelParse(code, {
                sourceType: 'module',
                allowReturnOutsideFunction: true,
                allowAwaitOutsideFunction: true,
                allowSuperOutsideMethod: true,
                allowUndeclaredExports: true,
                plugins: [
                    'jsx',
                    'typescript',
                    'classProperties',
                    'privateClassMethods',
                    'classStaticBlock',
                    'nullishCoalescingOperator',
                    'optionalChaining',
                    ['decorators', { decoratorsBeforeExport: true }]
                ]
            });
            return { valid: true, message: 'Syntax is valid' };
        } catch (moduleError) {
            // If module parsing fails, try as script
            try {
                babelParse(code, {
                    sourceType: 'script',
                    allowReturnOutsideFunction: true,
                    plugins: [
                        'jsx',
                        'typescript',
                        'decorators-legacy',
                        'classProperties',
                        'privateClassMethods',
                        'classStaticBlock',
                        'nullishCoalescingOperator',
                        'optionalChaining',
                        ['decorators', { decoratorsBeforeExport: true }]
                    ]
                });
                return { valid: true, message: 'Syntax is valid' };
            } catch (scriptError) {
                // Return the more relevant error message
                const error = scriptError.code === 'BABEL_PARSER_SYNTAX_ERROR' ? scriptError : moduleError;
                return {
                    valid: false,
                    error: error.message.split('\n')[0],
                    line: error.loc?.line || 1,
                    column: error.loc?.column || 0,
                    details: {
                        message: error.message,
                        type: error.code || 'SyntaxError',
                        loc: error.loc
                    }
                };
            }
        }
    } catch (error) {
        return {
            valid: false,
            error: error.message,
            details: {
                message: error.message,
                type: 'Error'
            }
        };
    }
}

// Python syntax checker
async function checkPythonSyntax(code) {
    const tempFile = path.join(tempDir, `check_${Date.now()}.py`);
    
    try {
        // Check code size
        if (code.length > 1000000) { // 1MB limit
            return {
                valid: false,
                error: 'Code size exceeds maximum limit of 1MB'
            };
        }

        await fs.writeFile(tempFile, code);
        
        try {
            await execAsync(`/usr/bin/python3 -m py_compile "${tempFile}"`);
            await cleanupTempFile(tempFile);
            return { valid: true, message: 'Syntax is valid' };
        } catch (error) {
            const errorInfo = {
                valid: false,
                error: error.stderr,
                details: error.stderr.split('\n').map(line => {
                    const match = line.match(/File ".*", line (\d+)/);
                    return match ? {
                        line: parseInt(match[1]),
                        message: line.trim()
                    } : null;
                }).filter(Boolean)
            };
            await cleanupTempFile(tempFile);
            return errorInfo;
        }
    } catch (error) {
        await cleanupTempFile(tempFile);
        return {
            valid: false,
            error: error.message
        };
    }
}

// Function to check Java syntax
async function checkJavaSyntax(code) {
    try {
        // Extract the public class name from the code if it exists
        const publicClassMatch = code.match(/public\s+class\s+(\w+)/);
        const className = publicClassMatch ? publicClassMatch[1] : `Check_${Date.now()}`;
        const tempFile = path.join(tempDir, `${className}.java`);
        
        await fs.writeFile(tempFile, code);
        
        // Use Docker to compile the Java file
        await execAsync(`docker run --rm -v "${tempDir}:/code" -w /code openjdk:11 javac /code/$(basename "${tempFile}")`);
        
        await cleanupTempFile(tempFile);
        await cleanupTempFile(tempFile.replace('.java', '.class'));
        return { valid: true, message: 'Syntax is valid' };
    } catch (error) {
        return { 
            valid: false, 
            error: error.message,
            details: []
        };
    }
}

// Enhanced C++ syntax checker
async function checkCPPSyntax(code) {
    const tempFile = path.join(tempDir, `check_${Date.now()}.cpp`);
    
    try {
        // Check code size
        if (code.length > 1000000) { // 1MB limit
            return {
                valid: false,
                error: 'Code size exceeds maximum limit of 1MB'
            };
        }

        // Add necessary headers
        let headers = '';
        headers += '#include <iostream>\n';
        headers += '#include <stdexcept>\n';
        headers += '#include <string>\n';
        headers += '#include <vector>\n';
        headers += '#include <algorithm>\n';
        headers += '#include <memory>\n';
        headers += '#include <cstdlib>\n';
        headers += '#include <cstring>\n';
        headers += '#include <cctype>\n';
        headers += '#include <cmath>\n\n';
        
        // Add namespace
        headers += 'using namespace std;\n\n';
        
        // Write the code to a temporary file
        const finalCode = headers + code;
        debugLog('Writing code to file:', finalCode);
        await fs.writeFile(tempFile, finalCode, 'utf8');
        
        try {
            // Try with different C++ standards in order of most modern to least
            const standards = [
                { std: 'c++20', name: 'C++20' },
                { std: 'c++17', name: 'C++17' },
                { std: 'c++14', name: 'C++14' },
                { std: 'c++11', name: 'C++11' }
            ];
            
            let success = false;
            let lastError = null;
            let usedStandard = null;

            for (const standard of standards) {
                try {
                    const cmd = `docker run --rm -v "${path.dirname(tempFile)}:/workspace" -w /workspace ${DOCKER_CPP_IMAGE} bash -c 'cat /workspace/$(basename "${tempFile}") && g++ -std=${standard.std} -fsyntax-only -Wall -Wextra /workspace/$(basename "${tempFile}")'`;
                    debugLog('Syntax check command:', cmd);
                    const { stdout, stderr } = await execAsync(cmd);
                    success = true;
                    usedStandard = standard.name;
                    break;
                } catch (e) {
                    // If error doesn't mention C++ standard, this might be the right standard but with other errors
                    if (!e.stderr.includes('standard')) {
                        lastError = e;
                        usedStandard = standard.name;
                        break;
                    }
                    lastError = e;
                }
            }

            if (success) {
                await cleanupTempFile(tempFile);
                return { 
                    valid: true, 
                    message: 'Syntax is valid',
                    standard: usedStandard
                };
            }

            // Process the error for better readability
            const errorLines = lastError.stderr.split('\n');
            const errors = [];
            let mainError = '';
            
            for (const line of errorLines) {
                // Skip standard-related errors as we've tried all standards
                if (line.includes('standard')) continue;
                
                const match = line.match(/(.*?):(\d+):(\d+):\s*(warning|error):\s*(.*)/);
                if (match) {
                    const [_, file, lineNum, col, type, msg] = match;
                    
                    // Store the first error as main error
                    if (type === 'error' && !mainError) {
                        mainError = msg;
                    }

                    // Adjust line numbers to account for added headers
                    const adjustedLineNum = parseInt(lineNum) - headers.split('\n').length + 1;

                    errors.push({
                        line: Math.max(1, adjustedLineNum),
                        column: parseInt(col),
                        type: type,
                        message: msg.trim(),
                        suggestion: getSuggestionForError(msg)
                    });
                }
            }
            
            await cleanupTempFile(tempFile);
            return {
                valid: false,
                error: mainError || 'Syntax error in C++ code',
                errors: errors,
                standard: usedStandard || 'Unknown',
                help: 'Make sure your code follows C++ syntax rules and all required headers are included.'
            };
        } catch (error) {
            await cleanupTempFile(tempFile);
            return {
                valid: false,
                error: error.stderr || error.message,
                errors: [],
                help: 'An unexpected error occurred while checking the syntax.'
            };
        }
    } catch (error) {
        await cleanupTempFile(tempFile);
        return {
            valid: false,
            error: error.message
        };
    }
}

// Helper function to provide suggestions for common C++ errors
function getSuggestionForError(error) {
    if (error.includes('template declaration cannot appear at block scope')) {
        return 'Template declarations must be at global scope. Move your template class/function definition outside of any function.';
    }
    if (error.includes('was not declared in this scope')) {
        return 'Make sure the identifier is declared before use. Check for typos and proper includes.';
    }
    if (error.includes('expected primary-expression')) {
        return 'Check for missing semicolons, parentheses, or braces. Also verify template syntax is correct.';
    }
    if (error.includes('no matching function')) {
        return 'Verify that the function call matches the function declaration and all types are correct.';
    }
    if (error.includes('invalid use of')) {
        return 'Check if you are using the type/variable correctly according to its declaration.';
    }
    if (error.includes('undefined reference')) {
        return 'Make sure you have included the necessary header files and implemented all declared functions.';
    }
    if (error.includes('local class shall not have static data member')) {
        return 'Move the class definition to global scope and ensure static members are properly declared.';
    }
    return 'Review the syntax and ensure all variables and types are properly declared.';
}

// C syntax checker
async function checkCSyntax(code) {
    const tempFile = path.join(tempDir, `check_${Date.now()}.c`);
    
    try {
        // Check code size
        if (code.length > 1000000) { // 1MB limit
            return {
                valid: false,
                error: 'Code size exceeds maximum limit of 1MB'
            };
        }

        await fs.writeFile(tempFile, code);
        
        try {
            const { stdout, stderr } = await execAsync(`gcc -fsyntax-only -Wall -pedantic "${tempFile}"`);
            await cleanupTempFile(tempFile);
            return { valid: true, message: 'Syntax is valid' };
        } catch (error) {
            const errorLines = error.stderr.split('\n');
            const errors = [];
            
            for (const line of errorLines) {
                const match = line.match(/(.*?):(\d+):(\d+):\s*(warning|error):\s*(.*)/);
                if (match) {
                    errors.push({
                        line: parseInt(match[2]),
                        column: parseInt(match[3]),
                        type: match[4],
                        message: match[5].trim()
                    });
                }
            }
            
            await cleanupTempFile(tempFile);
            return {
                valid: false,
                error: error.stderr,
                errors: errors
            };
        }
    } catch (error) {
        await cleanupTempFile(tempFile);
        return {
            valid: false,
            error: error.message
        };
    }
}

// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Start server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
}); 