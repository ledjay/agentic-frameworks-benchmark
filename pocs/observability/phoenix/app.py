from __future__ import annotations

import json
import os
import re
from dataclasses import dataclass
from typing import Any

from dotenv import load_dotenv
from langchain_core.output_parsers import StrOutputParser
from langchain_core.prompts import ChatPromptTemplate
from openinference.instrumentation.langchain import LangChainInstrumentor
from opentelemetry import trace
from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter
from opentelemetry.sdk.resources import Resource
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor

load_dotenv()

PROJECT_NAME = os.getenv("PHOENIX_PROJECT_NAME", "ansu-phoenix-langchain-demo")
PHOENIX_OTEL_ENDPOINT = os.getenv("PHOENIX_OTEL_ENDPOINT", "http://127.0.0.1:6006/v1/traces")
GRAFANA_OTEL_ENDPOINT = os.getenv("GRAFANA_OTEL_ENDPOINT")

KNOWLEDGE_BASE = [
    {
        "id": "ansu-poc-001",
        "title": "Besoin POC AnSu v5",
        "text": (
            "Le POC AnSu v5 vise un seul agent avec modération input/output, "
            "observabilité OpenTelemetry et premières évaluations."
        ),
    },
    {
        "id": "ansu-prod-001",
        "title": "Besoins futurs AnSu v5",
        "text": (
            "Les besoins futurs incluent versioning agent, multi-agents, evals avancées "
            "et retours d'évaluation saisis par les professeurs."
        ),
    },
]

BLOCKED_TERMS = ("motdepasse", "password", "secret", "apikey", "api key")


@dataclass
class ModerationResult:
    allowed: bool
    reason: str


def setup_tracing() -> None:
    """Configure OpenTelemetry export to Phoenix and optionally to Grafana/Tempo."""
    resource = Resource.create(
        {
            "service.name": "ansu-agent-demo",
            "service.namespace": "agentic-frameworks-benchmark",
            "openinference.project.name": PROJECT_NAME,
        }
    )
    tracer_provider = TracerProvider(resource=resource)
    tracer_provider.add_span_processor(BatchSpanProcessor(OTLPSpanExporter(PHOENIX_OTEL_ENDPOINT)))

    if GRAFANA_OTEL_ENDPOINT:
        tracer_provider.add_span_processor(BatchSpanProcessor(OTLPSpanExporter(GRAFANA_OTEL_ENDPOINT)))

    trace.set_tracer_provider(tracer_provider)
    LangChainInstrumentor().instrument(tracer_provider=tracer_provider)


def moderate_input(question: str) -> ModerationResult:
    tracer = trace.get_tracer(__name__)
    with tracer.start_as_current_span("moderation.input") as span:
        lowered = question.lower()
        blocked = [term for term in BLOCKED_TERMS if term in lowered]
        result = ModerationResult(
            allowed=not blocked,
            reason="blocked_terms:" + ",".join(blocked) if blocked else "ok",
        )
        span.set_attribute("openinference.span.kind", "GUARDRAIL")
        span.set_attribute("ansu.moderation.direction", "input")
        span.set_attribute("ansu.moderation.allowed", result.allowed)
        span.set_attribute("ansu.moderation.reason", result.reason)
        return result


def moderate_output(answer: str) -> ModerationResult:
    tracer = trace.get_tracer(__name__)
    with tracer.start_as_current_span("moderation.output") as span:
        # Demo-only rule: an answer is acceptable if it either cites a source or clearly refuses.
        has_source = "[source:" in answer.lower()
        is_refusal = "je ne sais pas" in answer.lower()
        result = ModerationResult(
            allowed=has_source or is_refusal,
            reason="ok" if has_source or is_refusal else "missing_source_or_refusal",
        )
        span.set_attribute("openinference.span.kind", "GUARDRAIL")
        span.set_attribute("ansu.moderation.direction", "output")
        span.set_attribute("ansu.moderation.allowed", result.allowed)
        span.set_attribute("ansu.moderation.reason", result.reason)
        return result


def retrieve_context(question: str) -> dict[str, Any]:
    tracer = trace.get_tracer(__name__)
    with tracer.start_as_current_span("retrieval.local_knowledge_base") as span:
        tokens = set(re.findall(r"\w+", question.lower()))
        scored_docs = []
        for doc in KNOWLEDGE_BASE:
            score = sum(1 for token in tokens if token in doc["text"].lower())
            if score:
                scored_docs.append((score, doc))
        scored_docs.sort(key=lambda item: item[0], reverse=True)
        docs = [doc for _, doc in scored_docs] or KNOWLEDGE_BASE[:1]
        context = "\n".join(f"- {doc['text']} [source:{doc['id']}]" for doc in docs)
        span.set_attribute("openinference.span.kind", "RETRIEVER")
        span.set_attribute("retrieval.documents.count", len(docs))
        span.set_attribute("retrieval.documents.ids", json.dumps([doc["id"] for doc in docs]))
        return {"question": question, "context": context, "source_ids": [doc["id"] for doc in docs]}


def build_model():
    if os.getenv("MISTRAL_API_KEY"):
        from langchain_mistralai import ChatMistralAI

        return ChatMistralAI(model=os.getenv("MISTRAL_MODEL", "mistral-small-latest"), temperature=0)

    if os.getenv("OPENAI_API_KEY"):
        from langchain_openai import ChatOpenAI

        return ChatOpenAI(model=os.getenv("OPENAI_MODEL", "gpt-4o-mini"), temperature=0)

    from langchain_core.language_models.fake_chat_models import FakeListChatModel

    return FakeListChatModel(
        responses=[
            "Le POC AnSu v5 doit d'abord valider un agent unique avec modération en entrée/sortie, "
            "observabilité OpenTelemetry et premières évaluations. [source:ansu-poc-001]"
        ]
    )


def evaluate_answer(question: str, answer: str, source_ids: list[str]) -> dict[str, Any]:
    tracer = trace.get_tracer(__name__)
    with tracer.start_as_current_span("eval.answer_contract") as span:
        cites_known_source = any(f"[source:{source_id}]" in answer for source_id in source_ids)
        mentions_observability = "opentelemetry" in answer.lower() or "observabilité" in answer.lower()
        score = int(cites_known_source) + int(mentions_observability)
        normalized_score = score / 2
        result = {
            "name": "answer_contract",
            "score": normalized_score,
            "label": "pass" if normalized_score == 1 else "fail",
            "explanation": (
                "Réponse cite une source connue et mentionne l'observabilité."
                if normalized_score == 1
                else "Réponse incomplète pour le contrat de démo."
            ),
        }
        span.set_attribute("openinference.span.kind", "EVALUATOR")
        span.set_attribute("eval.name", result["name"])
        span.set_attribute("eval.score", result["score"])
        span.set_attribute("eval.label", result["label"])
        span.set_attribute("eval.explanation", result["explanation"])
        span.set_attribute("input.value", question)
        span.set_attribute("output.value", answer)
        return result


def run(question: str) -> dict[str, Any]:
    tracer = trace.get_tracer(__name__)
    with tracer.start_as_current_span("ansu.single_agent_turn") as span:
        span.set_attribute("openinference.span.kind", "AGENT")
        span.set_attribute("input.value", question)

        input_moderation = moderate_input(question)
        if not input_moderation.allowed:
            answer = "Je ne peux pas traiter cette demande car elle contient un terme sensible."
            output_moderation = moderate_output(answer)
            evaluation = {"name": "answer_contract", "score": 0, "label": "blocked", "explanation": input_moderation.reason}
            span.set_attribute("output.value", answer)
            return {
                "question": question,
                "answer": answer,
                "input_moderation": input_moderation.__dict__,
                "output_moderation": output_moderation.__dict__,
                "evaluation": evaluation,
            }

        prompt = ChatPromptTemplate.from_messages(
            [
                (
                    "system",
                    "Tu es un assistant AnSu. Réponds en français, de façon concise. "
                    "Utilise uniquement le contexte fourni. Cite les sources entre crochets.",
                ),
                ("human", "Question: {question}\n\nContexte:\n{context}"),
            ]
        )
        context = retrieve_context(question)
        chain = prompt | build_model() | StrOutputParser()
        answer = chain.invoke(context)
        output_moderation = moderate_output(answer)
        evaluation = evaluate_answer(question, answer, context["source_ids"])

        span.set_attribute("output.value", answer)
        span.set_attribute("ansu.output.allowed", output_moderation.allowed)
        span.set_attribute("ansu.eval.score", evaluation["score"])
        return {
            "question": question,
            "answer": answer,
            "input_moderation": input_moderation.__dict__,
            "output_moderation": output_moderation.__dict__,
            "evaluation": evaluation,
        }


if __name__ == "__main__":
    setup_tracing()
    question = os.getenv(
        "DEMO_QUESTION",
        "Quel est le besoin prioritaire du POC agentique AnSu v5 ?",
    )
    print(json.dumps(run(question), ensure_ascii=False, indent=2))
