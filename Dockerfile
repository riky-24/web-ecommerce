FROM node:18-alpine AS base
WORKDIR /usr/src/app
COPY package*.json ./

RUN npm ci --only=production || npm install --production

COPY . .

RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser
ENV NODE_ENV=production
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s CMD wget -qO- http://localhost:3000/health || exit 1

CMD ["node", "src/index.js"]
