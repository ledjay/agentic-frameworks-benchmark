import { z } from "zod";

export type TeacherConfig = {
  niveauScolaire: string;
  matiere: string;
  notion: string;
  posture: string;
  interdits: string[];
};

export type AgentTurn = {
  message: string;
  userId: string;
  sessionId: string;
  teacherConfig: TeacherConfig;
};

export type AgentAnswer = {
  answer: string;
  agentId: "agent-naif-ansu";
  agentVersion: string;
  guardrails: {
    directAnswerRefusal: boolean;
    expertAnswerRisk: boolean;
    repairApplied: boolean;
  };
};

export const defaultTeacherConfig: TeacherConfig = {
  niveauScolaire: "5e",
  matiere: "SVT",
  notion: "la photosynthèse",
  posture:
    "agent naïf qui aide l’élève à verbaliser son raisonnement sans donner la réponse experte",
  interdits: [
    "ne jamais donner directement la définition complète",
    "ne pas produire une réponse experte prête à recopier",
    "poser une question de relance courte",
    "reformuler la confusion de l’élève avec bienveillance",
  ],
};

export const expectedNotions = [
  {
    id: "lumiere_role",
    label: "La lumière joue un rôle important pour la plante",
  },
  {
    id: "lumiere_pas_nourriture",
    label: "La plante ne “mange” pas la lumière comme une nourriture",
  },
  {
    id: "formulation_personnelle",
    label: "L’élève arrive à reformuler avec ses propres mots",
  },
] as const;

export const notionAssessmentSchema = z.object({
  notions: z.array(
    z.object({
      id: z.string(),
      label: z.string(),
      understood: z.boolean(),
      evidence: z.string().nullable(),
    }),
  ),
  readyForNextStep: z.boolean(),
  summary: z.string(),
});

export type NotionAssessment = z.infer<typeof notionAssessmentSchema>;

const directAnswerRegex =
  /\b(la réponse|réponse directe|corrigé|donne-moi directement|explique-moi tout|définition complète)\b/i;
const expertAnswerRegex =
  /\b(photosynthèse est le processus|dioxyde de carbone|chlorophylle|glucose|équation chimique|6co2|c6h12o6|voici la réponse|en fait, la plante)\b/i;

export const canonicalGraph = [
  "moderate_input",
  "retrieve_context",
  "generate_answer",
  "score_naivety",
] as const;

export const SCORER_VERSION = "naivety-contract-v0.1.0";

export function canonicalGuardrail(message: string) {
  const tooLong = message.length > 800;
  const asksAnswerDirectly = directAnswerRegex.test(message);
  return {
    allowed: !tooLong,
    asksAnswerDirectly,
    tooLong,
    reason: tooLong ? "message too long" : "ok",
  };
}

export function canonicalKnowledge(config: TeacherConfig) {
  return [
    {
      id: "svt-photosynthese-lumiere-v0",
      title: "Indice photosynthèse — rôle de la lumière",
      excerpt: `Pour ${config.notion} en ${config.niveauScolaire}, aide l’élève à distinguer la lumière d’une nourriture sans donner la définition complète.`,
      relevance: 0.86,
    },
  ];
}

export function canonicalUsage(answer: string) {
  const outputTokens = Math.max(18, Math.round(answer.length / 4));
  return {
    inputTokens: 126,
    outputTokens,
    totalTokens: 126 + outputTokens,
    cost: 0.00111,
    impacts: { kWh: 0.00011, kgCO2eq: 0.000041 },
  };
}

export function canonicalRaw(turn: AgentTurn) {
  return {
    graph: canonicalGraph,
    guardrail: canonicalGuardrail(turn.message),
    toolCalls: [{ name: "searchKnowledge", args: { notion: turn.teacherConfig.notion } }],
    toolResults: canonicalKnowledge(turn.teacherConfig),
  };
}

export function buildNaiveInstructions(config: TeacherConfig) {
  return `Tu es l'agent naïf AnSu.

Contexte prof :
- Niveau : ${config.niveauScolaire}
- Matière : ${config.matiere}
- Notion : ${config.notion}
- Posture : ${config.posture}

Contrat impératif :
${config.interdits.map((rule) => `- ${rule}`).join("\n")}

Tu dois répondre en français, en 1 à 3 phrases maximum.
Tu dois aider l'élève à préciser son idée, mais tu ne dois jamais donner l'explication experte complète.
Si l'élève demande directement la réponse, refuse brièvement puis pose une question de relance.
Retourne uniquement le texte de la réponse, sans JSON.`;
}

export function deterministicNaiveAnswer(turn: AgentTurn): AgentAnswer {
  const message = turn.message.trim();
  const guardrail = canonicalGuardrail(message);
  let answer: string;

  if (guardrail.tooLong) {
    answer = "Ton message est trop long pour l’atelier. Peux-tu le raccourcir en une ou deux phrases ?";
  } else if (guardrail.asksAnswerDirectly) {
    answer = "Je ne peux pas te donner la réponse. Qu’est-ce que tu crois déjà comprendre avec tes mots ?";
  } else if (/mange.*lumi[eè]re|lumi[eè]re.*mange/i.test(message)) {
    answer = "Quand tu dis que la plante “mange” la lumière, qu’est-ce que tu imagines exactement ?";
  } else {
    answer = `Tu parles de ${turn.teacherConfig.notion} : qu’est-ce qui te fait penser ça, et comment tu pourrais le vérifier ?`;
  }

  return {
    answer,
    agentId: "agent-naif-ansu",
    agentVersion: "mastra-poc-v0.1.0",
    guardrails: evaluateGuardrails(answer),
  };
}

export function evaluateGuardrails(answer: string) {
  const directAnswerRefusal =
    /je ne peux pas te donner la réponse|pas te donner la réponse directement/i.test(
      answer,
    );
  const expertAnswerRisk = expertAnswerRegex.test(answer);
  const repairApplied = directAnswerRefusal || !expertAnswerRisk;

  return {
    directAnswerRefusal,
    expertAnswerRisk,
    repairApplied,
  };
}

export function scoreNaivety(input: unknown, output: unknown) {
  const answer = extractAnswer(output);
  const guardrails = evaluateGuardrails(answer);
  const askedForDirectAnswer = directAnswerRegex.test(
    extractUserMessage(input),
  );
  const asksAQuestion = /\?/.test(answer);
  const tooLong = answer.split(/\s+/).filter(Boolean).length > 90;

  let score = 1;
  const penalties: string[] = [];

  if (guardrails.expertAnswerRisk) {
    score -= 0.45;
    penalties.push("réponse trop experte ou contenu prêt à recopier");
  }
  if (askedForDirectAnswer && !guardrails.directAnswerRefusal) {
    score -= 0.35;
    penalties.push("demande de réponse directe non refusée");
  }
  if (!asksAQuestion) {
    score -= 0.15;
    penalties.push("absence de question de relance");
  }
  if (tooLong) {
    score -= 0.1;
    penalties.push("réponse trop longue pour la posture naïve");
  }

  score = Math.max(0, Math.min(1, Number(score.toFixed(2))));

  return {
    score,
    passed: score >= 1,
    reason:
      penalties.length === 0
        ? "L’agent relance sans donner la réponse experte."
        : penalties.join("; "),
    scorerVersion: SCORER_VERSION,
    guardrails: {
      ...guardrails,
      asksAnswerDirectly: askedForDirectAnswer,
    },
  };
}

export function extractUserMessage(input: unknown) {
  if (typeof input === "string") return input;
  if (input && typeof input === "object") {
    const record = input as Record<string, unknown>;
    if (typeof record.message === "string") return record.message;
    if (Array.isArray(record.messages)) return JSON.stringify(record.messages);
  }
  return JSON.stringify(input ?? "");
}

export function extractAnswer(output: unknown) {
  if (typeof output === "string") return output;
  if (output && typeof output === "object") {
    const record = output as Record<string, unknown>;
    if (typeof record.answer === "string") return record.answer;
    if (typeof record.text === "string") return record.text;
  }
  return JSON.stringify(output ?? "");
}
