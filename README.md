# Syntax Checker Server

A robust syntax checking service that supports multiple programming languages including JavaScript/TypeScript, Python, Java, C++, and C.

## Features

- Multi-language syntax checking
- Detailed error reporting with line numbers
- Modern language features support
- Docker-based Java compilation
- Health check endpoint
- API key authentication

## Supported Languages

- JavaScript/TypeScript
  - Modern ES features
  - TypeScript type annotations
  - JSX support
- Python
  - Python 3 syntax
  - Type hints
  - Indentation checking
- Java (via Docker)
  - Modern Java features
  - Stream API
  - Lambda expressions
- C++
  - C++20 standard
  - Templates
  - Concepts
  - Modern C++ features
- C
  - Standard C syntax
  - Detailed compiler warnings

## Prerequisites

- Node.js (v14 or higher)
- npm (Node Package Manager)
- Python (for Python syntax checking)
- Docker
- GCC/G++

## Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file with your configuration:
   ```
   PORT=3000
   ```

## Usage

1. Start the server:
   ```bash
   node server.js
   ```

2. The server will be running at `http://localhost:3000`

## API Endpoints

### POST /check-syntax
Checks the syntax of provided code.

Request body:
```json
{
    "language": "string",  // Language identifier
    "code": "string"      // Source code to check
}
```

Response:
```json
{
    "valid": boolean,
    "message": "string",   // Success message if valid
    "error": "string",     // Error message if invalid
    "details": [...],      // Detailed error information
    "language": {
        "requested": "string",
        "normalized": "string"
    }
}
```

### GET /health
Health check endpoint.

Response:
```json
{
    "status": "healthy",
    "timestamp": "ISO date string"
}
```

## Deployment on Render

1. Fork/Clone this repository
2. Connect your repository to Render
3. Create a new Web Service
4. Select "Docker" as environment
5. Set the following environment variables:
   - `API_KEY`: Your chosen API key for authentication
   - `PORT`: 3000 (default)
6. Deploy!

## Local Development

### Setup

1. Clone the repository:
```bash
git clone <repository-url>
cd syntax-checker-server
```

2. Install dependencies:
```bash
npm install
```

3. Build Java Docker image:
```bash
docker build -t java-syntax-checker -f Dockerfile.java .
```

4. Create .env file:
```bash
echo "API_KEY=your-api-key" > .env
```

5. Start the server:
```bash
node server.js
```

## Architecture

The server uses:
- Express.js for the web server
- Docker for Java compilation
- Native compilers for C/C++
- Python's built-in compiler
- Babel parser for JavaScript/TypeScript

Key components:
1. Language normalization
2. Code wrapping for proper context
3. Error line number adjustment
4. Temporary file management
5. Security measures

## Security Considerations

- API key authentication
- Code size limits
- Temporary file cleanup
- Docker isolation for Java
- Input validation

## Error Handling

The server provides detailed error information:
- Line numbers
- Column positions
- Error descriptions
- Suggestions when available
- Standard-specific details

## Future Enhancements

- Rate limiting
- Additional language support
- Syntax highlighting
- Code formatting
- Static analysis

## License

MIT License

## Contributing

Feel free to submit issues and enhancement requests. 