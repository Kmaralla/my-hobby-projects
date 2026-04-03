# Development stage (for docker-compose)
FROM node:20-alpine

WORKDIR /app

# Copy package files first (for better caching)
COPY package*.json ./

# Install all dependencies (including dev dependencies for development)
# This installs Linux-compatible binaries inside the container
RUN npm ci

# Copy source code
COPY . .

# Create uploads directory
RUN mkdir -p uploads

# Expose port
EXPOSE 5000

# Default to development mode
ENV NODE_ENV=development

# Start in development mode (will be overridden by docker-compose command)
CMD ["npm", "run", "dev"]
