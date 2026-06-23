FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

COPY requirements.txt ./
RUN pip install --upgrade pip && pip install -r requirements.txt

COPY app.py eval_traces.py playground_bridge.py ./

EXPOSE 5001
CMD ["mlflow", "server", "--host", "0.0.0.0", "--port", "5001", "--allowed-hosts", "localhost,localhost:5001,127.0.0.1,127.0.0.1:5001,mlflow,mlflow:5001,host.docker.internal,host.docker.internal:5001", "--backend-store-uri", "sqlite:////mlflow/mlflow.db", "--default-artifact-root", "/mlflow/artifacts"]
