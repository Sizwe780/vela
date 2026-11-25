FROM node:22-alpine AS base
WORKDIR /app

FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
ENV DATABASE_URL="postgresql://lms:lms@localhost:5432/lms?schema=public"
ENV DATABASE_URL_UNPOOLED="postgresql://lms:lms@localhost:5432/lms?schema=public"
ENV NEXT_PUBLIC_SITE_URL="https://velastudy.app"
ENV POLICIES_APPROVED="false"
ENV EMAIL_MODE="disabled"

RUN npm run build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/generated ./generated
COPY --from=builder --chown=nextjs:nodejs /app/.vela/specs ./.vela/specs
COPY --from=builder --chown=nextjs:nodejs /app/content ./content

USER nextjs
EXPOSE 3000

CMD ["node", "server.js"]
