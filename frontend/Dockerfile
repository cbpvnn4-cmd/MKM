# Development Dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies (skip large test browser downloads)
ENV CYPRESS_INSTALL_BINARY=0
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
RUN npm ci

# Copy project files
COPY . .

# Expose port
EXPOSE 3000

# Run the app in development mode with hot reload
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
