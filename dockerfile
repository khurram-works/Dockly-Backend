FROM node:22.19.0-slim
WORKDIR /app

COPY package*.json ./
RUN npm install

COPY prisma ./prisma
COPY prisma.config.ts ./
RUN npx prisma generate

COPY . .

EXPOSE 5000
CMD ["npm", "run", "start:prod"]
