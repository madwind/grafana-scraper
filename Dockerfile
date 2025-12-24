FROM node:25.2.1-trixie-slim

WORKDIR /app

COPY package.json main.ts version.js ./

RUN npm install && \
    npx playwright install --with-deps firefox

CMD ["npm", "start"]