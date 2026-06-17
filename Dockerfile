FROM node:22-bookworm-slim AS app

WORKDIR /app

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/core/package.json packages/core/package.json
COPY packages/adapters/package.json packages/adapters/package.json
COPY packages/sdk/package.json packages/sdk/package.json
COPY packages/react/package.json packages/react/package.json
COPY packages/widget/package.json packages/widget/package.json
COPY packages/contracts/package.json packages/contracts/package.json
COPY services/api/package.json services/api/package.json
COPY apps/pos-verifier/package.json apps/pos-verifier/package.json

RUN pnpm install --frozen-lockfile

COPY . .

RUN pnpm --filter @redeemloop/core build \
  && pnpm --filter @redeemloop/adapters build \
  && pnpm --filter @redeemloop/sdk build \
  && pnpm --filter @redeemloop/react build \
  && pnpm --filter @redeemloop/widget build \
  && pnpm --filter @redeemloop/api build \
  && pnpm --filter @redeemloop/pos-verifier build

ENV NODE_ENV=production

EXPOSE 8787 3000

CMD ["pnpm", "--filter", "@redeemloop/api", "start"]
