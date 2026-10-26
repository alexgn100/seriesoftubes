# The cloud sync server (server/sync.js). docker-compose.yml runs it next to the game;
# accounts and saves live in the /data volume.
FROM node:24-alpine
WORKDIR /app
COPY server/sync.js .
RUN mkdir /data && chown node:node /data
USER node
ENV PORT=8081 DATA_DIR=/data
VOLUME /data
EXPOSE 8081
CMD ["node", "sync.js"]
