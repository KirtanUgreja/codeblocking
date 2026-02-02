FROM node:20-alpine

# Install git and other useful tools
RUN apk add --no-cache \
    git \
    curl \
    bash

# Update npm to latest
RUN npm install -g npm@latest

# Install common global packages
RUN npm install -g \
    typescript \
    ts-node \
    nodemon

WORKDIR /workspace

# Expose common ports for development
EXPOSE 3000 3001 3002 3003 3004 3005 3006 3007 3008 3009 3010
EXPOSE 5000 8000 8080

CMD ["/bin/bash"]
