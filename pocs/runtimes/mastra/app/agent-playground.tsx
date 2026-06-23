"use client";

import {
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
  type FormEvent,
} from "react";
import {
  defaultTeacherConfig,
  type AgentAnswer,
  type AgentTurn,
  type NotionAssessment,
} from "../src/lib/ansu-contract";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

type AgentApiResponse = {
  mode: "mock" | "mastra";
  input: AgentTurn;
  memory: { thread: string; resource: string };
  runId: string;
  output: AgentAnswer & { raw?: unknown };
  score: {
    score: number;
    reason: string;
    guardrails: AgentAnswer["guardrails"];
  };
  error?: unknown;
};

type AssessmentApiResponse = {
  mode: "mock" | "mastra";
  runtime: string;
  runId: string;
  traceId?: string;
  spanId?: string;
  usage?: unknown;
  assessment: NotionAssessment;
  schemaValidated: boolean;
  error?: unknown;
};

function readRawArray(
  result: AgentApiResponse | null,
  field: "toolCalls" | "toolResults",
) {
  const raw = result?.output.raw;
  if (!raw || typeof raw !== "object") return [];
  const value = (raw as Record<string, unknown>)[field];
  return Array.isArray(value) ? value : [];
}

type AgentPlaygroundProps = {
  hasMistral: boolean;
};

const SESSION_KEY = "ansu-mastra-current-session-id";
const scenarios = [
  {
    label: "Réponse directe",
    message: "Donne-moi directement la réponse sur la photosynthèse.",
  },
  {
    label: "Confusion élève",
    message:
      "Je crois que la plante mange la lumière mais je ne sais pas comment expliquer.",
  },
  {
    label: "Suite contextuelle",
    message: "Et après, comment je peux le dire avec mes mots ?",
  },
];

function createSessionId() {
  const date = new Date().toISOString().slice(0, 10);
  const suffix = Math.random().toString(36).slice(2, 8);
  return `ansu-svt-photosynthese-${date}-${suffix}`;
}

function scoreLabel(score?: number) {
  if (score === undefined) return "—";
  if (score >= 0.85) return "Contrat tenu";
  if (score >= 0.55) return "À surveiller";
  return "Rupture";
}

export function AgentPlayground({ hasMistral }: AgentPlaygroundProps) {
  const [mode, setMode] = useState<"mock" | "mastra">(
    hasMistral ? "mastra" : "mock",
  );
  const [message, setMessage] = useState(scenarios[0].message);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sessionId, setSessionId] = useState("session-loading");
  const [result, setResult] = useState<AgentApiResponse | null>(null);
  const [assessment, setAssessment] = useState<AssessmentApiResponse | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [isAssessing, setIsAssessing] = useState(false);

  const scorePercent = useMemo(
    () => Math.round((result?.score.score ?? 0) * 100),
    [result],
  );
  const toolCalls = useMemo(() => readRawArray(result, "toolCalls"), [result]);
  const toolResults = useMemo(
    () => readRawArray(result, "toolResults"),
    [result],
  );
  const visibleSessionId =
    sessionId === "session-loading" ? "initialisation…" : sessionId;

  useEffect(() => {
    const existing = window.localStorage.getItem(SESSION_KEY);
    const nextSessionId = existing || createSessionId();
    window.localStorage.setItem(SESSION_KEY, nextSessionId);
    setSessionId(nextSessionId);
  }, []);

  function startNewSession() {
    const nextSessionId = createSessionId();
    try {
      window.localStorage.setItem(SESSION_KEY, nextSessionId);
    } catch {}
    setSessionId(nextSessionId);
    setMessages([]);
    setResult(null);
    setAssessment(null);
    setError(null);
    setMessage(scenarios[0].message);
  }

  async function submit(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    const trimmedMessage = message.trim();
    if (!trimmedMessage || sessionId === "session-loading") return;

    setIsPending(true);
    setError(null);

    const nextMessages: ChatMessage[] = [
      ...messages,
      { role: "user", content: trimmedMessage },
    ];

    try {
      const response = await fetch("/api/agent", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          mode,
          message: trimmedMessage,
          userId: "teacher-preview-demo",
          sessionId,
          teacherConfig: defaultTeacherConfig,
        }),
      });
      const json = await response.json();
      if (!response.ok) throw new Error(JSON.stringify(json, null, 2));
      const apiResult = json as AgentApiResponse;
      setResult(apiResult);
      setAssessment(null);
      setMessages([
        ...nextMessages,
        { role: "assistant", content: apiResult.output.answer },
      ]);
      setMessage("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Erreur inconnue");
    } finally {
      setIsPending(false);
    }
  }

  async function assessTranscript() {
    if (messages.length === 0 || sessionId === "session-loading") return;

    setIsAssessing(true);
    setError(null);

    try {
      const response = await fetch("/api/agent/assess", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          mode,
          userId: "teacher-preview-demo",
          sessionId,
          transcript: messages,
        }),
      });
      const json = await response.json();
      if (!response.ok) throw new Error(JSON.stringify(json, null, 2));
      setAssessment(json as AssessmentApiResponse);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Erreur inconnue");
    } finally {
      setIsAssessing(false);
    }
  }

  return (
    <section className="playground" aria-labelledby="playground-title">
      <div className="playgroundHeader">
        <div>
          <p className="sectionKicker">Banc d’essai</p>
          <h2 id="playground-title">Conversation agentique</h2>
          <p>
            Le dernier message est envoyé avec <code>memory.thread</code> et{" "}
            <code>memory.resource</code>. Mastra rappelle l’historique.
          </p>
        </div>
        <div className="playgroundControls">
          <div className="modeSwitch" aria-label="Mode d’exécution">
            <button
              type="button"
              className={mode === "mock" ? "active" : ""}
              onClick={() => setMode("mock")}
            >
              Mock
            </button>
            <button
              type="button"
              className={mode === "mastra" ? "active" : ""}
              onClick={() => setMode("mastra")}
            >
              Mastra
            </button>
          </div>
          <button
            className="newSessionButton"
            type="button"
            onClick={startNewSession}
          >
            Nouvelle session
          </button>
        </div>
      </div>

      <div className="sessionRibbon">
        <span>Session</span>
        <code>{visibleSessionId}</code>
        <small>
          {messages.length} message(s) affiché(s) localement · mémoire côté
          Mastra
        </small>
      </div>

      <div className="scenarioRail" aria-label="Scénarios rapides">
        {scenarios.map((scenario) => (
          <button
            key={scenario.label}
            type="button"
            onClick={() => setMessage(scenario.message)}
          >
            <span>{scenario.label}</span>
            <small>{scenario.message}</small>
          </button>
        ))}
      </div>

      <div className="conversationGrid">
        <article
          className="transcriptPanel"
          aria-label="Historique conversationnel"
        >
          <span className="miniLabel">Transcript local · mémoire Mastra</span>
          {messages.length === 0 ? (
            <p className="emptyState">
              Aucun message affiché dans cette session. Lance une première
              demande, puis teste “Et après ?” : seul Mastra Memory portera le
              contexte.
            </p>
          ) : (
            <ol className="transcriptList">
              {messages.map((item, index) => (
                <li key={`${item.role}-${index}`} data-role={item.role}>
                  <span>{item.role === "user" ? "Élève" : "Agent"}</span>
                  <p>{item.content}</p>
                </li>
              ))}
            </ol>
          )}
        </article>

        <div className="composerColumn">
          <form className="turnComposer" onSubmit={submit}>
            <label>
              Message élève
              <textarea
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                placeholder="Écris le prochain message de l’élève…"
              />
            </label>
            <div className="composerFooter">
              <p>
                {mode === "mastra"
                  ? "Appelle le runtime avec mémoire Mastra thread/resource."
                  : "Réponse déterministe, utile pour tester sans coût."}
              </p>
              <button
                type="submit"
                disabled={isPending || sessionId === "session-loading"}
              >
                {isPending ? "Exécution…" : "Envoyer avec contexte"}
              </button>
            </div>
          </form>

          <section className="assessmentCard">
            <div className="panelHeader">
              <div>
                <span className="miniLabel">Structured output</span>
                <h3>Rendre ma copie</h3>
              </div>
              <button
                type="button"
                onClick={assessTranscript}
                disabled={
                  isAssessing ||
                  messages.length === 0 ||
                  sessionId === "session-loading"
                }
              >
                {isAssessing ? "Analyse…" : "Rendre ma copie"}
              </button>
            </div>
            {assessment ? (
              <div className="assessmentResult">
                <p>{assessment.assessment.summary}</p>
                <ul className="assessmentList">
                  {assessment.assessment.notions.map((notion) => (
                    <li key={notion.id} data-ok={notion.understood}>
                      <strong>
                        {notion.understood ? "✓" : "×"} {notion.label}
                      </strong>
                      <span>
                        {notion.evidence ?? "Pas de preuve dans le transcript."}
                      </span>
                    </li>
                  ))}
                </ul>
                <span className="runMeta">
                  Schema validé · {assessment.runId}
                  {assessment.traceId
                    ? ` · trace ${assessment.traceId.slice(0, 10)}…`
                    : ""}
                </span>
              </div>
            ) : (
              <p className="scoreReason">
                Analyse le transcript local et retourne une checklist JSON
                validée par schéma.
              </p>
            )}
          </section>

          {error ? <pre className="errorBox">{error}</pre> : null}

          <div className="resultDeck" aria-live="polite">
            <article className="answerCard">
              <span className="miniLabel">Dernière réponse</span>
              {result ? (
                <p className="answerText">“{result.output.answer}”</p>
              ) : (
                <p className="emptyState">
                  La dernière réponse agent apparaîtra ici.
                </p>
              )}
              {result ? (
                <span className="runMeta">
                  Mode {result.mode} · {result.runId} · thread{" "}
                  {result.memory.thread}
                </span>
              ) : null}
            </article>

            <article className="scoreCard">
              <div
                className="scoreGauge"
                style={{ "--score": scorePercent } as CSSProperties}
              >
                <strong>{result ? `${scorePercent}%` : "—"}</strong>
                <span>{scoreLabel(result?.score.score)}</span>
              </div>
              <ul className="guardrailList">
                <li
                  data-ok={result?.score.guardrails.expertAnswerRisk === false}
                >
                  Anti-réponse experte
                </li>
                <li data-ok={Boolean(result?.score.guardrails.repairApplied)}>
                  Réparation / relance
                </li>
                <li
                  data-ok={Boolean(
                    result?.score.guardrails.directAnswerRefusal,
                  )}
                >
                  Refus si demande directe
                </li>
              </ul>
              {result ? (
                <p className="scoreReason">{result.score.reason}</p>
              ) : (
                <p className="scoreReason">
                  Le scorer vérifie la naïveté à chaque tour.
                </p>
              )}
            </article>

            <article className="debugCard">
              <span className="miniLabel">Debug tools / trace</span>
              {result ? (
                <span className="runMeta">
                  trace{" "}
                  {String(
                    (result as unknown as Record<string, unknown>).traceId ??
                      "—",
                  )}
                </span>
              ) : null}
              <div className="debugGrid">
                <div>
                  <strong>Tool calls</strong>
                  {toolCalls.length ? (
                    <pre>{JSON.stringify(toolCalls, null, 2)}</pre>
                  ) : (
                    <p className="emptyState">
                      Aucun tool call sur le dernier tour.
                    </p>
                  )}
                </div>
                <div>
                  <strong>Tool results</strong>
                  {toolResults.length ? (
                    <pre>{JSON.stringify(toolResults, null, 2)}</pre>
                  ) : (
                    <p className="emptyState">
                      Aucun tool result sur le dernier tour.
                    </p>
                  )}
                </div>
              </div>
            </article>
          </div>
        </div>
      </div>
    </section>
  );
}
