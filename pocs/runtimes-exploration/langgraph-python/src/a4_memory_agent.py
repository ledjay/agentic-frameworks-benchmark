import operator
from pathlib import Path

from dotenv import find_dotenv, load_dotenv
from langchain.messages import AnyMessage, HumanMessage, SystemMessage
from langchain_core.runnables import RunnableConfig
from langchain_mistralai import ChatMistralAI
from langgraph.checkpoint.memory import MemorySaver
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
# A4 teste un point différent de A3 : la mémoire de session multi-tour.
AGENT_ID = "a4-memory-agent"
AGENT_VERSION = "1.0.0"
PROMPT_VERSION = "1.0.0"
USER_ID = "benchmark-user"

# On crée le modèle utilisé par le graph.
# Ici, le modèle n'a pas de mémoire par lui-même : la mémoire vient du state
# restauré par LangGraph grâce au checkpointer et au `thread_id`.
model = ChatMistralAI(
    model="mistral-medium-2508",
    temperature=0,
    max_retries=2,
)


# Le state contient les messages de la conversation.
# `operator.add` dit à LangGraph d'ajouter les nouveaux messages aux anciens.
# C'est ce qui permet de reconstruire l'historique complet à chaque tour.
class MemoryAgentState(TypedDict):
    messages: Annotated[list[AnyMessage], operator.add]
    llm_calls: int


# Ce checkpointer sert uniquement au test CLI standalone.
# Important : LangGraph Studio / `langgraph dev` refuse les graphs exportés
# avec un checkpointer custom, car le runtime local/dev gère déjà la persistance.
# Donc plus bas, on exporte deux variantes :
# - `agent` sans checkpointer custom pour Studio ;
# - `local_test_agent` avec MemorySaver pour le test CLI.
checkpointer = MemorySaver()


# Cette config est attachée au graph exporté pour produire des traces Langfuse.
# Elle permet aussi de tester depuis LangGraph Studio, puisque Studio appelle
# directement le graph exporté.
def langfuse_graph_config() -> RunnableConfig:
    return {
        "callbacks": [CallbackHandler()],
        "run_name": "ansu.langgraph.a4_memory_agent",
        "metadata": {
            "runtime": "langgraph-python",
            "agentId": AGENT_ID,
            "agentVersion": AGENT_VERSION,
            "promptVersion": PROMPT_VERSION,
            "model": "mistral-medium-2508",
            "langfuse_user_id": USER_ID,
            "langfuse_tags": [
                "ansu",
                "runtime:langgraph-python",
                "a4-memory-agent",
            ],
        },
    }


# Ce noeud appelle le modèle avec tout l'historique connu pour le thread courant.
# Le point important : ce nœud ne va pas chercher la mémoire lui-même.
# LangGraph restaure automatiquement le state correspondant au `thread_id`
# avant d'appeler le noeud.
def llm_call(state: MemoryAgentState, config: RunnableConfig):
    response = model.invoke(
        [
            SystemMessage(
                content=(
                    "Tu es un assistant pédagogique AnSu. "
                    "Réponds en français, brièvement. "
                    "Si l'utilisateur te demande une information mentionnée plus tôt "
                    "dans la conversation, utilise l'historique des messages. "
                    "Si l'information n'est pas dans cette session, dis clairement "
                    "que tu ne la connais pas encore."
                )
            )
        ]
        + state["messages"],
        config=config,
    )

    return {
        "messages": [response],
        "llm_calls": state.get("llm_calls", 0) + 1,
    }


# Le graph A4 reste volontairement simple.
# La différence avec A2 n'est pas le nombre de nœuds : c'est le checkpointer.
# START -> llm_call -> END, mais compilé avec `checkpointer=checkpointer`.
agent_builder = StateGraph(MemoryAgentState)
agent_builder.add_node("llm_call", llm_call)
agent_builder.add_edge(START, "llm_call")
agent_builder.add_edge("llm_call", END)

# Variante exportée pour LangGraph Studio.
# On ne met PAS de checkpointer custom ici : `langgraph dev` fournit déjà
# sa persistance in-memory et rejette les graphs exportés avec un checkpointer.
compiled_agent = agent_builder.compile()
agent = compiled_agent.with_config(langfuse_graph_config())

# Variante utilisée seulement par le test CLI direct de ce fichier.
# Ici, comme on n'est pas dans le runtime `langgraph dev`, on fournit nous-mêmes
# un MemorySaver pour valider le comportement `thread_id` en local.
local_test_agent = agent_builder.compile(checkpointer=checkpointer).with_config(
    langfuse_graph_config()
)


# Ce helper rend les tests CLI plus lisibles.
# `session_id` devient le `thread_id` LangGraph : deux session_id différents
# correspondent à deux mémoires isolées.
def invoke_turn(message: str, session_id: str):
    return local_test_agent.invoke(
        {
            "messages": [HumanMessage(content=message)],
            "llm_calls": 0,
        },
        config={
            "configurable": {
                "thread_id": session_id,
            },
            "metadata": {
                "langfuse_session_id": session_id,
            },
        },
    )


# Ce bloc sert uniquement quand on lance ce fichier directement.
# Il teste trois choses :
# 1. session A retient le prénom Camille ;
# 2. session A sait le restituer au tour suivant ;
# 3. session B ne doit pas connaître Camille.
if __name__ == "__main__":
    session_a = "a4-session-camille"
    session_b = "a4-session-isolated"

    print("\n--- Session A / tour 1 ---")
    result_a1 = invoke_turn(
        "Souviens-toi que mon prénom est Camille.",
        session_a,
    )
    result_a1["messages"][-1].pretty_print()

    print("\n--- Session A / tour 2 ---")
    result_a2 = invoke_turn(
        "Quel est mon prénom ?",
        session_a,
    )
    result_a2["messages"][-1].pretty_print()

    print("\n--- Session B / tour 1 ---")
    result_b1 = invoke_turn(
        "Quel est mon prénom ?",
        session_b,
    )
    result_b1["messages"][-1].pretty_print()

    get_client().flush()
