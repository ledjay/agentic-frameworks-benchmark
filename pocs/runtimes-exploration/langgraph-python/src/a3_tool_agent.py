import operator
from pathlib import Path

from dotenv import find_dotenv, load_dotenv
from langchain.messages import AnyMessage, HumanMessage, SystemMessage
from langchain_core.runnables import RunnableConfig
from langchain_core.tools import tool
from langchain_mistralai import ChatMistralAI
from langgraph.graph import END, START, StateGraph
from langgraph.prebuilt import ToolNode, tools_condition
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
# A3 est séparé de A2 pour comparer un périmètre précis : agent + tool.
AGENT_ID = "a3-tool-agent"
AGENT_VERSION = "1.0.0"
PROMPT_VERSION = "1.0.0"
SESSION_ID = "a3-langgraph-python-session"
USER_ID = "benchmark-user"


# Ce tool simule une petite base de connaissances AnSu.
# Pour le benchmark A3, l'important n'est pas la qualité du contenu :
# on veut vérifier que LangGraph sait typer, appeler et tracer un outil.
@tool
def search_knowledge(query: str) -> str:
    """Recherche dans la base de connaissances pédagogique AnSu."""

    normalized_query = query.lower()

    if "discriminant" in normalized_query or "second degré" in normalized_query:
        return (
            "Ressource AnSu: Pour aider un élève sur le discriminant, "
            "commencer par relier Δ au nombre d'intersections entre la parabole "
            "et l'axe des abscisses. Ensuite seulement introduire la formule "
            "Δ = b² - 4ac."
        )

    return (
        "Ressource AnSu: Reformuler la question de l'élève, identifier le point "
        "de blocage, puis proposer un indice plutôt qu'une réponse directe."
    )


# On regroupe les tools dans une liste.
# `ToolNode` est le noeud officiel LangGraph pour exécuter les tool calls
# produits par le modèle. C'est important pour rester proche de la doc officielle.
tools = [search_knowledge]
tool_node = ToolNode(tools)

# On crée le modèle Mistral et on lui déclare les tools disponibles.
# `bind_tools` permet au modèle de produire un tool call structuré au lieu
# de répondre directement quand il a besoin de la base de connaissances.
model = ChatMistralAI(
    model="mistral-medium-2508",
    temperature=0,
    max_retries=2,
).bind_tools(tools)


# Le state est la donnée qui circule dans le graph.
# Comme pour A2, `messages` accumule les messages utilisateur, assistant et tool.
# `llm_calls` permet de vérifier combien de fois le modèle a été appelé.
class ToolAgentState(TypedDict):
    messages: Annotated[list[AnyMessage], operator.add]
    llm_calls: int


# Cette config est attachée au graph exporté.
# Pourquoi ? Dans un script Python, on pourrait passer `config={"callbacks": [...]}`
# à `agent.invoke(...)`. Mais dans LangGraph Studio, c'est Studio qui appelle le graph.
# En préconfigurant le graph avec `with_config`, on applique le pattern recommandé
# par la doc Langfuse tout en gardant le test depuis Studio.
def langfuse_graph_config() -> RunnableConfig:
    return {
        "callbacks": [CallbackHandler()],
        "run_name": "ansu.langgraph.a3_tool_agent",
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
                "a3-tool-agent",
                "studio-compatible",
            ],
        },
    }


# Ce noeud appelle le modèle.
# Le second argument `config` est fourni par LangGraph pendant l'exécution.
# On le transmet au modèle pour que le CallbackHandler Langfuse attaché au graph
# capture aussi les appels LLM imbriqués.
def llm_call(state: ToolAgentState, config: RunnableConfig):
    response = model.invoke(
        [
            SystemMessage(
                content=(
                    "Tu es un assistant pédagogique AnSu. "
                    "Réponds en français. "
                    "Si l'élève demande une ressource, une recherche, une base de connaissances, "
                    "ou une aide pédagogique contextualisée, appelle le tool search_knowledge "
                    "avant de répondre. "
                    "Après le tool, synthétise l'information en guidant l'élève sans donner "
                    "une réponse brute."
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


# Ici on déclare le graph A3.
# Le parcours attendu est :
# START -> llm_call -> tools si le modèle demande un tool -> llm_call -> END.
agent_builder = StateGraph(ToolAgentState)
agent_builder.add_node("llm_call", llm_call)
agent_builder.add_node("tools", tool_node)
agent_builder.add_edge(START, "llm_call")

# `tools_condition` est une condition prête à l'emploi fournie par LangGraph.
# Elle inspecte la dernière réponse du modèle :
# - s'il y a un tool call, on va vers le noeud `tools` ;
# - sinon, on termine le graph.
agent_builder.add_conditional_edges(
    "llm_call",
    tools_condition,
    {
        "tools": "tools",
        END: END,
    },
)

# Après l'exécution du tool, on revient au modèle.
# Le modèle peut alors produire la réponse finale à partir du résultat du tool.
agent_builder.add_edge("tools", "llm_call")

# On compile le graph puis on lui attache la config Langfuse par défaut.
# C'est le point clé pour que Studio + Langfuse fonctionnent ensemble.
compiled_agent = agent_builder.compile()
agent = compiled_agent.with_config(langfuse_graph_config())


# Ce bloc sert uniquement quand on lance ce fichier directement.
# Il permet de tester A3 sans passer par Studio.
if __name__ == "__main__":
    result = agent.invoke(
        {
            "messages": [
                HumanMessage(
                    content=(
                        "Va chercher dans la base de connaissances comment aider "
                        "un élève à comprendre le discriminant."
                    )
                )
            ],
            "llm_calls": 0,
        }
    )

    for message in result["messages"]:
        message.pretty_print()

    print(f"Nombre d'appels LLM : {result['llm_calls']}")

    get_client().flush()
