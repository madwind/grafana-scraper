FROM node:26.9-trixie-slim

WORKDIR /app

ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright

COPY package.json package-lock.json ./

RUN npm ci && \
    npx playwright install --with-deps --only-shell chromium

COPY main.ts http-listener.ts version.ts ./

CMD ["npm", "start"]
