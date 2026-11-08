FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY nest-cli.json tsconfig*.json ./
COPY src ./src
RUN npm run build

EXPOSE 3000

CMD ["sh", "-c", "npm run migration:run:prod && npm run start:prod"]
