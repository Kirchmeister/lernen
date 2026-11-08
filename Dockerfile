FROM node:24-alpine
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts && mkdir /app/data && chown node:node /app/data
COPY --chown=node:node . .
USER node
ENV NODE_ENV=production HOST=0.0.0.0 PORT=3000 DATA_PATH=/app/data/lernreise.sqlite
EXPOSE 3000
CMD ["node", "server.mjs"]
