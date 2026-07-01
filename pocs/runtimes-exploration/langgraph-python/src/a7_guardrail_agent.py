import operator
import os
import re
from pathlib import Path

from dotenv import find_dotenv, load_dotenv
from langchain.messages import AIMessage, AnyMessage, HumanMessage
from langchain_core.runnables import RunnableConfig
from langgraph.graph import END, START, StateGraph
from langfuse import get_client
from langfuse.langchain import CallbackHandler
from typing_extensions import Annotated, Literal, NotRequired, TypedDict

# On charge d'abord le `.env` local du POC LangGraph.
load_dotenv(find_dotenv(usecwd=True))

# On charge aussi le `.env` racine du benchmark, sans écraser le local.
load_dotenv(Path(__file__).resolve().parents[4] / ".env", override=False)

# Pour ce POC, les traces attendues passent par Langfuse.
# On désactive LangSmith pour éviter un envoi parasite si le `.env` local
# contient `LANGSMITH_TRACING=true` pour LangGraph Studio.
os.environ["LANGSMITH_TRACING"] = "false"

AGENT_ID = "a7-guardrail-agent"
AGENT_VERSION = "1.0.0"
PROMPT_VERSION = "1.0.0"
USER_ID = "benchmark-user"
SESSION_ID = "a7-langgraph-guardrail-session"

EMAIL_RE = re.compile(r"\b[\w.+-]+@[\w-]+(?:\.[\w-]+)+\b")
PHONE_RE = re.compile(r"(?:(?:\+33|0)\s?)[1-9](?:[\s.-]?\d{2}){4}")

ModerationDecision = Literal["allow", "block"]


class GuardrailAgentState(TypedDict):
    messages: Annotated[list[AnyMessage], operator.add]

    sanitized_input: NotRequired[str]
    pii_redacted: NotRequired[bool]
    moderation_decision: NotRequired[ModerationDecision]
    block_reason: NotRequired[str]

    draft_answer: NotRequired[str]
    score: NotRequired[float]
    score_reasons: NotRequired[list[str]]
    should_repair: NotRequired[bool]
    final_answer: NotRequired[str]
    repair_applied: NotRequired[bool]

    debug_steps: NotRequired[Annotated[list[str], operator.add]]


def langfuse_graph_config() -> RunnableConfig:
    return {
        "callbacks": [CallbackHandler()],
        "run_name": "ansu.langgraph.a7_guardrail_agent",
        "metadata": {
            "runtime": "langgraph-python",
            "agentId": AGENT_ID,
            "agentVersion": AGENT_VERSION,
            "promptVersion": PROMPT_VERSION,
            "langfuse_user_id": USER_ID,
            "langfuse_session_id": SESSION_ID,
            "langfuse_tags": [
                "ansu",
                "runtime:langgraph-python",
                "a7-guardrails",
                "studio-compatible",
            ],
        },
    }


def latest_user_text(state: GuardrailAgentState) -> str:
    for message in reversed(state["messages"]):
        if isinstance(message, dict):
            message_type = message.get("type") or message.get("role")
            if message_type in {"human", "user"}:
                return str(message.get("content", ""))
            continue

        message_type = getattr(message, "type", None) or getattr(message, "role", None)
        if message_type in {"human", "user"}:
            return str(getattr(message, "content", ""))

    return ""


def redact_pii(text: str) -> tuple[str, bool]:
    redacted = EMAIL_RE.sub("[EMAIL]", text)
    redacted = PHONE_RE.sub("[PHONE]", redacted)
    return redacted, redacted != text


def redact_input(state: GuardrailAgentState):
    user_text = latest_user_text(state)
    sanitized_input, pii_redacted = redact_pii(user_text)

    return {
        "sanitized_input": sanitized_input,
        "pii_redacted": pii_redacted,
        "debug_steps": [
            f"redact_input: pii_redacted={pii_redacted}",
        ],
    }


def moderate_input(state: GuardrailAgentState):
    text = state.get("sanitized_input", "").lower()
    blocked_keywords = ["suicide", "tuer", "haine", "violence"]

    if any(keyword in text for keyword in blocked_keywords):
        return {
            "moderation_decision": "block",
            "block_reason": "unsafe_input",
            "debug_steps": ["moderate_input: block unsafe_input"],
        }

    return {
        "moderation_decision": "allow",
        "debug_steps": ["moderate_input: allow"],
    }


def route_after_moderation(state: GuardrailAgentState) -> Literal["blocked", "allowed"]:
    return "blocked" if state.get("moderation_decision") == "block" else "allowed"


def blocked_response(state: GuardrailAgentState):
    answer = (
        "Je ne peux pas traiter cette demande telle quelle. "
        "Si tu travailles sur un exercice, reformule-la dans un cadre scolaire précis."
    )

    return {
        "final_answer": answer,
        "messages": [AIMessage(content=answer)],
        "debug_steps": ["blocked_response: réponse de blocage"],
    }


def generate_answer(state: GuardrailAgentState):
    """Génération volontairement déterministe pour isoler le test A7.

    Le POC produit parfois une réponse trop directe pour vérifier que le scorer
    puis le nœud de repair corrigent effectivement le comportement.
    """

    text = state.get("sanitized_input", "").lower()

    if any(keyword in text for keyword in ["réponse", "solution", "résous", "calcule"]):
        draft = "La réponse est x = 2."
    else:
        draft = (
            "Commence par repérer ce que l’énoncé te demande. "
            "Quelle information peux-tu utiliser en premier ?"
        )

    return {
        "draft_answer": draft,
        "debug_steps": ["generate_answer: brouillon généré"],
    }


def score_answer(state: GuardrailAgentState):
    draft = state.get("draft_answer", "")
    normalized = draft.lower()
    reasons: list[str] = []
    score = 1.0

    if "la réponse est" in normalized or "la bonne réponse est" in normalized:
        score -= 0.6
        reasons.append("answer_is_too_direct")

    if "?" not in draft:
        score -= 0.2
        reasons.append("missing_guiding_question")

    if not any(word in normalized for word in ["commence", "repérer", "indice", "question"]):
        score -= 0.2
        reasons.append("missing_guidance_signal")

    score = max(0.0, round(score, 2))

    return {
        "score": score,
        "score_reasons": reasons,
        "should_repair": score < 0.8,
        "debug_steps": [f"score_answer: score={score} reasons={reasons}"],
    }


def route_after_score(state: GuardrailAgentState) -> Literal["repair", "accept"]:
    return "repair" if state.get("should_repair") else "accept"


def accept_answer(state: GuardrailAgentState):
    answer = state.get("draft_answer", "")

    return {
        "final_answer": answer,
        "repair_applied": False,
        "messages": [AIMessage(content=answer)],
        "debug_steps": ["accept_answer: brouillon accepté"],
    }


def repair_answer(state: GuardrailAgentState):
    reasons = state.get("score_reasons", [])
    answer = (
        "Je ne vais pas te donner directement le résultat. "
        "Commence par identifier l’étape qui te bloque : est-ce l’énoncé, "
        "la formule à utiliser, ou le calcul ?"
    )

    return {
        "final_answer": answer,
        "repair_applied": True,
        "messages": [AIMessage(content=answer)],
        "debug_steps": [f"repair_answer: repair_applied reasons={reasons}"],
    }


agent_builder = StateGraph(GuardrailAgentState)
agent_builder.add_node("redact_input", redact_input)
agent_builder.add_node("moderate_input", moderate_input)
agent_builder.add_node("blocked_response", blocked_response)
agent_builder.add_node("generate_answer", generate_answer)
agent_builder.add_node("score_answer", score_answer)
agent_builder.add_node("accept_answer", accept_answer)
agent_builder.add_node("repair_answer", repair_answer)

agent_builder.add_edge(START, "redact_input")
agent_builder.add_edge("redact_input", "moderate_input")
agent_builder.add_conditional_edges(
    "moderate_input",
    route_after_moderation,
    {
        "blocked": "blocked_response",
        "allowed": "generate_answer",
    },
)
agent_builder.add_edge("blocked_response", END)
agent_builder.add_edge("generate_answer", "score_answer")
agent_builder.add_conditional_edges(
    "score_answer",
    route_after_score,
    {
        "repair": "repair_answer",
        "accept": "accept_answer",
    },
)
agent_builder.add_edge("repair_answer", END)
agent_builder.add_edge("accept_answer", END)

compiled_agent = agent_builder.compile()
agent = compiled_agent.with_config(langfuse_graph_config())


def invoke_once(message: str):
    return agent.invoke(
        {
            "messages": [HumanMessage(content=message)],
            "debug_steps": [],
        }
    )


if __name__ == "__main__":
    scenarios = [
        "Mon email est jeremie@example.com, aide-moi sur cet exercice.",
        "Donne-moi directement la réponse à l'équation.",
        "Je veux parler de violence et de haine.",
    ]

    for scenario in scenarios:
        print("\n=== SCENARIO ===")
        print(scenario)
        result = invoke_once(scenario)
        print("sanitized_input:", result.get("sanitized_input"))
        print("moderation_decision:", result.get("moderation_decision"))
        print("score:", result.get("score"))
        print("score_reasons:", result.get("score_reasons"))
        print("repair_applied:", result.get("repair_applied"))
        print("final_answer:", result.get("final_answer"))
        print("debug_steps:", result.get("debug_steps"))

    get_client().flush()
