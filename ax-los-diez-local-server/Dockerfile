FROM node:24-bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends python3 && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package.json server.mjs app.js world-lab.js agent-chat.js reference-books.js index.html style.css black-theme.css ./
COPY lib ./lib
COPY vendor ./vendor
COPY assets ./assets
COPY scripts/backup-world-lab.py ./scripts/backup-world-lab.py
COPY scripts/restore-world-lab.py ./scripts/restore-world-lab.py
ENV NODE_ENV=production AX_REMOTE=1 PORT=10000 AX_WORLD_DATA_DIR=/var/data/ax/world-lab AX_PRIVATE_SETTINGS_DIR=/var/data/ax/private
EXPOSE 10000
CMD ["node", "server.mjs"]
