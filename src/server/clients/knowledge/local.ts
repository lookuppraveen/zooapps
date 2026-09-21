import type { RoleKey } from "@prisma/client";
import { db } from "@/lib/db";
import type {
  Answer,
  Citation,
  CorpusEntry,
  KnowledgeClient,
  Passage,
} from "./types";

/**
 * In-process KnowledgeClient — active while the real OIP endpoint is
 * unavailable (I3: OpenAPI specs pending). Backs onto the `documents` +
 * `document_chunks` tables populated by `scripts/upload-corpus.ts`.
 *
 * Retrieval: keyword-overlap scoring (tokenize, lowercase, dedup, dice
 * coefficient against each chunk). Not semantic — good enough for the
 * curated demo corpus. Every returned passage has a real `chunkId` that
 * exists in Postgres, so citations validate against a live row.
 *
 * Answer synthesis: the top-scoring passage's text is returned verbatim
 * with the retrieved chunks as citations. When ANTHROPIC_API_KEY lands
 * we can rewrite this to call Claude with the same passages — the
 * KnowledgeService interface doesn't change.
 */

function tokenize(s: string): string[] {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s\-.:/]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length >= 2 && !STOP.has(t));
}
const STOP = new Set([
  "the", "a", "an", "of", "to", "and", "or", "for", "in", "on", "at", "by",
  "is", "are", "was", "were", "be", "been", "being", "as", "if", "then",
  "with", "from", "this", "that", "it", "its", "i", "we", "you", "our", "not",
  "no", "do", "does", "did", "so", "such", "than", "into", "over",
]);

function score(qTokens: string[], text: string): number {
  const tTokens = tokenize(text);
  if (tTokens.length === 0 || qTokens.length === 0) return 0;
  const tSet = new Set(tTokens);
  let overlap = 0;
  for (const q of qTokens) if (tSet.has(q)) overlap++;
  // Dice coefficient
  return (2 * overlap) / (qTokens.length + tTokens.length);
}

export class LocalKnowledgeClient implements KnowledgeClient {
  async listCorpus(roleScope: RoleKey): Promise<CorpusEntry[]> {
    const docs = await db.document.findMany({
      where: { roleScope: { has: roleScope } },
      include: { _count: { select: { chunks: true } } },
      orderBy: { title: "asc" },
    });
    return docs.map((d) => ({
      documentId: d.id,
      title: d.title,
      source: d.source,
      indexStatus: d.indexStatus,
      indexedAt: d.indexedAt?.toISOString() ?? null,
      chunkCount: d._count.chunks,
    }));
  }

  async search(input: {
    query: string;
    roleScope: RoleKey;
    limit?: number;
  }): Promise<Passage[]> {
    const limit = input.limit ?? 6;
    const qTokens = Array.from(new Set(tokenize(input.query)));
    if (qTokens.length === 0) return [];

    const chunks = await db.documentChunk.findMany({
      where: { roleScope: { has: input.roleScope } },
      include: { document: { select: { id: true, title: true } } },
    });

    const scored = chunks
      .map((c) => ({
        chunk: c,
        s: score(qTokens, `${c.section} ${c.text}`),
      }))
      .filter((x) => x.s > 0)
      .sort((a, b) => b.s - a.s)
      .slice(0, limit);

    return scored.map(
      ({ chunk, s }): Passage => ({
        chunkId: chunk.id,
        documentId: chunk.document.id,
        documentTitle: chunk.document.title,
        section: chunk.section,
        text: chunk.text,
        score: Number(s.toFixed(4)),
      }),
    );
  }

  async answer(input: {
    question: string;
    roleScope: RoleKey;
    context?: string;
  }): Promise<Answer> {
    const q = input.context ? `${input.context}\n\n${input.question}` : input.question;
    const passages = await this.search({
      query: q,
      roleScope: input.roleScope,
      limit: 4,
    });

    if (passages.length === 0) {
      return {
        answer: "I couldn't find grounded information in the indexed corpus to answer this. Please rephrase or check the corpus panel to see which documents are indexed.",
        citations: [],
        confidence: 0,
        modelId: "local-keyword-v1",
      };
    }

    const top = passages[0]!;
    // Concise answer: lead with the top passage, then a supporting line
    // from the next passage if it comes from a different document.
    let body = top.text.trim();
    if (passages.length > 1) {
      const supp = passages.find((p) => p.documentId !== top.documentId);
      if (supp) body += `\n\nAdditionally: ${supp.text.trim()}`;
    }

    const citations: Citation[] = passages.slice(0, 3).map((p) => ({
      chunkId: p.chunkId,
      documentId: p.documentId,
      documentTitle: p.documentTitle,
      section: p.section,
      snippet: p.text.slice(0, 240),
    }));

    return {
      answer: body,
      citations,
      confidence: Math.min(1, top.score * 2),
      modelId: "local-keyword-v1",
    };
  }
}
