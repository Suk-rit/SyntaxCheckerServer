#include <iostream>
#include "Stack.hpp"

int main() {
    try {
        std::cout << "\nTesting Integer Stack:" << std::endl;
        Stack<int> intStack;
        
        // Push some integers
        intStack.push(10);
        intStack.push(20);
        intStack.push(30);
        
        // Pop and print integers
        std::cout << "Popping integers: ";
        while (!intStack.isEmpty()) {
            std::cout << intStack.pop() << " ";
        }
        std::cout << std::endl;

        // Test underflow
        try {
            intStack.pop();
        } catch (const std::underflow_error& e) {
            std::cout << "Expected error caught: " << e.what() << std::endl;
        }

        std::cout << "\nTesting Double Stack:" << std::endl;
        Stack<double> doubleStack;
        
        // Push some doubles
        doubleStack.push(1.1);
        doubleStack.push(2.2);
        doubleStack.push(3.3);
        
        // Pop and print doubles
        std::cout << "Popping doubles: ";
        while (!doubleStack.isEmpty()) {
            std::cout << doubleStack.pop() << " ";
        }
        std::cout << std::endl;

    } catch (const std::exception& e) {
        std::cerr << "Unexpected error: " << e.what() << std::endl;
        return 1;
    }

    return 0;
} 