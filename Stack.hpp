#ifndef STACK_HPP
#define STACK_HPP

#include <stdexcept>

template <typename T>
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

    bool isEmpty() const {
        return top == -1;
    }
};

#endif // STACK_HPP 