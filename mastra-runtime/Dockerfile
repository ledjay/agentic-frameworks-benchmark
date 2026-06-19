FROM node:24-bookworm

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN mkdir -p data \
  && npm run build:next \
  && mkdir -p .next/standalone/.next \
  && cp -r .next/static .next/standalone/.next/static \
  && if [ -d public ]; then cp -r public .next/standalone/public; fi \
  && npm run build:mastra

ENV NODE_ENV=production \
    MASTRA_BASE_URL=http://localhost:4111 \
    NEXT_BASE_URL=http://localhost:3009 \
    MASTRA_STORAGE_URL=file:/app/data/mastra.db

EXPOSE 3009 4111

CMD ["npm", "run", "start:docker"]
