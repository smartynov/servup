# Use Python 3.11 slim image
FROM python:3.11-slim

# Metadata labels
LABEL org.opencontainers.image.title="Server Setup Generator"
LABEL org.opencontainers.image.description="Generate bash scripts for Linux server setup"
LABEL org.opencontainers.image.authors="smartynov"
LABEL org.opencontainers.image.source="https://github.com/smartynov/servup"
LABEL org.opencontainers.image.documentation="https://github.com/smartynov/servup/blob/main/server-setup-generator/README.md"

# Set working directory
WORKDIR /app

# Set environment variables
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

# Install system dependencies
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for better caching
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy VERSION file
COPY VERSION /app/VERSION

# Copy application code
COPY app/ /app/

# Create directories for data and scripts
RUN mkdir -p /app/data /app/scripts

# Create volume mount points
VOLUME ["/app/data", "/app/scripts"]

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:8080/health || exit 1

# Run the application
CMD ["python", "main.py"]
