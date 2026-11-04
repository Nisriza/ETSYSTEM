# ETS Rider Predict System - Node API + Python ML runtime
#
# Vercel hosts only the built SPA. This image runs the Express API, the
# predictor (`child_process` -> ml/predict.py) and retraining (ml/train.py), so
# it needs Node *and* Python. It works on Render, Railway, Fly.io and any other
# Docker host.
#
#   docker build -t etsystem-api .
#   docker run -p 10000:10000 --env-file .env etsystem-api
#
# then open http://localhost:10000/api/health

FROM node:20-bookworm-slim

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1

# Debian ships python3 without a bare `python` command, but src/lib/predictor.ts
# invokes `python`. A venv gives us both `python` and an isolated site-packages.
RUN apt-get update \
 && apt-get install -y --no-install-recommends python3 python3-venv ca-certificates \
 && rm -rf /var/lib/apt/lists/* \
 && python3 -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Python deps first: they change less often than the app code.
COPY ml/requirements.txt /tmp/ml-requirements.txt
RUN pip install --upgrade pip && pip install -r /tmp/ml-requirements.txt

WORKDIR /app

# Install Node deps before copying the source so edits do not reinstall them.
# NODE_ENV stays unset here on purpose: the build needs devDependencies
# (vite, esbuild, typescript).
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund || npm install --no-audit --no-fund

COPY . .

# Builds the SPA into dist/ *and* bundles server.ts into dist/server.cjs.
RUN npm run build

# Runtime: `npm start` must serve dist/ instead of the Vite dev middleware.
ENV NODE_ENV=production \
    PORT=10000
EXPOSE 10000

CMD ["npm", "start"]
