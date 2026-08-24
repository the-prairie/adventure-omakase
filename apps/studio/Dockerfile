FROM node:24.19.0-bookworm-slim AS base
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN npm install --global pnpm@11.22.0
WORKDIR /workspace

FROM base AS build
COPY . .
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store pnpm install --frozen-lockfile
RUN pnpm --filter @adventure-omakase/studio... build

FROM node:24.19.0-bookworm-slim AS runner
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
WORKDIR /app
RUN groupadd --system --gid 1001 app && useradd --system --uid 1001 --gid app app
COPY --from=build --chown=app:app /workspace/apps/studio/.next/standalone ./
COPY --from=build --chown=app:app /workspace/apps/studio/.next/static ./apps/studio/.next/static
USER app
EXPOSE 3000
CMD ["node", "apps/studio/server.js"]
