FROM node:24-bookworm AS deps
WORKDIR /app
RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 python3-venv \
  && rm -rf /var/lib/apt/lists/*
COPY requirements.txt /tmp/requirements.txt
RUN python3 -m venv /opt/venv \
  && /opt/venv/bin/pip install --upgrade pip \
  && /opt/venv/bin/pip install -r /tmp/requirements.txt
COPY dashboard-next/package.json dashboard-next/package-lock.json ./
RUN npm ci

FROM node:24-bookworm AS builder
WORKDIR /app
COPY --from=deps /opt/venv /opt/venv
COPY --from=deps /app/node_modules ./node_modules
COPY dashboard-next ./
RUN npm run build

FROM node:24-bookworm AS runner
WORKDIR /app
ENV NODE_ENV=production \
    PORT=3008 \
    MLFLOW_PYTHON=/opt/venv/bin/python
COPY --from=deps /opt/venv /opt/venv
COPY --from=builder /app ./
EXPOSE 3008
CMD ["npm", "run", "start"]
