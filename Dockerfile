FROM node:20-bullseye

WORKDIR /app

# Install OpenSSL (bullseye already supports 1.1 properly)
RUN apt-get update -y && apt-get install -y openssl

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies
RUN npm install

# Generate Prisma client
RUN npx prisma generate

# Copy source code
COPY . .

# Build TypeScript
RUN npm run build

# Remove dev dependencies
RUN npm prune --omit=dev

EXPOSE 5000

CMD ["npm", "start"]