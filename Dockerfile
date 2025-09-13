FROM node:20-bullseye

# Install ffmpeg
RUN apt-get update && \
    apt-get install -y ffmpeg && \
    rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
COPY .env .env
RUN npm install

# Copy the rest of the application code
COPY . .

# Expose port (default NestJS port)
EXPOSE 3000

# Start the application
CMD ["npm", "run", "start:prod"]