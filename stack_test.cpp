#include <iostream>
#include <stdexcept>
#include <string>

template<typename T>
class Stack {
private:
    static const int MAX_SIZE = 100;
    T arr[MAX_SIZE];
    int top;

public:
    Stack() : top(-1) {}

    void push(const T& value) {
        if (top >= MAX_SIZE - 1) {
            throw std::overflow_error("Stack is full");
        }
        arr[++top] = value;
    }

    T pop() {
        if (isEmpty()) {
            throw std::underflow_error("Stack is empty");
        }
        return arr[top--];
    }

    T peek() const {
        if (isEmpty()) {
            throw std::underflow_error("Stack is empty");
        }
        return arr[top];
    }

    bool isEmpty() const {
        return top == -1;
    }

    int size() const {
        return top + 1;
    }
};

int main() {
    try {
        // Test 1: Basic Integer Stack Operations
        std::cout << "\nTest 1: Basic Integer Stack Operations" << std::endl;
        Stack<int> intStack;
        
        // Push and check size
        intStack.push(10);
        std::cout << "Size after pushing 10: " << intStack.size() << std::endl;
        intStack.push(20);
        std::cout << "Size after pushing 20: " << intStack.size() << std::endl;
        intStack.push(30);
        std::cout << "Size after pushing 30: " << intStack.size() << std::endl;
        
        // Peek and pop
        std::cout << "Top element: " << intStack.peek() << std::endl;
        std::cout << "Popping elements: ";
        while (!intStack.isEmpty()) {
            std::cout << intStack.pop() << " ";
        }
        std::cout << std::endl;
        std::cout << "Final size: " << intStack.size() << std::endl;

        // Test 2: Double Stack with Overflow Test
        std::cout << "\nTest 2: Double Stack with Overflow Test" << std::endl;
        Stack<double> doubleStack;
        
        // Fill the stack
        for (int i = 0; i < 100; i++) {
            doubleStack.push(i * 1.1);
        }
        std::cout << "Stack filled to capacity: " << doubleStack.size() << std::endl;
        
        // Test overflow
        try {
            doubleStack.push(101.1);
            std::cout << "Error: Overflow not caught!" << std::endl;
        } catch (const std::overflow_error& e) {
            std::cout << "Overflow correctly caught: " << e.what() << std::endl;
        }

        // Test 3: String Stack
        std::cout << "\nTest 3: String Stack" << std::endl;
        Stack<std::string> stringStack;
        
        stringStack.push("Hello");
        stringStack.push("World");
        stringStack.push("!");
        
        std::cout << "Popping strings: ";
        while (!stringStack.isEmpty()) {
            std::cout << stringStack.pop() << " ";
        }
        std::cout << std::endl;

        // Test 4: Empty Stack Operations
        std::cout << "\nTest 4: Empty Stack Operations" << std::endl;
        Stack<int> emptyStack;
        
        std::cout << "Is empty: " << (emptyStack.isEmpty() ? "true" : "false") << std::endl;
        std::cout << "Size: " << emptyStack.size() << std::endl;
        
        try {
            emptyStack.pop();
            std::cout << "Error: Underflow not caught!" << std::endl;
        } catch (const std::underflow_error& e) {
            std::cout << "Underflow correctly caught: " << e.what() << std::endl;
        }

    } catch (const std::exception& e) {
        std::cerr << "Unexpected error: " << e.what() << std::endl;
        return 1;
    }

    return 0;
} 