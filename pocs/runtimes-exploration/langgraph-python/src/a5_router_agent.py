import operator
from pathlib import Path

from dotenv import find_dotenv, load_dotenv
from langchain.messages import AnyMessage, HumanMessage, SystemMessage
from langchain_core.runnables import RunnableConfig
from langchain_mistralai import ChatMistralAI
from langgraph.graph import END, START, StateGraph
from langfuse import get_client
from langfuse.langchain import CallbackHandler
from typing_extensions import Annotated, Literal, NotRequired, TypedDict

# On charge d'abord le `.env` local du POC LangGraph.
# Il contient les variables Langfuse locales utilisées pendant l'exploration.
load_dotenv(find_dotenv(usecwd=True))

# On charge aussi le `.env` à la racine du repo benchmark.
# Il contient notamment `MISTRAL_API_KEY`.
# `override=False` évite d'écraser les variables déjà chargées localement.
load_dotenv(Path(__file__).resolve().parents[4] / ".env", override=False)

# Ces constantes identifient clairement la version testée dans les traces.
# A5 teste la lisibilité d'un flow non linéaire : classifier, router, répondre.
AGENT_ID = "a5-router-agent"
AGENT_VERSION = "1.0.0"
PROMPT_VERSION = "1.0.0"
USER_ID = "benchmark-user"
SESSION_ID = "a5-langgraph-router-session"

# Les routes possibles sont volontairement limitées.
# Ça permet de comparer proprement LangGraph au workflow Mastra A5.
Route = Literal["hint", "direct", "off_topic"]

# On crée le modèle utilisé uniquement pour la génération finale.
# La classification est déterministe dans ce POC pour isoler le sujet A5 :
# la lisibilité du routing, pas la performance d'un classifieur LLM.
model = ChatMistralAI(
    model="mistral-medium-2508",
    temperature=0,
    max_retries=2,
)


# Le state est le coeur du POC A5.
# Il porte à la fois la conversation et les informations métier ajoutées
# par chaque nœud du graph : route choisie, contexte pédagogique, debug steps.
class RouterAgentState(TypedDict):
    # `messages` accumule les messages utilisateur et assistant.
    # C'est le seul champ que l'utilisateur doit vraiment fournir en entrée.
    messages: Annotated[list[AnyMessage], operator.add]

    # Les champs suivants sont écrits par le graph lui-même.
    # `NotRequired` évite que LangGraph Studio les affiche comme entrées obligatoires.
    route: NotRequired[Route]
    pedagogical_context: NotRequired[str]

    # `debug_steps` garde une trace courte, humaine, des décisions prises.
    debug_steps: NotRequired[Annotated[list[str], operator.add]]

    llm_calls: NotRequired[int]


# Cette config est attachée au graph exporté.
# Comme pour A3/A4, cela permet d'avoir des traces Langfuse même quand
# le graph est lancé depuis LangGraph Studio.
def langfuse_graph_config() -> RunnableConfig:
    return {
        "callbacks": [CallbackHandler()],
        "run_name": "ansu.langgraph.a5_router_agent",
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
                "a5-router-agent",
                "routing",
                "studio-compatible",
            ],
        },
    }


# Ce helper récupère le dernier message utilisateur.
# Point important découvert pendant le test : selon le mode d'appel,
# les messages peuvent arriver comme objets LangChain (`HumanMessage`) ou comme
# dictionnaires sérialisés (`{"type": "human", "content": "..."}`) depuis Studio.
# On gère les deux formes pour éviter de router par erreur vers le fallback `hint`.
def latest_user_text(state: RouterAgentState) -> str:
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


# Ce noeud choisit la route métier.
# Dans un vrai produit, cette étape pourrait devenir un classifieur LLM,
# un scorer, ou une règle métier plus riche. Ici elle est volontairement
# déterministe pour rendre le routing facile à inspecter.
def classify_request(state: RouterAgentState):
    user_text = latest_user_text(state).lower()

    if any(keyword in user_text for keyword in ["indice", "aide", "guide", "débloque"]):
        route: Route = "hint"
    elif any(keyword in user_text for keyword in ["résous", "solution", "calcule", "réponse"]):
        route = "direct"
    elif any(keyword in user_text for keyword in ["météo", "foot", "recette", "politique"]):
        route = "off_topic"
    else:
        route = "hint"

    return {
        "route": route,
        "debug_steps": [f"classify_request: route={route}"],
    }


# Cette fonction lit la route choisie dans le state.
# Elle est utilisée par `add_conditional_edges` pour sélectionner la branche.
def route_after_classification(state: RouterAgentState) -> Route:
    return state.get("route", "hint")


# Branche 1 : l'élève demande un indice.
# On prépare un contexte qui force la réponse à guider sans résoudre entièrement.
def prepare_hint_context(state: RouterAgentState):
    pedagogical_context = (
        "L'élève demande un indice. Ne donne pas la solution complète. "
        "Pose une question guidante ou donne une première étape."
    )

    return {
        "pedagogical_context": pedagogical_context,
        "debug_steps": ["prepare_hint_context: contexte indice"],
    }


# Branche 2 : l'élève demande explicitement une résolution.
# On autorise une réponse plus directe, mais en gardant une explication pédagogique.
def prepare_direct_context(state: RouterAgentState):
    pedagogical_context = (
        "L'élève demande une résolution directe. Donne les étapes principales, "
        "mais explique le raisonnement plutôt que de donner seulement le résultat."
    )

    return {
        "pedagogical_context": pedagogical_context,
        "debug_steps": ["prepare_direct_context: contexte résolution directe"],
    }


# Branche 3 : la demande sort du cadre pédagogique AnSu.
# On prépare une réponse de recentrage.
def prepare_off_topic_context(state: RouterAgentState):
    pedagogical_context = (
        "La demande semble hors sujet pour AnSu. Réponds poliment que tu peux aider "
        "sur les apprentissages, puis propose de revenir à l'exercice."
    )

    return {
        "pedagogical_context": pedagogical_context,
        "debug_steps": ["prepare_off_topic_context: contexte hors sujet"],
    }


# Ce noeud final est le seul qui appelle le LLM.
# Il lit la route et le contexte préparés par les nœuds précédents,
# puis produit la réponse finale utilisateur.
def generate_answer(state: RouterAgentState, config: RunnableConfig):
    route = state.get("route", "hint")
    pedagogical_context = state.get(
        "pedagogical_context",
        "Réponds en aidant l'élève sans donner une solution brute.",
    )
    user_text = latest_user_text(state)

    response = model.invoke(
        [
            SystemMessage(
                content=(
                    "Tu es un assistant pédagogique AnSu. "
                    "Réponds en français, de façon courte et utile.\n\n"
                    f"Route choisie par le graph: {route}\n"
                    f"Consigne pédagogique: {pedagogical_context}\n"
                    "Tu dois respecter cette consigne dans ta réponse."
                )
            ),
            HumanMessage(content=user_text),
        ],
        config=config,
    )

    return {
        "messages": [response],
        "llm_calls": state.get("llm_calls", 0) + 1,
        "debug_steps": ["generate_answer: réponse finale générée"],
    }


# Ici on déclare le graph A5.
# C'est le point fort potentiel de LangGraph : le flow non linéaire est explicite.
agent_builder = StateGraph(RouterAgentState)
agent_builder.add_node("classify_request", classify_request)
agent_builder.add_node("prepare_hint_context", prepare_hint_context)
agent_builder.add_node("prepare_direct_context", prepare_direct_context)
agent_builder.add_node("prepare_off_topic_context", prepare_off_topic_context)
agent_builder.add_node("generate_answer", generate_answer)

# Entrée du graph : on commence toujours par classifier la demande.
agent_builder.add_edge(START, "classify_request")

# Le résultat de `classify_request` choisit la branche suivante.
agent_builder.add_conditional_edges(
    "classify_request",
    route_after_classification,
    {
        "hint": "prepare_hint_context",
        "direct": "prepare_direct_context",
        "off_topic": "prepare_off_topic_context",
    },
)

# Les trois branches reviennent vers le même noeud de génération finale.
agent_builder.add_edge("prepare_hint_context", "generate_answer")
agent_builder.add_edge("prepare_direct_context", "generate_answer")
agent_builder.add_edge("prepare_off_topic_context", "generate_answer")
agent_builder.add_edge("generate_answer", END)

# On compile le graph puis on attache Langfuse par défaut pour Studio.
compiled_agent = agent_builder.compile()
agent = compiled_agent.with_config(langfuse_graph_config())


# Ce helper rend les tests CLI plus rapides.
def invoke_once(message: str):
    return agent.invoke(
        {
            "messages": [HumanMessage(content=message)],
            "llm_calls": 0,
            "debug_steps": [],
        }
    )


# Ce bloc sert uniquement quand on lance ce fichier directement.
# Il teste les trois routes : indice, direct, hors sujet.
if __name__ == "__main__":
    questions = [
        "Donne-moi un indice pour résoudre x² - 5x + 6 = 0.",
        "Résous x² - 5x + 6 = 0.",
        "C'est quoi la météo aujourd'hui ?",
    ]

    for question in questions:
        print(f"\n--- Question : {question}")
        result = invoke_once(question)
        print("Debug steps:", result["debug_steps"])
        result["messages"][-1].pretty_print()

    get_client().flush()
