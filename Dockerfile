FROM node:26.8-trixie-slim

WORKDIR /app

COPY package.json package-lock.json ./

RUN npm ci && \
    npx playwright install --with-deps --only-shell chromium

COPY main.ts version.ts ./

CMD ["npm", "start"]