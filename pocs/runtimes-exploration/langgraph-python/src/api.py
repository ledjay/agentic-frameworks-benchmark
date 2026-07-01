from pathlib import Path
from typing import Any

from dotenv import find_dotenv, load_dotenv
from fastapi import FastAPI
from langchain.messages import HumanMessage
from langfuse import get_client
from langfuse.langchain import CallbackHandler
from pydantic import BaseModel, Field

from src.a2_naive_agent import AGENT_ID, AGENT_VERSION, PROMPT_VERSION, agent

# Load the POC-local .env first (Langfuse local keys), then the repo root .env
# without overriding already-loaded values (MISTRAL_API_KEY lives at repo root).
load_dotenv(find_dotenv(usecwd=True))
load_dotenv(Path(__file__).resolve().parents[4] / ".env", override=False)

app = FastAPI(
    title="AnSu LangGraph Python Runtime",
    version="0.1.0",
    description="Minimal FastAPI facade exposing a LangGraph OSS runtime behind an AnSu API contract.",
)


class AgentTurnRequest(BaseModel):
    """AnSu-facing request contract for one agent turn."""

    message: str = Field(..., min_length=1)
    userId: str = Field(default="benchmark-user")
    sessionId: str = Field(default="benchmark-session")


class ObservabilityInfo(BaseModel):
    provider: str
    message: str
    traceId: str | None = None


class AgentTurnResponse(BaseModel):
    """AnSu-facing response contract, independent from LangGraph internals."""

    answer: str
    runtime: str
    agentId: str
    agentVersion: str
    promptVersion: str
    llmCalls: int
    observability: ObservabilityInfo
    debug: dict[str, Any] = Field(default_factory=dict)


@app.get("/health")
def health() -> dict[str, str]:
    return {
        "status": "ok",
        "runtime": "langgraph-python",
        "agentId": AGENT_ID,
    }


@app.post("/api/agent/turn", response_model=AgentTurnResponse)
def agent_turn(request: AgentTurnRequest) -> AgentTurnResponse:
    """Run one LangGraph turn behind the stable AnSu API facade."""

    langfuse = get_client()
    langfuse_handler = CallbackHandler()

    result = agent.invoke(
        {
            "messages": [HumanMessage(content=request.message)],
            "llm_calls": 0,
        },
        config={
            "callbacks": [langfuse_handler],
            "run_name": "ansu.langgraph.agent_turn",
            "metadata": {
                "runtime": "langgraph-python",
                "agentId": AGENT_ID,
                "agentVersion": AGENT_VERSION,
                "promptVersion": PROMPT_VERSION,
                "langfuse_user_id": request.userId,
                "langfuse_session_id": request.sessionId,
                "langfuse_tags": [
                    "ansu",
                    "runtime:langgraph-python",
                    "fastapi-facade",
                ],
            },
        },
    )

    langfuse.flush()

    answer_message = result["messages"][-1]
    answer = getattr(answer_message, "content", str(answer_message))
    trace_id = getattr(langfuse_handler, "last_trace_id", None)

    return AgentTurnResponse(
        answer=answer,
        runtime="langgraph-python",
        agentId=AGENT_ID,
        agentVersion=AGENT_VERSION,
        promptVersion=PROMPT_VERSION,
        llmCalls=result["llm_calls"],
        observability=ObservabilityInfo(
            provider="langfuse",
            traceId=trace_id,
            message="Langfuse CallbackHandler passed to LangGraph invocation.",
        ),
        debug={
            "rawMessagesCount": len(result["messages"]),
        },
    )
