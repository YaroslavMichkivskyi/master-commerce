# One image for the whole visual-test stack (specs/036-web-design R-8): the official
# Playwright image (Chromium and its fonts, so every machine renders the same pixels) with
# the repo installed and built for Linux inside. The same image runs catalog-service, the
# gateway, the shop, the seed and the tests (e2e/compose.yaml); the host needs Docker only.
FROM mcr.microsoft.com/playwright:v1.65.1-noble

RUN npm install --global pnpm@10.15.0
WORKDIR /repo

# Packages first, from the lockfile alone, so a code change does not download them again.
COPY pnpm-lock.yaml pnpm-workspace.yaml ./
RUN --mount=type=cache,id=pnpm-store,target=/root/.local/share/pnpm/store \
    pnpm fetch --frozen-lockfile

COPY . .
RUN --mount=type=cache,id=pnpm-store,target=/root/.local/share/pnpm/store \
    pnpm install --offline --frozen-lockfile

RUN pnpm turbo run build \
    --filter=catalog-service --filter=api-gateway --filter=web --filter=datagen
