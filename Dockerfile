FROM node:18

# Install Python
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip

# Install C and C++ compilers and development tools
RUN apt-get install -y \
    build-essential \
    gcc \
    g++ \
    cmake \
    libstdc++-11-dev

# Install Docker CLI
RUN apt-get install -y \
    apt-transport-https \
    ca-certificates \
    curl \
    gnupg \
    lsb-release && \
    curl -fsSL https://download.docker.com/linux/debian/gpg | gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg && \
    echo "deb [arch=amd64 signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/debian $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null && \
    apt-get update && \
    apt-get install -y docker-ce-cli

# Install Java
RUN apt-get install -y \
    default-jdk

# Set C++ compiler flags
ENV CPLUS_INCLUDE_PATH=/usr/include/c++/10:/usr/include/x86_64-linux-gnu/c++/10
ENV LIBRARY_PATH=/usr/lib/x86_64-linux-gnu
ENV LD_LIBRARY_PATH=/usr/lib/x86_64-linux-gnu

# Create app directory
WORKDIR /usr/src/app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy app source
COPY . .

# Create temp directory
RUN mkdir -p temp

# Expose port
EXPOSE 3000

# Start command
CMD [ "node", "server.js" ] 