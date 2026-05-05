FROM node:20-slim

# Install dependencies for Puppeteer
RUN apt-get update && apt-get install -y \
    chromium \
    fonts-ipafont-gothic fonts-wqy-zenhei fonts-thai-tlwg fonts-kacst fonts-freefont-ttf \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

# Set up environment variables
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

# Add user for Hugging Face Spaces compatibility
# The node image already has a user with UID 1000 named 'node'
WORKDIR /app

# Change ownership of /app to node user
RUN chown node:node /app

# Switch to node user
USER node

# Copy package files
COPY --chown=node:node package*.json ./

# Install dependencies (including devDependencies for tsx and build)
RUN npm install

# Copy application files
COPY --chown=node:node . .

# Build Vite app
RUN npm run build

# Expose port (Hugging Face Spaces connects to the first EXPOSE port)
EXPOSE 3000

# Start the server using tsx
CMD ["npx", "tsx", "server.ts"]
