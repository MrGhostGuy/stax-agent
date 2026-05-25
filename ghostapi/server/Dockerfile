FROM node:22-alpine

WORKDIR /app

# Install build tools for native modules
RUN apk add --no-cache python3 make g++

COPY package.json package-lock.json ./
RUN npm ci --only=production

COPY index.js ./

# Create data directory for SQLite
RUN mkdir -p /app/data

ENV GHOSTAPI_PORT=3000
ENV NODE_ENV=production

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget -qO- http://localhost:3000/health || exit 1

CMD ["node", "index.js"]
