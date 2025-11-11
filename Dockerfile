# Build stage
FROM node:20-alpine AS build
WORKDIR /app

COPY package.json package-lock.json* pnpm-lock.yaml* yarn.lock* ./
RUN if [ -f package-lock.json ]; then npm ci; \
    elif [ -f yarn.lock ]; then npm install --frozen-lockfile; \
    elif [ -f pnpm-lock.yaml ]; then npm install -g pnpm && pnpm install --frozen-lockfile; \
    else npm install; fi

COPY . .
RUN npm run build

# Production stage
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY --from=build /app/package.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/.next ./next
COPY --from=build /app/public ./public
COPY --from=build /app/next.config.js ./

EXPOSE 3000
CMD ["node", "next", "start"]
