FROM node:25-trixie
ARG PLAYWRIGHT_VERSION
WORKDIR /app

RUN npx -y playwright@${PLAYWRIGHT_VERSION} install --with-deps firefox && \
    npm install -g tsx

COPY main.ts .

CMD ["tsx", "main.ts"]
