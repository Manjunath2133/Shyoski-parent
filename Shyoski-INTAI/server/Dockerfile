# Use official Node.js light image
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy dependency definitions
COPY package*.json ./

# Install production dependencies
RUN npm ci --omit=dev

# Copy database & server source files
COPY database.js ./
COPY server.js ./

# Expose port (default in docker matches env or 5005)
EXPOSE 5005

# Set environment
ENV NODE_ENV=production

# Run start script
CMD ["node", "server.js"]
