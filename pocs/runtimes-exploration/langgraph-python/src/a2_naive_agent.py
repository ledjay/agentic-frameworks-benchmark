import operator
from pathlib import Path

from dotenv import find_dotenv, load_dotenv
from langchain.messages import AnyMessage, HumanMessage, SystemMessage
from langchain_mistralai import ChatMistralAI
from langgraph.graph import END, START, StateGraph
from langfuse import get_client
from langfuse.langchain import CallbackHandler
from typing_extensions import Annotated, TypedDict

# On charge d'abord le `.env` local du POC LangGraph.
# Il contient les variables Langfuse locales utilisées pendant l'exploration.
load_dotenv(find_dotenv(usecwd=True))

# On charge aussi le `.env` à la racine du repo benchmark.
# Il contient notamment `MISTRAL_API_KEY`.
# `override=False` évite d'écraser les variables déjà chargées localement.
load_dotenv(Path(__file__).resolve().parents[4] / ".env", override=False)

# Ces constantes identifient clairement la version testée dans les traces.
# Elles permettent de comparer Mastra et LangGraph sans mélanger les runs.
AGENT_ID = "a2-naive-agent"
AGENT_VERSION = "1.0.0"
PROMPT_VERSION = "1.0.0"
SESSION_ID = "a2-langgraph-python-session"
USER_ID = "benchmark-user"

# Ici on crée le modèle utilisé par le graph.
# Pour A2, on garde volontairement un agent minimal : un seul appel LLM,
# pas d'outil, pas de mémoire multi-tour.
model = ChatMistralAI(
    model="mistral-medium-2508",
    temperature=0,
    max_retries=2,
)


# Le state est la donnée qui circule de noeud en noeud dans le graph.
# `messages` contient la conversation.
# `operator.add` dit à LangGraph : quand un noeud renvoie de nouveaux messages,
# ajoute-les à la liste existante au lieu de remplacer toute la liste.
class MessagesState(TypedDict):
    messages: Annotated[list[AnyMessage], operator.add]
    llm_calls: int


# Ce noeud est le coeur du POC A2.
# Il prend les messages utilisateur, ajoute le prompt système AnSu,
# appelle le modèle une seule fois, puis remet la réponse dans le state.
def llm_call(state: MessagesState):
    response = model.invoke(
        [
            SystemMessage(
                content=(
                    "Tu es un assistant pédagogique AnSu. "
                    "Réponds en français, de façon courte, claire et guidante."
                )
            )
        ]
        + state["messages"]
    )

    return {
        "messages": [response],
        "llm_calls": state.get("llm_calls", 0) + 1,
    }


# Ici on déclare le graph LangGraph.
# Pour A2, le parcours est volontairement simple :
# START -> llm_call -> END.
agent_builder = StateGraph(MessagesState)
agent_builder.add_node("llm_call", llm_call)
agent_builder.add_edge(START, "llm_call")
agent_builder.add_edge("llm_call", END)

# `agent` est le graph compilé.
# C'est cette variable que LangGraph Studio et notre API FastAPI peuvent invoquer.
agent = agent_builder.compile()


# Ce bloc sert uniquement quand on lance ce fichier directement en ligne de commande.
# Il permet de tester A2 sans passer par FastAPI ni Studio.
if __name__ == "__main__":
    langfuse = get_client()
    langfuse_handler = CallbackHandler()

    result = agent.invoke(
        {
            "messages": [
                HumanMessage(
                    content="Explique-moi ce qu'est une équation du second degré."
                )
            ],
            "llm_calls": 0,
        },
        config={
            "callbacks": [langfuse_handler],
            "run_name": "ansu.langgraph.a2_naive_agent",
            "metadata": {
                "runtime": "langgraph-python",
                "agentId": AGENT_ID,
                "agentVersion": AGENT_VERSION,
                "promptVersion": PROMPT_VERSION,
                "model": "mistral-medium-2508",
                "langfuse_user_id": USER_ID,
                "langfuse_session_id": SESSION_ID,
                "langfuse_tags": [
                    "ansu",
                    "runtime:langgraph-python",
                    "a2-naive-agent",
                ],
            },
        },
    )

    for message in result["messages"]:
        message.pretty_print()

    print(f"Nombre d'appels LLM : {result['llm_calls']}")

    langfuse.flush()
