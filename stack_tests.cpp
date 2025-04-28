#include <iostream>
#include <string>
#include <vector>
#include "Stack.h"

// Test Case 1: Basic Stack Operations
void testBasicOperations() {
    std::cout << "\n=== Test Case 1: Basic Stack Operations ===\n";
    Stack<int> stack;
    
    // Test push and pop
    std::cout << "Pushing values: 1, 2, 3\n";
    stack.push(1);
    stack.push(2);
    stack.push(3);
    
    std::cout << "Popping values: ";
    while (!stack.isEmpty()) {
        std::cout << stack.pop() << " ";
    }
    std::cout << "\n";
}

// Test Case 2: Different Data Types
void testDifferentDataTypes() {
    std::cout << "\n=== Test Case 2: Different Data Types ===\n";
    
    // Test with integers
    Stack<int> intStack;
    std::cout << "Testing integer stack:\n";
    intStack.push(10);
    intStack.push(20);
    std::cout << "Popped: " << intStack.pop() << "\n";
    
    // Test with doubles
    Stack<double> doubleStack;
    std::cout << "Testing double stack:\n";
    doubleStack.push(3.14);
    doubleStack.push(2.71);
    std::cout << "Popped: " << doubleStack.pop() << "\n";
    
    // Test with strings
    Stack<std::string> stringStack;
    std::cout << "Testing string stack:\n";
    stringStack.push("Hello");
    stringStack.push("World");
    std::cout << "Popped: " << stringStack.pop() << "\n";
}

// Test Case 3: Edge Cases
void testEdgeCases() {
    std::cout << "\n=== Test Case 3: Edge Cases ===\n";
    Stack<int> stack;
    
    // Test empty stack
    std::cout << "Testing empty stack:\n";
    std::cout << "Is empty? " << (stack.isEmpty() ? "Yes" : "No") << "\n";
    
    // Test single element
    std::cout << "Testing single element:\n";
    stack.push(42);
    std::cout << "Popped: " << stack.pop() << "\n";
    
    // Test multiple pushes and pops
    std::cout << "Testing multiple operations:\n";
    for (int i = 0; i < 5; i++) {
        stack.push(i);
    }
    while (!stack.isEmpty()) {
        std::cout << stack.pop() << " ";
    }
    std::cout << "\n";
}

// Test Case 4: Error Handling
void testErrorHandling() {
    std::cout << "\n=== Test Case 4: Error Handling ===\n";
    Stack<int> stack;
    
    try {
        std::cout << "Testing underflow:\n";
        stack.pop(); // Should throw underflow_error
    } catch (const std::underflow_error& e) {
        std::cout << "Caught underflow error: " << e.what() << "\n";
    }
    
    try {
        std::cout << "Testing overflow:\n";
        for (int i = 0; i < 101; i++) { // MAX_SIZE is 100
            stack.push(i);
        }
    } catch (const std::overflow_error& e) {
        std::cout << "Caught overflow error: " << e.what() << "\n";
    }
}

// Test Case 5: Complex Data Types
void testComplexDataTypes() {
    std::cout << "\n=== Test Case 5: Complex Data Types ===\n";
    
    // Test with vectors
    Stack<std::vector<int> > vectorStack;
    std::vector<int> v1;
    v1.push_back(1);
    v1.push_back(2);
    v1.push_back(3);
    
    std::vector<int> v2;
    v2.push_back(4);
    v2.push_back(5);
    v2.push_back(6);
    
    vectorStack.push(v1);
    vectorStack.push(v2);
    
    std::vector<int> popped = vectorStack.pop();
    std::cout << "Popped vector: ";
    for (size_t i = 0; i < popped.size(); ++i) {
        std::cout << popped[i] << " ";
    }
    std::cout << "\n";
}

int main() {
    try {
        testBasicOperations();
        testDifferentDataTypes();
        testEdgeCases();
        testErrorHandling();
        testComplexDataTypes();
        
        std::cout << "\nAll tests completed successfully!\n";
    } catch (const std::exception& e) {
        std::cerr << "Test failed: " << e.what() << "\n";
        return 1;
    }
    
    return 0;
} 