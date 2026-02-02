FROM python:3.11-slim

# Install git and other useful tools
RUN apt-get update && apt-get install -y \
    git \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Upgrade pip
RUN pip install --upgrade pip

# Install common Python packages
RUN pip install \
    flask \
    requests \
    pytest

WORKDIR /workspace

# Expose common ports for development
EXPOSE 3000 3001 3002 3003 3004 3005 3006 3007 3008 3009 3010
EXPOSE 5000 8000 8080

CMD ["/bin/bash"]
