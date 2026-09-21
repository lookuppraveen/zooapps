import { z } from "zod";
import type { RoleKey } from "@prisma/client";

/**
 * Hand-drafted contract for the OIP document intelligence service.
 * Zod schemas so we get runtime validation of every response — critical
 * when talking to an external system whose OpenAPI spec is still incoming.
 * When the real spec arrives, regenerate this file and the shape of the
 * app never changes.
 */

export const CitationSchema = z.object({
  chunkId: z.string(),
  documentId: z.string(),
  documentTitle: z.string(),
  section: z.string(),
  snippet: z.string().max(500),
});
export type Citation = z.infer<typeof CitationSchema>;

export const PassageSchema = z.object({
  chunkId: z.string(),
  documentId: z.string(),
  documentTitle: z.string(),
  section: z.string(),
  text: z.string(),
  score: z.number(),
});
export type Passage = z.infer<typeof PassageSchema>;

export const AnswerSchema = z.object({
  answer: z.string(),
  citations: z.array(CitationSchema),
  confidence: z.number().min(0).max(1).optional(),
  modelId: z.string().optional(),
});
export type Answer = z.infer<typeof AnswerSchema>;

export const CorpusEntrySchema = z.object({
  documentId: z.string(),
  title: z.string(),
  source: z.string(),
  indexStatus: z.enum(["pending", "indexing", "ready", "failed"]),
  indexedAt: z.string().nullable(),
  chunkCount: z.number().int(),
});
export type CorpusEntry = z.infer<typeof CorpusEntrySchema>;

/**
 * Adapter interface. Any implementation (real HTTP OIP client, local
 * in-process client, msw mock) must satisfy this shape.
 */
export interface KnowledgeClient {
  /** List all corpus entries visible to the given role. */
  listCorpus(roleScope: RoleKey): Promise<CorpusEntry[]>;

  /** Semantic search — top-k passages within role scope. */
  search(input: {
    query: string;
    roleScope: RoleKey;
    limit?: number;
  }): Promise<Passage[]>;

  /** Grounded answer — synthesized text + citations. */
  answer(input: {
    question: string;
    roleScope: RoleKey;
    context?: string; // scenario / asset context to bias retrieval
  }): Promise<Answer>;
}
