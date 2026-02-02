FROM alpine:latest

# Install basic tools
RUN apk add --no-cache \
    bash \
    curl \
    git \
    vim \
    nano

WORKDIR /workspace

# Expose common ports for development
EXPOSE 3000 3001 3002 3003 3004 3005 3006 3007 3008 3009 3010

CMD ["/bin/bash"]
