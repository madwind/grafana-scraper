FROM node:25.6.0-trixie-slim

WORKDIR /app

COPY package.json main.ts version.ts ./

RUN npm install && \
    npx playwright install --with-deps --only-shell chromium

CMD ["npm", "start"]