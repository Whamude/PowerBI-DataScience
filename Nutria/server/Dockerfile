FROM node:24-bookworm-slim
WORKDIR /app/server
COPY server/package*.json ./
RUN npm ci --omit=dev --ignore-scripts
COPY server/*.mjs ./
COPY src/auth/activation-config.json /app/src/auth/activation-config.json
RUN mkdir /data && chown node:node /data
USER node
ENV DATA_DIR=/data PORT=3000
EXPOSE 3000
CMD ["node", "index.mjs"]
