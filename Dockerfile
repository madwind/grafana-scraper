FROM node:25.4.0-trixie-slim

WORKDIR /app

COPY package.json main.ts version.ts ./

RUN npm install && \
    npx playwright install --with-deps chromium

CMD ["npm", "start"]