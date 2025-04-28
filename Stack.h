#ifndef STACK_H
#define STACK_H

#include <stdexcept>

const int MAX_SIZE = 100;

template <typename T>
class Stack {
private:
    T arr[MAX_SIZE];
    int top;

public:
    Stack() : top(-1) {}

    void push(T value) {
        if (top >= MAX_SIZE - 1) {
            throw std::overflow_error("Stack overflow");
        }
        arr[++top] = value;
    }

    T pop() {
        if (isEmpty()) {
            throw std::underflow_error("Stack underflow");
        }
        return arr[top--];
    }

    bool isEmpty() const {
        return top == -1;
    }
};

#endif // STACK_H 