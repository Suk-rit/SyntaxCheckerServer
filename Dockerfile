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

# Install Java with full JDK
RUN apt-get install -y \
    openjdk-17-jdk

# Set Java environment variables
ENV JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64
ENV PATH=$PATH:$JAVA_HOME/bin

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