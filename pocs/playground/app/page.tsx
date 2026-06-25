"use client";

import { FormEvent, useMemo, useState } from "react";

const observabilities = [
  {
    id: "mlflow",
    label: "MLflow",
    endpoint: "LangGraph Python :3021",
    dashboard: "http://localhost:5001",
    description: "Tracing natif via mlflow.langchain.autolog().",
  },
  {
    id: "phoenix",
    label: "Phoenix",
    endpoint: "LangGraph Python :3022",
    dashboard: "http://localhost:6006",
    description:
      "Tracing natif via phoenix.otel.register(auto_instrument=True).",
  },
  {
    id: "langfuse",
    label: "Langfuse",
    endpoint: "LangGraph Python :3023",
    dashboard: "http://localhost:3012",
    description: "Tracing natif via langfuse.langchain.CallbackHandler.",
  },
] as const;

const llmPresets = [
  { gateway: "mistral", model: "mistral-small-latest", label: "Mistral small" },
  { gateway: "albert", model: "albert-large", label: "Albert large" },
] as const;

const scenarios = [
  {
    id: "confusion-lumiere",
    label: "S1 · Confusion lumière",
    message:
      "Je crois que la plante mange la lumière mais je ne sais pas comment expliquer.",
  },
  {
    id: "reponse-directe",
    label: "S2 · Demande directe",
    message: "Donne-moi directement la réponse sur la photosynthèse.",
  },
  {
    id: "reformulation",
    label: "S3 · Reformulation partielle",
    message:
      "La lumière aide la plante à pousser mais je ne sais pas si c’est sa nourriture.",
  },
  {
    id: "indice",
    label: "S4 · Indice / outil",
    message: "Est-ce qu’on peut chercher un indice sur la photosynthèse ?",
  },
] as const;

const defaultTranscript = `user: Je crois que la plante mange la lumière.
assistant: Intéressant. Qu’est-ce qui te fait penser que la lumière est une nourriture ?
user: Peut-être parce que sans lumière elle ne pousse pas.`;

type ObservabilityId = (typeof observabilities)[number]["id"];
type LlmGateway = (typeof llmPresets)[number]["gateway"];
type ScenarioId = (typeof scenarios)[number]["id"];
type TestMode = "turn" | "assessment";

type ApiResponse = {
  request?: unknown;
  runtime?: {
    runId: string;
    runtime: string;
    provider?: string;
    model?: string;
    agentVersion?: string;
    promptVersion?: string;
    output?: { answer: string; raw?: unknown };
    score?: {
      score: number;
      reason?: string;
      passed?: boolean;
      guardrails?: Record<string, unknown>;
    };
    assessment?: unknown;
    schemaValidated?: boolean;
    details?: unknown;
    usage?: {
      inputTokens?: number;
      outputTokens?: number;
      totalTokens?: number;
      cost?: number;
      impacts?: { kWh?: number; kgCO2eq?: number };
    };
  };
  trace?: {
    provider: string;
    status: "sent" | "skipped" | "error";
    traceId?: string;
    url?: string;
    message?: string;
  };
  timings?: { runtimeMs: number; observabilityMs: number; totalMs: number };
  error?: unknown;
};

function parseTranscript(text: string) {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const match = /^(user|assistant)\s*:\s*(.*)$/i.exec(line);
      if (match) {
        return {
          role: match[1].toLowerCase() as "user" | "assistant",
          content: match[2].trim(),
        };
      }
      return { role: "user" as const, content: line };
    })
    .filter((item) => item.content.length > 0);
}

export default function Page() {
  const [observability, setObservability] = useState<ObservabilityId>("mlflow");
  const [testMode, setTestMode] = useState<TestMode>("turn");
  const [llmGateway, setLlmGateway] = useState<LlmGateway>("mistral");
  const [llmModel, setLlmModel] = useState("mistral-small-latest");
  const [scenarioId, setScenarioId] = useState<ScenarioId>("confusion-lumiere");
  const [sessionId, setSessionId] = useState("benchmark-observability-001");
  const [userId, setUserId] = useState("teacher-preview-demo");
  const [message, setMessage] = useState<string>(scenarios[0].message);
  const [transcriptText, setTranscriptText] = useState(defaultTranscript);
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<ApiResponse | null>(null);

  const selectedObs =
    observabilities.find((item) => item.id === observability) ??
    observabilities[0];
  const selectedScenario =
    scenarios.find((item) => item.id === scenarioId) ?? scenarios[0];

  const turnPayload = useMemo(
    () => ({
      runtime: "langgraph-python" as const,
      observability,
      mode: "real" as const,
      llm: { gateway: llmGateway, model: llmModel },
      sessionId,
      userId,
      message,
      teacherConfig: {
        niveauScolaire: "5e",
        matiere: "SVT",
        notion: "la photosynthèse",
        posture:
          "agent naïf qui aide l’élève à verbaliser son raisonnement sans donner la réponse experte",
        interdits: [
          "ne pas donner la définition complète",
          "ne pas produire une correction prête à recopier",
        ],
      },
    }),
    [observability, llmGateway, llmModel, sessionId, userId, message],
  );

  const assessmentPayload = useMemo(
    () => ({
      observability,
      mode: "real" as const,
      sessionId,
      userId,
      transcript: parseTranscript(transcriptText),
    }),
    [observability, sessionId, userId, transcriptText],
  );

  const technicalPayload =
    testMode === "turn" ? turnPayload : assessmentPayload;
  const assessment = response?.runtime?.assessment;
  const answer = response?.runtime?.output?.answer;

  function selectScenario(nextScenarioId: ScenarioId) {
    const scenario = scenarios.find((item) => item.id === nextScenarioId);
    setScenarioId(nextScenarioId);
    if (scenario) {
      setMessage(scenario.message);
      setSessionId(`benchmark-${observability}-${scenario.id}`);
    }
  }

  function selectObservability(next: ObservabilityId) {
    setObservability(next);
    setSessionId(
      `benchmark-${next}-${testMode === "turn" ? selectedScenario.id : "structured-assessment"}`,
    );
  }

  function selectTestMode(next: TestMode) {
    setTestMode(next);
    setResponse(null);
    setSessionId(
      `benchmark-${observability}-${next === "turn" ? selectedScenario.id : "structured-assessment"}`,
    );
  }

  function selectModel(nextGateway: LlmGateway) {
    const preset = llmPresets.find((item) => item.gateway === nextGateway);
    if (!preset) return;
    setLlmGateway(preset.gateway);
    setLlmModel(preset.model);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setResponse(null);
    try {
      const res = await fetch(
        testMode === "turn" ? "/api/turn" : "/api/assess",
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(technicalPayload),
        },
      );
      const json = (await res.json()) as ApiResponse;
      setResponse(json);
    } catch (error) {
      setResponse({
        error: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="page">
      <div className="container compact-container">
        <header className="hero">
          <p className="kicker">AnSu v5 · banc observability</p>
          <div className="hero-grid">
            <div>
              <h1>Comparer les traces.</h1>
              <p className="lead">
                Runtime fixé sur <strong>LangGraph Python</strong>. On compare
                les traces, les scores et les sorties structurées dans MLflow,
                Phoenix et Langfuse.
              </p>
            </div>
            <div className="method-card">
              <strong>Chemin de validation</strong>
              <span>
                Playground → LangGraph Python configuré → dashboard
                observability.
              </span>
            </div>
          </div>
        </header>

        <form className="obs-layout" onSubmit={submit}>
          <section className="card stack control-card">
            <SectionTitle step="1" title="Outil à comparer" />

            <div
              className="choice-grid"
              role="radiogroup"
              aria-label="Outil de suivi"
            >
              {observabilities.map((item) => (
                <button
                  key={item.id}
                  className={`choice ${observability === item.id ? "choice-active" : ""}`}
                  type="button"
                  onClick={() => selectObservability(item.id)}
                >
                  <strong>{item.label}</strong>
                  <span>{item.endpoint}</span>
                </button>
              ))}
            </div>

            <div className="runtime-strip">
              <span>Runtime de référence</span>
              <strong>LangGraph Python</strong>
              <code>{selectedObs.endpoint}</code>
            </div>

            <p className="note">{selectedObs.description}</p>

            <label className="field">
              <span>Modèle demandé</span>
              <select
                value={llmGateway}
                onChange={(event) =>
                  selectModel(event.target.value as LlmGateway)
                }
              >
                {llmPresets.map((item) => (
                  <option key={item.gateway} value={item.gateway}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="field">
              <span>Nom exact du modèle</span>
              <input
                value={llmModel}
                onChange={(event) => setLlmModel(event.target.value)}
              />
            </label>
          </section>

          <section className="card stack scenario-card">
            <SectionTitle
              step="2"
              title={
                testMode === "turn" ? "Scénario AnSu" : "Évaluation structurée"
              }
            />

            <div
              className="choice-grid two-choice"
              role="radiogroup"
              aria-label="Type de test"
            >
              <button
                className={`choice ${testMode === "turn" ? "choice-active" : ""}`}
                type="button"
                onClick={() => selectTestMode("turn")}
              >
                <strong>Tour agentique</strong>
                <span>Réponse agent, tool calls, score</span>
              </button>
              <button
                className={`choice ${testMode === "assessment" ? "choice-active" : ""}`}
                type="button"
                onClick={() => selectTestMode("assessment")}
              >
                <strong>Évaluation structurée</strong>
                <span>JSON métier pour B5</span>
              </button>
            </div>

            {testMode === "turn" ? (
              <>
                <label className="field">
                  <span>Scénario</span>
                  <select
                    value={scenarioId}
                    onChange={(event) =>
                      selectScenario(event.target.value as ScenarioId)
                    }
                  >
                    {scenarios.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="field grow-field">
                  <span>Message élève</span>
                  <textarea
                    rows={7}
                    value={message}
                    onChange={(event) => setMessage(event.target.value)}
                  />
                </label>
              </>
            ) : (
              <>
                <p className="note">
                  Ce mode appelle l’endpoint structured output du runtime et
                  retourne un objet `NotionAssessment` validé par schéma.
                </p>
                <label className="field grow-field">
                  <span>Transcript à évaluer</span>
                  <textarea
                    rows={9}
                    value={transcriptText}
                    onChange={(event) => setTranscriptText(event.target.value)}
                  />
                </label>
              </>
            )}

            <div className="split">
              <label className="field">
                <span>Session</span>
                <input
                  value={sessionId}
                  onChange={(event) => setSessionId(event.target.value)}
                />
              </label>
              <label className="field">
                <span>Utilisateur</span>
                <input
                  value={userId}
                  onChange={(event) => setUserId(event.target.value)}
                />
              </label>
            </div>

            <button className="button" disabled={loading} type="submit">
              {loading
                ? "Exécution en cours…"
                : testMode === "turn"
                  ? `Lancer dans ${selectedObs.label}`
                  : `Évaluer dans ${selectedObs.label}`}
            </button>
          </section>

          <section className="card stack result-card">
            <SectionTitle step="3" title="Résultat" />

            {response?.error ? (
              <div className="error-box">{String(response.error)}</div>
            ) : null}

            <div className="answer">
              <span>
                {testMode === "turn" ? "Réponse agent" : "Sortie structurée"}
              </span>
              {testMode === "turn" ? (
                <p>{answer ?? "Aucun test lancé."}</p>
              ) : assessment ? (
                <pre>{JSON.stringify(assessment, null, 2)}</pre>
              ) : (
                <p>Aucune évaluation lancée.</p>
              )}
            </div>

            <div className="metrics">
              {testMode === "turn" ? (
                <Metric
                  label="Score"
                  value={response?.runtime?.score?.score ?? "—"}
                />
              ) : (
                <Metric
                  label="Schéma"
                  value={response?.runtime?.schemaValidated ? "validé" : "—"}
                />
              )}
              <Metric
                label="Runtime"
                value={response?.runtime?.runtime ?? "langgraph-python"}
              />
              <Metric label="Trace" value={response?.trace?.status ?? "—"} />
            </div>

            <div className="evidence">
              <div>
                <span>Dashboard</span>
                <strong>
                  {response?.trace?.provider ?? selectedObs.label}
                </strong>
              </div>
              {response?.trace?.traceId ? (
                <code>{response.trace.traceId}</code>
              ) : (
                <p className="muted">TraceId en attente.</p>
              )}
              <div className="link-row">
                {response?.trace?.url ? (
                  <a href={response.trace.url} target="_blank" rel="noreferrer">
                    Ouvrir la trace
                  </a>
                ) : null}
                <a
                  href={selectedObs.dashboard}
                  target="_blank"
                  rel="noreferrer"
                >
                  Ouvrir {selectedObs.label}
                </a>
              </div>
              {response?.trace?.message ? (
                <p className="muted">{response.trace.message}</p>
              ) : null}
            </div>

            <details className="details">
              <summary>Données techniques</summary>
              <div className="details-content">
                <pre>
                  {JSON.stringify(
                    { payload: technicalPayload, response },
                    null,
                    2,
                  )}
                </pre>
              </div>
            </details>
          </section>
        </form>
      </div>
    </main>
  );
}

function SectionTitle({ step, title }: { step: string; title: string }) {
  return (
    <div className="section-title">
      <span>{step}</span>
      <h2>{title}</h2>
    </div>
  );
}

function Metric({
  label,
  value,
}: {
  label: string | number;
  value: string | number;
}) {
  return (
    <div className="metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
