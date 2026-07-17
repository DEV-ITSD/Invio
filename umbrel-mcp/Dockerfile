FROM golang:1.26.2-alpine AS tunnel-builder

ARG TUNNEL_CLIENT_VERSION=v0.0.10
RUN CGO_ENABLED=0 go install github.com/openai/tunnel-client/cmd/client@${TUNNEL_CLIENT_VERSION}

FROM node:24-alpine AS dependencies
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts

FROM node:24-alpine

RUN apk add --no-cache \
      bash \
      coreutils \
      curl \
      docker-cli \
      docker-cli-compose \
      gettext \
      jq \
      openssl \
      sqlite \
      tini \
    && rm -rf /var/cache/apk/*

COPY --from=mikefarah/yq:4 /usr/bin/yq /usr/local/bin/yq
COPY --from=tunnel-builder /go/bin/client /usr/local/bin/tunnel-client

WORKDIR /app
COPY --from=dependencies /app/node_modules ./node_modules
COPY package.json package-lock.json ./
COPY src ./src

ENV NODE_ENV=production \
    PORT=8765 \
    STATE_DIR=/state

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "src/server.mjs"]

