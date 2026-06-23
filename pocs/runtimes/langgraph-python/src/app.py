from __future__ import annotations

import json
import os
import re
import time
from typing import Annotated, Any, Literal, TypedDict

import langsmith as ls
from dotenv import load_dotenv
from fastapi import FastAPI
from langsmith import Client as LangSmithClient
from langchain.chat_models import init_chat_model
from langchain.tools import tool
from langchain_core.messages import AIMessage, BaseMessage, HumanMessage, SystemMessage, ToolMessage
from langgraph.checkpoint.memory import InMemorySaver
from langgraph.graph import END, START, StateGraph, add_messages
from pydantic import BaseModel, Field

load_dotenv()

AGENT_ID = "agent-naif-ansu-langgraph"
AGENT_VERSION = "langgraph-poc-v0.1.0"
PROMPT_VERSION = "naive-prompt-v0.1.0"
SCORER_VERSION = "naivety-contract-v0.1.0"

DEFAULT_TEACHER_CONFIG = {
    "niveauScolaire": "5e",
    "matiere": "SVT",
    "notion": "la photosynthèse",
    "posture": "agent naïf qui aide l’élève à verbaliser son raisonnement sans donner la réponse experte",
}

EXPECTED_NOTIONS = [
    {
        "id": "lumiere_role",
        "label": "La lumière joue un rôle important pour la plante",
    },
    {
        "id": "lumiere_pas_nourriture",
        "label": "La plante ne “mange” pas la lumière comme une nourriture",
    },
    {
        "id": "formulation_personnelle",
        "label": "L’élève arrive à reformuler avec ses propres mots",
    },
]

CANONICAL_GRAPH = ["moderate_input", "retrieve_context", "generate_answer", "score_naivety"]


def canonical_guardrail(message: str) -> dict[str, Any]:
    too_long = len(message) > 800
    asks_answer_directly = bool(re.search(r"donne.*réponse|réponse.*direct|corrige.*moi|la réponse|définition complète", message.lower()))
    return {
        "allowed": not too_long,
        "asksAnswerDirectly": asks_answer_directly,
        "tooLong": too_long,
        "reason": "message too long" if too_long else "ok",
    }


def canonical_knowledge(config: "TeacherConfig") -> list[dict[str, Any]]:
    return [
        {
            "id": "svt-photosynthese-lumiere-v0",
            "title": "Indice photosynthèse — rôle de la lumière",
            "excerpt": f"Pour {config.notion} en {config.niveauScolaire}, aide l’élève à distinguer la lumière d’une nourriture sans donner la définition complète.",
            "relevance": 0.86,
        }
    ]


def canonical_answer(message: str, config: "TeacherConfig") -> str:
    guardrail = canonical_guardrail(message)
    if guardrail["tooLong"]:
        return "Ton message est trop long pour l’atelier. Peux-tu le raccourcir en une ou deux phrases ?"
    if guardrail["asksAnswerDirectly"]:
        return "Je ne peux pas te donner la réponse. Qu’est-ce que tu crois déjà comprendre avec tes mots ?"
    if re.search(r"mange.*lumi[eè]re|lumi[eè]re.*mange", message.lower()):
        return "Quand tu dis que la plante “mange” la lumière, qu’est-ce que tu imagines exactement ?"
    return f"Tu parles de {config.notion} : qu’est-ce qui te fait penser ça, et comment tu pourrais le vérifier ?"


def canonical_usage(answer: str) -> dict[str, Any]:
    output_tokens = max(18, round(len(answer) / 4))
    return {
        "inputTokens": 126,
        "outputTokens": output_tokens,
        "totalTokens": 126 + output_tokens,
        "cost": 0.00111,
        "impacts": {"kWh": 0.00011, "kgCO2eq": 0.000041},
    }


def canonical_raw(message: str, config: "TeacherConfig") -> dict[str, Any]:
    return {
        "graph": CANONICAL_GRAPH,
        "guardrail": canonical_guardrail(message),
        "toolCalls": [{"name": "searchKnowledge", "args": {"notion": config.notion}}],
        "toolResults": canonical_knowledge(config),
    }

app = FastAPI(title="AnSu LangGraph Runtime POC")
checkpointer = InMemorySaver()


class LlmConfig(BaseModel):
    gateway: Literal["mock", "albert", "mistral", "openai-compatible"] = "mock"
    model: str = "deterministic-naive-agent"


class TeacherConfig(BaseModel):
    niveauScolaire: str = "5e"
    matiere: str = "SVT"
    notion: str = "la photosynthèse"
    posture: str = DEFAULT_TEACHER_CONFIG["posture"]


class AgentTurnRequest(BaseModel):
    mode: Literal["mock", "langgraph"] = "langgraph"
    llm: LlmConfig = Field(default_factory=LlmConfig)
    sessionId: str
    userId: str = "teacher-preview-demo"
    message: str
    teacherConfig: TeacherConfig = Field(default_factory=TeacherConfig)


class TranscriptMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str


class AssessmentRequest(BaseModel):
    mode: Literal["mock", "langgraph"] = "langgraph"
    sessionId: str
    userId: str = "teacher-preview-demo"
    transcript: list[TranscriptMessage]


class NotionAssessmentItem(BaseModel):
    id: str
    label: str
    understood: bool
    evidence: str | None


class NotionAssessment(BaseModel):
    notions: list[NotionAssessmentItem]
    readyForNextStep: bool
    summary: str
    method: str = Field(description="Méthode de génération du structured output : native ou fallback_json.")


class AgentState(TypedDict):
    messages: Annotated[list[BaseMessage], add_messages]
    ansu_usage: dict[str, Any] | None
    ansu_score: dict[str, Any] | None


def build_naive_instructions(config: TeacherConfig) -> str:
    return f"""Tu es l'agent naïf AnSu.

Contexte prof :
- Niveau : {config.niveauScolaire}
- Matière : {config.matiere}
- Notion : {config.notion}
- Posture : {config.posture}

Contrat impératif :
- ne jamais donner directement la définition complète
- ne pas produire une réponse experte prête à recopier
- poser une question de relance courte
- reformuler la confusion de l’élève avec bienveillance
- si tu utilises une ressource via tool, ne cite que les sources réellement fournies par le tool ; n’invente jamais d’URL

Tu dois répondre en français, en 1 à 3 phrases maximum.
Tu dois aider l'élève à préciser son idée, mais tu ne dois jamais donner l'explication experte complète.
Si l'élève demande directement la réponse, refuse brièvement puis pose une question de relance.
Retourne uniquement le texte de la réponse, sans JSON."""


@tool
def searchKnowledge(query: str, notion: str | None = None) -> dict[str, Any]:
    """Cherche une courte ressource pédagogique locale sur une notion scolaire.

    Args:
        query: recherche formulée par l'agent.
        notion: notion scolaire optionnelle.
    """
    return {
        "sources": [
            {
                "id": "svt-photosynthese-lumiere-v0",
                "title": "Indice photosynthèse — rôle de la lumière",
                "excerpt": f"Pour {notion or query}, aide l’élève à distinguer la lumière d’une nourriture sans donner la définition complète.",
            }
        ]
    }


tools = [searchKnowledge]
tools_by_name = {item.name: item for item in tools}


def provider_name() -> str:
    return "albert" if os.getenv("LANGGRAPH_PROVIDER", "albert") == "albert" else "mistral"


def model_id() -> str:
    if provider_name() == "albert":
        return os.getenv("ALBERT_MODEL", "albert-large")
    return os.getenv("MISTRAL_MODEL", "mistral-small-latest")


def build_model():
    if provider_name() == "albert":
        return init_chat_model(
            model_id(),
            model_provider="openai",
            temperature=0,
            api_key=os.getenv("ALBERT_API_KEY"),
            base_url=os.getenv("ALBERT_BASE_URL", "https://albert.api.etalab.gouv.fr/v1"),
        )

    return init_chat_model(
        model_id(),
        model_provider="mistralai",
        temperature=0,
        api_key=os.getenv("MISTRAL_API_KEY"),
    )


def llm_call(state: AgentState) -> dict[str, Any]:
    # System prompt is stored per request in the first user message's additional kwargs.
    last_human = next((m for m in reversed(state["messages"]) if isinstance(m, HumanMessage)), None)
    teacher_config = (last_human.additional_kwargs or {}).get("teacherConfig", DEFAULT_TEACHER_CONFIG) if last_human else DEFAULT_TEACHER_CONFIG
    config = TeacherConfig.model_validate(teacher_config)
    # Explicit `tool_choice="auto"` is required for Albert/OpenAI-compatible
    # to return real OpenAI-style tool_calls. Without it, Albert may emit a
    # textual `[TOOL_CALLS]...` marker that LangChain cannot execute.
    model = build_model().bind_tools(tools, tool_choice="auto")
    response = model.invoke([SystemMessage(content=build_naive_instructions(config))] + state["messages"])
    return {"messages": [response]}


def tool_node(state: AgentState) -> dict[str, Any]:
    result: list[ToolMessage] = []
    last_message = state["messages"][-1]
    for tool_call in getattr(last_message, "tool_calls", []) or []:
        selected_tool = tools_by_name[tool_call["name"]]
        observation = selected_tool.invoke(tool_call["args"])
        result.append(
            ToolMessage(
                content=json.dumps(observation, ensure_ascii=False),
                tool_call_id=tool_call["id"],
                name=tool_call["name"],
            )
        )
    return {"messages": result}


def should_continue(state: AgentState) -> Literal["tool_node", "score_node"]:
    last_message = state["messages"][-1]
    if getattr(last_message, "tool_calls", None):
        return "tool_node"
    return "score_node"


def score_node(state: AgentState) -> dict[str, Any]:
    last_ai = next((m for m in reversed(state["messages"]) if isinstance(m, AIMessage) and not m.tool_calls), None)
    last_human = next((m for m in reversed(state["messages"]) if isinstance(m, HumanMessage)), None)
    answer = str(last_ai.content if last_ai else "")
    user_input = str(last_human.content if last_human else "")
    usage = extract_usage(last_ai)
    score = score_naivety(user_input, answer)

    # Make Albert cost/impact visible in LangSmith even when they are not mapped
    # to LangSmith's standard total_cost fields.
    try:
        run_tree = ls.get_current_run_tree()
        if run_tree and usage:
            # LangSmith-native cost mapping: this should feed the Cost column.
            # Albert currently returns cost=0.0 for these tests, so the column
            # may show 0/empty, but the value is provided using LangSmith's
            # documented usage_metadata.total_cost field.
            native_usage_metadata = {
                "input_tokens": usage.get("inputTokens"),
                "output_tokens": usage.get("outputTokens"),
                "total_tokens": usage.get("totalTokens"),
                "total_cost": usage.get("cost"),
            }
            run_tree.set(usage_metadata={k: v for k, v in native_usage_metadata.items() if v is not None})

            run_tree.metadata["ansuUsageCost"] = usage.get("cost")
            run_tree.metadata["ansuImpactKWh"] = (usage.get("impacts") or {}).get("kWh")
            run_tree.metadata["ansuImpactKgCO2eq"] = (usage.get("impacts") or {}).get("kgCO2eq")
            run_tree.metadata["ansuInputTokens"] = usage.get("inputTokens")
            run_tree.metadata["ansuOutputTokens"] = usage.get("outputTokens")
            run_tree.metadata["ansuTotalTokens"] = usage.get("totalTokens")
            run_tree.metadata["ansuScore"] = score.get("score")
            run_tree.metadata["ansuScorerVersion"] = score.get("scorerVersion")

            # LangSmith-native score/feedback attached to the trace root so it
            # appears in the Feedback section and can be filtered/aggregated.
            LangSmithClient().create_feedback(
                key="ansu_naivety",
                score=score.get("score"),
                trace_id=run_tree.trace_id,
                comment=score.get("reason"),
                source_info={
                    "scorerVersion": score.get("scorerVersion"),
                    "directAnswerRefusal": (score.get("guardrails") or {}).get("directAnswerRefusal"),
                    "expertAnswerRisk": (score.get("guardrails") or {}).get("expertAnswerRisk"),
                    "repairApplied": (score.get("guardrails") or {}).get("repairApplied"),
                },
            )
    except Exception:
        # Tracing should never break the runtime POC.
        pass

    return {"ansu_usage": usage, "ansu_score": score}


builder = StateGraph(AgentState)
builder.add_node("llm_call", llm_call)
builder.add_node("tool_node", tool_node)
builder.add_node("score_node", score_node)
builder.add_edge(START, "llm_call")
builder.add_conditional_edges("llm_call", should_continue, ["tool_node", "score_node"])
builder.add_edge("tool_node", "llm_call")
builder.add_edge("score_node", END)
graph = builder.compile(checkpointer=checkpointer)


def score_naivety(user_input: str, answer: str) -> dict[str, Any]:
    lower = answer.lower()
    direct_answer_risk = any(
        term in lower
        for term in [
            "la photosynthèse est",
            "définition",
            "dioxyde de carbone",
            "glucose",
            "chlorophylle",
        ]
    )
    has_question = "?" in answer
    direct_answer_request = bool(re.search(r"donne|réponse|directement", user_input.lower()))
    refused_direct = not direct_answer_request or any(term in lower for term in ["je ne peux pas te donner la réponse", "je ne vais pas", "pas directement", "plutôt"])
    score = 1.0 if has_question and not direct_answer_risk and refused_direct else 0.4
    return {
        "score": score,
        "reason": "Contrat naïf respecté : pas de réponse experte, relance présente." if score >= 0.85 else "Contrat naïf à surveiller.",
        "guardrails": {
            "directAnswerRefusal": refused_direct,
            "expertAnswerRisk": direct_answer_risk,
            "repairApplied": False,
            "asksAnswerDirectly": direct_answer_request,
        },
        "scorerVersion": SCORER_VERSION,
    }


def serialize_message(message: BaseMessage) -> dict[str, Any]:
    payload = {
        "type": message.type,
        "content": message.content,
        "id": getattr(message, "id", None),
    }
    if isinstance(message, AIMessage):
        payload["tool_calls"] = message.tool_calls
        payload["usage_metadata"] = message.usage_metadata
        payload["response_metadata"] = message.response_metadata
    if isinstance(message, ToolMessage):
        payload["name"] = message.name
        payload["tool_call_id"] = message.tool_call_id
    return payload


def extract_usage(message: BaseMessage | None) -> dict[str, Any] | None:
    if not isinstance(message, AIMessage):
        return None
    usage_metadata = message.usage_metadata or {}
    provider_usage = (message.response_metadata or {}).get("token_usage") or {}
    raw_usage = usage_metadata or provider_usage
    if not raw_usage:
        return None
    if "input_tokens" in raw_usage or "output_tokens" in raw_usage:
        return {
            "inputTokens": raw_usage.get("input_tokens"),
            "outputTokens": raw_usage.get("output_tokens"),
            "totalTokens": raw_usage.get("total_tokens"),
            "cost": provider_usage.get("cost"),
            "impacts": provider_usage.get("impacts"),
            "carbon": provider_usage.get("carbon"),
            "raw": {"usageMetadata": usage_metadata, "providerUsage": provider_usage},
        }
    return {
        "inputTokens": raw_usage.get("prompt_tokens"),
        "outputTokens": raw_usage.get("completion_tokens"),
        "totalTokens": raw_usage.get("total_tokens"),
        "cost": raw_usage.get("cost"),
        "impacts": raw_usage.get("impacts"),
        "raw": raw_usage,
    }


def collect_tool_events(messages: list[BaseMessage]) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    calls: list[dict[str, Any]] = []
    results: list[dict[str, Any]] = []
    for message in messages:
        if isinstance(message, AIMessage):
            for call in message.tool_calls or []:
                calls.append(call)
        if isinstance(message, ToolMessage):
            try:
                content = json.loads(str(message.content))
            except json.JSONDecodeError:
                content = message.content
            results.append({"name": message.name, "tool_call_id": message.tool_call_id, "result": content})
    return calls, results


def thread_key(user_id: str, session_id: str) -> str:
    return f"{user_id}:{session_id}"


@app.get("/health")
def health() -> dict[str, Any]:
    langsmith_enabled = os.getenv("LANGSMITH_TRACING", "false").lower() == "true"
    return {
        "ok": True,
        "runtime": "langgraph",
        "provider": provider_name(),
        "model": model_id(),
        "langsmith": {
            "tracing": langsmith_enabled,
            "apiKeyPresent": bool(os.getenv("LANGSMITH_API_KEY")),
            "project": os.getenv("LANGSMITH_PROJECT", "ansu-langgraph-runtime-dev"),
            "note": "LangSmith est utilisé uniquement en debug dev pour ce POC.",
        },
    }


@app.post("/api/agent")
def agent_turn(turn: AgentTurnRequest) -> dict[str, Any]:
    run_id = f"{turn.sessionId}:{int(time.time() * 1000)}"
    if turn.mode == "mock":
        answer = canonical_answer(turn.message, turn.teacherConfig)
        return {
            "mode": turn.mode,
            "runtime": "langgraph-python",
            "runId": run_id,
            "input": turn.model_dump(),
            "memory": {"thread": thread_key(turn.userId, turn.sessionId), "resource": turn.userId},
            "provider": turn.llm.gateway,
            "model": turn.llm.model,
            "agentId": AGENT_ID,
            "agentVersion": AGENT_VERSION,
            "promptVersion": PROMPT_VERSION,
            "usage": canonical_usage(answer),
            "output": {"answer": answer, "raw": canonical_raw(turn.message, turn.teacherConfig)},
            "score": score_naivety(turn.message, answer),
        }

    config = {
        "configurable": {"thread_id": thread_key(turn.userId, turn.sessionId)},
        "metadata": {
            "sessionId": turn.sessionId,
            "userId": turn.userId,
            "agentId": AGENT_ID,
            "agentVersion": AGENT_VERSION,
            "promptVersion": PROMPT_VERSION,
            "provider": provider_name(),
            "model": model_id(),
            "requestedLlmGateway": turn.llm.gateway,
            "requestedModel": turn.llm.model,
            # LangSmith-recognized fields for cost mapping / filtering.
            # The ChatOpenAI child run may still expose ls_provider="openai"
            # because Albert is called through an OpenAI-compatible adapter.
            "ls_provider": provider_name(),
            "ls_model_name": model_id(),
        },
        "run_name": "ansu.langgraph.agent_turn",
    }
    input_message = HumanMessage(
        content=turn.message,
        additional_kwargs={"teacherConfig": turn.teacherConfig.model_dump()},
    )
    result = graph.invoke({"messages": [input_message]}, config)
    messages: list[BaseMessage] = result["messages"]
    last_ai = next((m for m in reversed(messages) if isinstance(m, AIMessage) and not m.tool_calls), None)
    answer = str(last_ai.content if last_ai else messages[-1].content)
    tool_calls, tool_results = collect_tool_events(messages)
    usage = result.get("ansu_usage") or extract_usage(last_ai)
    score = result.get("ansu_score") or score_naivety(turn.message, answer)

    return {
        "mode": turn.mode,
        "runtime": "langgraph",
        "runId": run_id,
        "input": turn.model_dump(),
        "memory": {"thread": thread_key(turn.userId, turn.sessionId), "resource": turn.userId},
        "provider": provider_name(),
        "model": model_id(),
        "agentId": AGENT_ID,
        "agentVersion": AGENT_VERSION,
        "promptVersion": PROMPT_VERSION,
        "usage": usage,
        "output": {
            "answer": answer,
            "raw": {
                "messages": [serialize_message(m) for m in messages],
                "toolCalls": tool_calls,
                "toolResults": tool_results,
            },
        },
        "score": score,
    }


def deterministic_assessment(transcript: list[TranscriptMessage]) -> NotionAssessment:
    text = " ".join(item.content.lower() for item in transcript)
    notions = [
        NotionAssessmentItem(
            id="lumiere_role",
            label="La lumière joue un rôle important pour la plante",
            understood="lumière" in text and any(word in text for word in ["pousser", "grandir", "aide"]),
            evidence="Mention de la lumière qui aide à pousser/grandir." if "lumière" in text else None,
        ),
        NotionAssessmentItem(
            id="lumiere_pas_nourriture",
            label="La plante ne “mange” pas la lumière comme une nourriture",
            understood="mange pas" in text or "pas une nourriture" in text,
            evidence="Distinction explicite entre lumière et nourriture." if ("mange pas" in text or "pas une nourriture" in text) else None,
        ),
        NotionAssessmentItem(
            id="formulation_personnelle",
            label="L’élève arrive à reformuler avec ses propres mots",
            understood="avec mes mots" in text,
            evidence="L’élève reformule explicitement avec ses mots." if "avec mes mots" in text else None,
        ),
    ]
    return NotionAssessment(
        notions=notions,
        readyForNextStep=all(item.understood for item in notions),
        summary="Checklist déterministe POC.",
        method="deterministic",
    )


def transcript_to_text(transcript: list[TranscriptMessage]) -> str:
    return "\n".join(f"{item.role}: {item.content}" for item in transcript)


def assess_with_structured_output(transcript: list[TranscriptMessage]) -> tuple[NotionAssessment, dict[str, Any]]:
    """Use LangChain native structured output first.

    LangChain maps Pydantic schemas to the provider's structured-output/tool
    calling support where possible. This is the most native option to test for
    A7 before considering manual JSON parsing.
    """
    model = build_model()
    structured_model = model.with_structured_output(NotionAssessment)
    prompt = [
        SystemMessage(
            content=(
                "Tu es un évaluateur pédagogique AnSu. Analyse le transcript élève/agent. "
                "Tu dois remplir strictement le schéma demandé. "
                "Évalue uniquement les preuves présentes dans le transcript. "
                "Ne considère pas qu'une notion est comprise sans preuve textuelle. "
                "La méthode doit valoir 'native'."
            )
        ),
        HumanMessage(
            content=(
                "Notions à évaluer :\n"
                + "\n".join(f"- {item['id']}: {item['label']}" for item in EXPECTED_NOTIONS)
                + "\n\nTranscript :\n"
                + transcript_to_text(transcript)
            )
        ),
    ]
    assessment = structured_model.invoke(
        prompt,
        config={
            "run_name": "ansu.langgraph.structured_assessment",
            "metadata": {
                "agentId": AGENT_ID,
                "agentVersion": AGENT_VERSION,
                "promptVersion": PROMPT_VERSION,
                "provider": provider_name(),
                "model": model_id(),
                "ls_provider": provider_name(),
                "ls_model_name": model_id(),
                "structuredOutputSchema": "NotionAssessment",
                "structuredOutputMethod": "native",
            },
        },
    )
    if isinstance(assessment, dict):
        parsed = NotionAssessment.model_validate(assessment)
    else:
        parsed = assessment
    if parsed.method != "native":
        parsed.method = "native"
    return parsed, {"method": "native", "schema": "NotionAssessment"}


@app.post("/api/agent/assess")
def assess(request: AssessmentRequest) -> dict[str, Any]:
    details: dict[str, Any]
    if request.mode == "mock":
        assessment = deterministic_assessment(request.transcript)
        details = {"method": "deterministic", "schema": "NotionAssessment"}
    else:
        try:
            assessment, details = assess_with_structured_output(request.transcript)
        except Exception as exc:
            # Keep the endpoint usable while exposing native structured-output
            # failures in the response; this fallback is not counted as native
            # validation for A7.
            assessment = deterministic_assessment(request.transcript)
            assessment.method = "fallback_after_native_error"
            details = {
                "method": "fallback_after_native_error",
                "schema": "NotionAssessment",
                "nativeError": str(exc),
            }
    return {
        "mode": request.mode,
        "runtime": "langgraph" if request.mode == "langgraph" else "mock",
        "runId": f"{request.sessionId}:assessment:{int(time.time() * 1000)}",
        "assessment": assessment.model_dump(),
        "schemaValidated": True,
        "details": details,
        "note": "Structured output via LangChain with_structured_output quand method=native.",
    }
