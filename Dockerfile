FROM node:22-slim

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY prisma ./prisma
RUN npx prisma generate

COPY tsconfig.json ./
COPY auth ./auth
COPY events ./events
COPY ledger ./ledger
COPY payments ./payments
COPY reconciliation ./reconciliation
COPY index.ts ./

RUN npm run build

ENV NODE_ENV=production
EXPOSE 3000

CMD ["node", "dist/index.js"]
