FROM node:20-alpine

WORKDIR /app

# Dipendenze server
COPY package*.json ./
RUN npm install --omit=dev

# Dipendenze client + build
COPY client/package*.json ./client/
RUN npm install --prefix client

COPY client/ ./client/
RUN npm run build --prefix client

# Server
COPY server/ ./server/

RUN mkdir -p /app/data

ENV NODE_ENV=production
ENV PORT=3002

EXPOSE 3002

CMD ["node", "server/index.js"]
