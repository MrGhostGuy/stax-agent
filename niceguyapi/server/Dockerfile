FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --only=production

COPY . .

# Create data directory for SQLite
RUN mkdir -p /app/data

ENV NICEGUYAPI_PORT=3000
ENV NODE_ENV=production

EXPOSE 3000

CMD ["node", "index.js"]
