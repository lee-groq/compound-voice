# Stage 1: Build the Next.js app
FROM node:20 AS builder

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy package.json and pnpm-lock.yaml
COPY package.json pnpm-lock.yaml ./

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy the rest of the application code
COPY . .

# Accept build arguments for environment variables (required)
ARG NEXT_PUBLIC_LIVEKIT_URL

# Validate that the argument was provided
RUN test -n "$NEXT_PUBLIC_LIVEKIT_URL" || (echo "NEXT_PUBLIC_LIVEKIT_URL build argument is required" && false)

# Set environment variables for build
ENV NEXT_PUBLIC_LIVEKIT_URL=${NEXT_PUBLIC_LIVEKIT_URL}

# Build the Next.js app
RUN pnpm run build

# Stage 2: Production image
FROM node:20-slim

WORKDIR /app

# Set NODE_ENV to production
ENV NODE_ENV production

# Install pnpm
RUN npm install -g pnpm

# Copy necessary files from builder stage
COPY --from=builder /app/package.json ./
COPY --from=builder /app/pnpm-lock.yaml ./
COPY --from=builder /app/.next ./.next/
COPY --from=builder /app/public ./public/
COPY --from=builder /app/next.config.js ./
# If you have a custom server.js, copy that too
# COPY --from=builder /app/server.js ./

# Install production dependencies using pnpm
RUN pnpm install --prod --frozen-lockfile

# Expose port (Cloud Run will set $PORT)
# EXPOSE 3000 # Not strictly necessary as Cloud Run injects PORT

# Start the Next.js app in production mode
# The start script in package.json should handle `next start -p $PORT` or similar
CMD ["sh", "-c", "pnpm start"]
