FROM node:24.19.0-bookworm-slim AS base
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN npm install --global pnpm@11.22.0
WORKDIR /workspace

FROM base AS build
COPY . .
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store pnpm install --frozen-lockfile
RUN pnpm --filter @adventure-omakase/api... build
RUN pnpm --filter @adventure-omakase/api deploy --prod /output

FROM node:24.19.0-bookworm-slim AS runner
ENV NODE_ENV=production
ENV API_HOST=0.0.0.0
ENV API_PORT=4000
WORKDIR /app
RUN groupadd --system --gid 1001 app && useradd --system --uid 1001 --gid app app
COPY --from=build --chown=app:app /output ./
USER app
EXPOSE 4000
CMD ["node", "dist/server.js"]
