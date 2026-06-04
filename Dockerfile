# Stage 1: Build Stage
FROM node:20-alpine AS builder

RUN apk add --no-cache dumb-init

WORKDIR /usr/src/app

COPY package*.json ./

RUN npm install

COPY . .

RUN npm run build


# Stage 2: Production Stage
FROM node:20-alpine

ENV NODE_ENV=production

COPY --from=builder /usr/bin/dumb-init /usr/bin/dumb-init

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=builder /usr/src/app/build ./build

RUN chown -R node:node /usr/src/app

USER node

EXPOSE 4001

ENTRYPOINT ["dumb-init", "--"]

CMD ["node", "build/server.js"]
