// Test script for syntax checker server
async function testSyntax(language, code) {
    try {
        const response = await fetch('http://localhost:3000/check-syntax', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': 'test-key'
            },
            body: JSON.stringify({ language, code })
        });
        
        const result = await response.json();
        console.log(`\n=== Testing ${language.toUpperCase()} ===`);
        console.log('Code:', code);
        console.log('Result:', JSON.stringify(result, null, 2));
        console.log('===============================\n');
        return result;
    } catch (error) {
        console.error(`Error testing ${language}:`, error.message);
    }
}

// Test cases
const tests = [
    {
        name: 'JavaScript - Valid',
        language: 'javascript',
        code: 'function add(a, b) { return a + b; }\nconsole.log(add(2, 3));'
    },
    {
        name: 'JavaScript - Invalid',
        language: 'javascript',
        code: 'function add(a, b) { return a + b; \nconsole.log(add(2, 3));' // Missing closing brace
    },
    {
        name: 'Python - Valid',
        language: 'python',
        code: 'def factorial(n):\n    return 1 if n == 0 else n * factorial(n-1)\nprint(factorial(5))'
    },
    {
        name: 'Python - Invalid',
        language: 'python',
        code: 'def factorial(n):\n    return 1 if n == 0 else n * factorial(n-1)\nprint(factorial(5)' // Missing closing parenthesis
    },
    {
        name: 'Java - Valid',
        language: 'java',
        code: 'public class Test {\n    public static void main(String[] args) {\n        System.out.println("Hello World!");\n    }\n}'
    },
    {
        name: 'Java - Invalid',
        language: 'java',
        code: 'public class Test {\n    public static void main(String[] args) {\n        System.out.println("Hello World!")\n    }\n}' // Missing semicolon
    },
    {
        name: 'C++ - Valid',
        language: 'cpp',
        code: '#include <iostream>\nint main() {\n    std::cout << "Hello World!" << std::endl;\n    return 0;\n}'
    },
    {
        name: 'C++ - Invalid',
        language: 'cpp',
        code: '#include <iostream>\nint main() {\n    std::cout << "Hello World!" << std::endl\n    return 0;\n}' // Missing semicolon
    },
    {
        name: 'C - Valid',
        language: 'c',
        code: '#include <stdio.h>\nint main() {\n    printf("Hello World!\\n");\n    return 0;\n}'
    },
    {
        name: 'C - Invalid',
        language: 'c',
        code: '#include <stdio.h>\nint main() {\n    printf("Hello World!\\n")\n    return 0;\n}' // Missing semicolon
    }
];

// Run all tests
async function runTests() {
    for (const test of tests) {
        console.log(`Running test: ${test.name}`);
        await testSyntax(test.language, test.code);
    }
}

// Run tests
runTests().catch(console.error);
