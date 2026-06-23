from __future__ import annotations

import os
from typing import Any, Literal

import mlflow
from fastapi import FastAPI
from pydantic import BaseModel, Field

TRACKING_URI = os.environ.get("MLFLOW_TRACKING_URI", "http://mlflow:5001")
EXPERIMENT_NAME = os.environ.get("MLFLOW_EXPERIMENT_NAME", "ansu-playground-benchmark")
MLFLOW_UI_BASE_URL = os.environ.get("MLFLOW_UI_BASE_URL", "http://localhost:5001")

mlflow.set_tracking_uri(TRACKING_URI)
mlflow.set_experiment(EXPERIMENT_NAME)

app = FastAPI(title="AnSu MLflow Playground Bridge", version="0.1.0")


class TeacherConfig(BaseModel):
    niveauScolaire: str
    matiere: str
    notion: str
    posture: str
    interdits: list[str] = Field(default_factory=list)


class LlmConfig(BaseModel):
    gateway: str
    model: str


class TurnRequest(BaseModel):
    runtime: str
    observability: Literal["mlflow"] | str
    mode: str
    llm: LlmConfig
    sessionId: str
    userId: str
    message: str
    teacherConfig: TeacherConfig


class RuntimeOutput(BaseModel):
    answer: str
    raw: Any | None = None


class RuntimeScore(BaseModel):
    score: float
    reason: str | None = None
    passed: bool | None = None
    scorerVersion: str | None = None
    guardrails: dict[str, Any] | None = None


class RuntimeUsage(BaseModel):
    inputTokens: int | None = None
    outputTokens: int | None = None
    totalTokens: int | None = None
    cost: float | None = None
    impacts: dict[str, Any] | None = None
    raw: Any | None = None


class RuntimeResult(BaseModel):
    runtime: str
    mode: str
    runId: str
    provider: str
    model: str
    agentId: str | None = None
    agentVersion: str
    promptVersion: str
    output: RuntimeOutput
    score: RuntimeScore
    usage: RuntimeUsage | None = None
    memory: Any | None = None
    raw: Any | None = None


class PlaygroundTracePayload(BaseModel):
    request: TurnRequest
    runtime: RuntimeResult


@app.get("/health")
def health() -> dict[str, str]:
    return {"ok": "true", "service": "mlflow-playground-bridge"}


def update_trace_metadata(request: TurnRequest, runtime: RuntimeResult) -> None:
    mlflow.update_current_trace(
        metadata={
            "mlflow.trace.user": request.userId,
            "mlflow.trace.session": request.sessionId,
            "ansu.trace.schema": "ansu-playground-trace-v0.1.0",
            "ansu.runtime.requested": request.runtime,
            "ansu.runtime.effective": runtime.runtime,
            "ansu.runtime.mode": runtime.mode,
            "ansu.run_id": runtime.runId,
            "ansu.llm.requested_gateway": request.llm.gateway,
            "ansu.llm.requested_model": request.llm.model,
            "ansu.llm.provider": runtime.provider,
            "ansu.llm.model": runtime.model,
            "ansu.agent.id": runtime.agentId or "unknown",
            "ansu.agent.version": runtime.agentVersion,
            "ansu.prompt.version": runtime.promptVersion,
            "ansu.sequence.niveau_scolaire": request.teacherConfig.niveauScolaire,
            "ansu.sequence.matiere": request.teacherConfig.matiere,
            "ansu.sequence.notion": request.teacherConfig.notion,
            "ansu.score.name": "ansu_naivety",
            "ansu.score.value": runtime.score.score,
            "ansu.score.passed": runtime.score.passed,
        },
        tags={
            "ansu.domain": "agentique",
            "ansu.use_case": "agent-naif",
            "ansu.source": "playground",
            "ansu.observability": "mlflow",
            "ansu.runtime": request.runtime,
        },
    )


@mlflow.trace(name="moderation", span_type="GUARDRAIL")
def moderation_span(request: TurnRequest) -> dict[str, Any]:
    return {
        "allowed": True,
        "reason": "not evaluated in playground wrapper",
        "messageLength": len(request.message),
    }


@mlflow.trace(name="naive_agent_llm", span_type="LLM")
def llm_span(request: TurnRequest, runtime: RuntimeResult) -> dict[str, Any]:
    return {
        "input": [
            {"role": "system", "content": request.teacherConfig.posture},
            {"role": "user", "content": request.message},
        ],
        "output": runtime.output.answer,
        "provider": runtime.provider,
        "model": runtime.model,
        "usage": runtime.usage.model_dump(mode="json") if runtime.usage else None,
    }


@mlflow.trace(name="searchKnowledge", span_type="TOOL")
def tool_span(request: TurnRequest, runtime: RuntimeResult) -> dict[str, Any]:
    raw = runtime.output.raw if isinstance(runtime.output.raw, dict) else {}
    return {
        "input": {
            "notion": request.teacherConfig.notion,
            "query": f"{request.teacherConfig.notion} {request.teacherConfig.niveauScolaire}",
        },
        "output": raw.get("toolResults", []) if isinstance(raw, dict) else [],
    }


@mlflow.trace(name="guardrail_score", span_type="EVALUATOR")
def score_span(runtime: RuntimeResult) -> dict[str, Any]:
    return runtime.score.model_dump(mode="json")


@mlflow.trace(name="ansu.playground.agent_turn", span_type="AGENT")
def create_playground_trace(payload: PlaygroundTracePayload) -> dict[str, Any]:
    update_trace_metadata(payload.request, payload.runtime)
    moderation_span(payload.request)
    llm_span(payload.request, payload.runtime)
    tool_span(payload.request, payload.runtime)
    score_span(payload.runtime)
    return {
        "answer": payload.runtime.output.answer,
        "score": payload.runtime.score.model_dump(mode="json"),
        "runId": payload.runtime.runId,
        "runtime": payload.runtime.runtime,
    }


@app.post("/api/playground-trace")
def playground_trace(payload: PlaygroundTracePayload) -> dict[str, Any]:
    result = create_playground_trace(payload)
    trace_id = None
    get_current_trace = getattr(mlflow, "get_current_trace", None)
    if callable(get_current_trace):
        try:
            current_trace = get_current_trace()
            trace_id = getattr(current_trace, "info", current_trace).trace_id
        except Exception:
            trace_id = None

    return {
        "provider": "mlflow",
        "status": "sent",
        "traceId": trace_id or payload.runtime.runId,
        "url": MLFLOW_UI_BASE_URL,
        "raw": result,
    }
