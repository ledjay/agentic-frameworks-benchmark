from __future__ import annotations

import os
import time
from dataclasses import dataclass
from typing import Any

import mlflow

TRACKING_URI = os.environ.get("MLFLOW_TRACKING_URI", "http://127.0.0.1:5001")
EXPERIMENT_NAME = "ansu-mlflow-genai-demo"

mlflow.set_tracking_uri(TRACKING_URI)
mlflow.set_experiment(EXPERIMENT_NAME)


@dataclass
class AgentConfig:
    agent_id: str
    agent_version: str
    prompt_template: str
    niveau_scolaire: str
    matiere: str
    notion: str
    max_hints: int = 2


CONFIG = AgentConfig(
    agent_id="agent-naif-eleve",
    agent_version="v0.1.0-poc",
    prompt_template=(
        "Tu es un agent naïf pour des élèves de {{niveau_scolaire}} "
        "en {{matiere}}. Tu dois aider l'élève à expliquer {{notion}} "
        "sans jamais donner la réponse à sa place."
    ),
    niveau_scolaire="5e",
    matiere="SVT",
    notion="la photosynthèse",
)


def render_prompt(config: AgentConfig) -> str:
    return (
        config.prompt_template
        .replace("{{niveau_scolaire}}", config.niveau_scolaire)
        .replace("{{matiere}}", config.matiere)
        .replace("{{notion}}", config.notion)
    )


@mlflow.trace(name="moderation.input", span_type="GUARDRAIL")
def moderate_input(message: str) -> dict[str, Any]:
    too_long = len(message) > 800
    asks_answer = "donne" in message.lower() and "réponse" in message.lower()
    return {
        "allowed": not too_long,
        "too_long": too_long,
        "asks_answer": asks_answer,
        "reason": "message too long" if too_long else "ok",
    }


@mlflow.trace(name="retrieval.reference_corpus", span_type="RETRIEVER")
def retrieve_reference_corpus(notion: str) -> list[dict[str, str]]:
    return [
        {
            "title": "Corpus enseignant",
            "content": f"La notion cible est {notion}. L'agent doit rester naïf et demander pourquoi/comment.",
        }
    ]


@mlflow.trace(name="llm.fake_naive_agent", span_type="LLM")
def fake_llm_call(prompt: str, message: str, input_policy: dict[str, Any]) -> str:
    time.sleep(0.03)
    if input_policy["asks_answer"]:
        return "Je ne peux pas te donner la réponse. Peux-tu m'expliquer avec tes mots ce que tu penses déjà comprendre ?"
    return "Je crois comprendre un peu, mais peux-tu préciser pourquoi c'est important et comment cela fonctionne ?"


@mlflow.trace(name="evaluator.naivety_contract", span_type="EVALUATOR")
def evaluate_naivety(answer: str) -> dict[str, Any]:
    forbidden_fragments = ["la photosynthèse est", "voici la réponse", "en fait"]
    drift = any(fragment in answer.lower() for fragment in forbidden_fragments)
    return {
        "label": "pass" if not drift else "fail",
        "score": 1.0 if not drift else 0.0,
        "drift_detected": drift,
        "explanation": "L'agent relance sans donner l'explication experte." if not drift else "L'agent a donné une explication experte.",
    }


@mlflow.trace(name="ansu.single_agent_turn", span_type="AGENT")
def run_agent_turn(message: str, user_id: str, session_id: str) -> dict[str, Any]:
    mlflow.update_current_trace(
        metadata={
            "mlflow.trace.user": user_id,
            "mlflow.trace.session": session_id,
            "ansu.agent.id": CONFIG.agent_id,
            "ansu.agent.version": CONFIG.agent_version,
            "ansu.sequence.niveau_scolaire": CONFIG.niveau_scolaire,
            "ansu.sequence.matiere": CONFIG.matiere,
            "ansu.sequence.notion": CONFIG.notion,
            "ansu.prompt.template_contains_variables": True,
        },
        tags={
            "ansu.domain": "agentique",
            "ansu.use_case": "agent-naif",
            "ansu.poc": "mlflow",
        },
    )

    prompt = render_prompt(CONFIG)
    input_policy = moderate_input(message)
    if not input_policy["allowed"]:
        answer = "Ton message est trop long pour l'atelier. Peux-tu le raccourcir ?"
    else:
        retrieve_reference_corpus(CONFIG.notion)
        answer = fake_llm_call(prompt, message, input_policy)

    evaluation = evaluate_naivety(answer)
    return {
        "answer": answer,
        "evaluation": evaluation,
        "agent_id": CONFIG.agent_id,
        "agent_version": CONFIG.agent_version,
    }


def try_prompt_registry() -> None:
    """Best-effort prompt registry test; MLflow GenAI APIs evolve quickly."""
    genai = getattr(mlflow, "genai", None)
    if genai is None or not hasattr(genai, "register_prompt"):
        print("Prompt registry API not available in this MLflow install")
        return

    prompt = genai.register_prompt(
        name="ansu-agent-naif-master",
        template=CONFIG.prompt_template,
        commit_message="Initial AnSu naive agent prompt master",
    )
    print("Registered prompt:", prompt)


def main() -> None:
    try_prompt_registry()

    messages = [
        "Je crois que la plante mange la lumière mais je ne sais pas comment expliquer.",
        "Donne-moi directement la réponse sur la photosynthèse.",
    ]
    for index, message in enumerate(messages, start=1):
        result = run_agent_turn(
            message=message,
            user_id="teacher-preview-demo",  # avoid real student PII in POC
            session_id="preview-session-mlflow-poc",
        )
        print(f"Turn {index}:", result)

    # Classic MLflow run for aggregate metrics, easy to find in the UI.
    with mlflow.start_run(run_name="ansu-naivety-poc-summary"):
        mlflow.log_param("agent_id", CONFIG.agent_id)
        mlflow.log_param("agent_version", CONFIG.agent_version)
        mlflow.log_param("niveau_scolaire", CONFIG.niveau_scolaire)
        mlflow.log_param("matiere", CONFIG.matiere)
        mlflow.log_metric("naivety_contract_score", 1.0)
        mlflow.log_text(CONFIG.prompt_template, "prompt_template.txt")


if __name__ == "__main__":
    main()
