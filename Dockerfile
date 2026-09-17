FROM alpine:3.24.1 AS runtime-base
RUN apk upgrade --no-cache && apk add --no-cache libstdc++ ca-certificates && addgroup -g 1000 node && adduser -u 1000 -G node -D node
COPY --from=node:22.23.2-alpine@sha256:c610fcdfb1d5b4740dd70c284ed3cb16bb857e0f7166196e36a5501df7a3aa32 /usr/local/bin/node /usr/local/bin/node

FROM runtime-base AS build
WORKDIR /app
RUN apk add --no-cache python3 make g++
COPY --from=node:22.23.2-alpine@sha256:c610fcdfb1d5b4740dd70c284ed3cb16bb857e0f7166196e36a5501df7a3aa32 /usr/local/lib/node_modules/npm /usr/local/lib/node_modules/npm
RUN ln -s /usr/local/lib/node_modules/npm/bin/npm-cli.js /usr/local/bin/npm && ln -s /usr/local/lib/node_modules/npm/bin/npx-cli.js /usr/local/bin/npx
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run check && npm prune --omit=dev

FROM runtime-base
WORKDIR /app
COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/dist ./dist
COPY --from=build --chown=node:node /app/.local/server-build/server ./server
COPY --from=build --chown=node:node /app/.local/server-build/shared ./shared
COPY --from=build --chown=node:node /app/scripts/init-volume.mjs ./scripts/init-volume.mjs
COPY --from=build --chown=node:node /app/package.json ./package.json
ENV NODE_ENV=production HOST=0.0.0.0 PORT=3001 RESEARCH_TWIN_DATA_DIR=/data
USER node
EXPOSE 3001
CMD ["node", "server/index.js"]