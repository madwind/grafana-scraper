FROM node:25.3.0-trixie-slim

WORKDIR /app

COPY package.json main.ts version.ts ./

RUN npm install && \
    npx playwright install --with-deps firefox

CMD ["npm", "start"]