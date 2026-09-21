import { createHash } from "node:crypto";
import type { RoleKey } from "@prisma/client";
import { db } from "@/lib/db";
import { createKnowledgeClient, knowledgeMode } from "@/server/clients/knowledge";
import type { Answer, CorpusEntry } from "@/server/clients/knowledge/types";
import { appendAuditEvent } from "./audit";

const CACHE_TTL_MS = 60_000;
const cache = new Map<string, { at: number; answer: Answer }>();

function hashQuestion(q: string, role: RoleKey, ctx?: string): string {
  return createHash("sha1").update(`${role}::${ctx ?? ""}::${q}`).digest("hex");
}

export async function askKnowledge(input: {
  question: string;
  actor: { id: string; role: RoleKey };
  context?: string;
}): Promise<{ answer: Answer; mode: "oip" | "local"; cached: boolean }> {
  const mode = knowledgeMode();
  const key = hashQuestion(input.question, input.actor.role, input.context);

  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) {
    return { answer: hit.answer, mode, cached: true };
  }

  const client = createKnowledgeClient(input.actor);
  const answer = await client.answer({
    question: input.question,
    roleScope: input.actor.role,
    context: input.context,
  });

  // Reject / retry once on zero-citation answers — grounded means grounded.
  if (answer.citations.length === 0) {
    // Not treated as an error; UI shows the "insufficient grounding" message.
    void appendAuditEvent({
      actorId: input.actor.id,
      actorRole: input.actor.role,
      action: "knowledge.insufficient_grounding",
      resourceType: "knowledge.question",
      meta: { question: input.question, mode },
    });
  } else {
    // Validate every citation ID actually exists (protects against a
    // remote model hallucinating chunk IDs).
    const ids = answer.citations.map((c) => c.chunkId);
    const rows = await db.documentChunk.findMany({
      where: { id: { in: ids } },
      select: { id: true },
    });
    const valid = new Set(rows.map((r) => r.id));
    answer.citations = answer.citations.filter((c) => valid.has(c.chunkId));
    if (answer.citations.length === 0) {
      void appendAuditEvent({
        actorId: input.actor.id,
        actorRole: input.actor.role,
        action: "knowledge.hallucinated_citations",
        resourceType: "knowledge.question",
        meta: { question: input.question, mode, provided: ids },
      });
      answer.answer =
        "I couldn't produce a citation-backed answer. Please rephrase or check the corpus panel.";
    }
  }

  await db.aiInteraction.create({
    data: {
      kind: "answer",
      model: answer.modelId ?? mode,
      promptHash: key,
      citations: answer.citations as unknown as object[],
      userId: input.actor.id,
    },
  });

  cache.set(key, { at: Date.now(), answer });
  return { answer, mode, cached: false };
}

export async function listCorpusFor(role: RoleKey): Promise<CorpusEntry[]> {
  const client = createKnowledgeClient({ id: "system", role });
  return client.listCorpus(role);
}

export const SUGGESTED_QUESTIONS: Array<{ label: string; question: string }> = [
  {
    label: "LSS-204 emergency procedure",
    question:
      "What is the emergency procedure when LSS-204 dissolved oxygen drops below 6.0 mg/L?",
  },
  {
    label: "Pump history",
    question: "When was the LSS-204 shaft seal last replaced and why?",
  },
  {
    label: "Escalation policy",
    question: "Who needs to be notified for a critical alert on an aquatic life-support system?",
  },
];
