FROM node:22.19.0-slim
RUN apt-get update -y && apt-get install -y openssl
WORKDIR /app

COPY package*.json ./
RUN npm install

COPY prisma ./prisma
COPY prisma.config.ts ./
RUN npx prisma generate

COPY . .

EXPOSE 5000
CMD ["sh", "-c", "npx prisma migrate deploy && npm run start:prod"]
