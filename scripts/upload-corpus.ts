/**
 * Ingest the SOP corpus in `content/sops/*.md` into Postgres.
 *
 * When D1 flips to real OIP (env `OIP_BASE_URL` etc. present), this
 * script additionally uploads each document to OIP and stores the
 * returned `oipDocumentId` on the local `Document` row so we can
 * cross-reference OIP citations back to our records.
 *
 * Chunking: one section per H2 (`## `). Simple, deterministic, matches
 * how a human wrote the SOPs. Section title becomes the citation label.
 *
 * Idempotent — deletes chunks for a document before re-inserting.
 */

import fs from "node:fs/promises";
import path from "node:path";
import { PrismaClient, type RoleKey, IndexStatus } from "@prisma/client";

const db = new PrismaClient();
const CORPUS_DIR = path.resolve(process.cwd(), "content/sops");

type Frontmatter = {
  title: string;
  source: string;
  roleScope: RoleKey[];
};

function parseFrontmatter(raw: string): { fm: Frontmatter; body: string } {
  const m = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!m) throw new Error("Missing frontmatter");
  const yaml = m[1]!;
  const body = m[2]!;
  const fm: Partial<Frontmatter> = {};
  for (const line of yaml.split("\n")) {
    const kv = line.match(/^(\w+):\s*(.*)$/);
    if (!kv) continue;
    const key = kv[1]!;
    let value: string | string[] = kv[2]!.trim();
    if (value.startsWith("[")) {
      value = value
        .slice(1, -1)
        .split(",")
        .map((s) => s.trim().replace(/^["']|["']$/g, ""))
        .filter(Boolean);
    } else {
      value = value.replace(/^["']|["']$/g, "");
    }
    (fm as Record<string, string | string[]>)[key] = value;
  }
  if (!fm.title || !fm.source || !fm.roleScope) {
    throw new Error("Frontmatter must include title, source, roleScope");
  }
  return { fm: fm as Frontmatter, body: body.trim() };
}

function chunkBySection(body: string): Array<{ section: string; text: string }> {
  // Split on any heading (# or ##). Deep headings (### and below) stay in
  // the parent chunk. Title lives in frontmatter, so all # in the body
  // are treated as top-level sections.
  const lines = body.split("\n");
  const chunks: Array<{ section: string; text: string }> = [];
  let current: { section: string; text: string[] } | null = null;
  for (const line of lines) {
    const h = line.match(/^(#{1,2})\s+(.+)$/);
    if (h) {
      if (current) chunks.push({ section: current.section, text: current.text.join("\n").trim() });
      current = { section: h[2]!.trim(), text: [] };
      continue;
    }
    if (current) current.text.push(line);
  }
  if (current) chunks.push({ section: current.section, text: current.text.join("\n").trim() });
  return chunks.filter((c) => c.text.length > 0);
}

async function main() {
  const entries = await fs.readdir(CORPUS_DIR);
  const files = entries.filter((f) => f.endsWith(".md"));
  console.log(`Found ${files.length} SOPs in ${CORPUS_DIR}`);

  for (const file of files) {
    const raw = await fs.readFile(path.join(CORPUS_DIR, file), "utf8");
    const { fm, body } = parseFrontmatter(raw);
    const chunks = chunkBySection(body);

    const existing = await db.document.findFirst({ where: { title: fm.title } });
    const doc = existing
      ? await db.document.update({
          where: { id: existing.id },
          data: {
            source: fm.source,
            roleScope: fm.roleScope,
            indexStatus: IndexStatus.indexing,
          },
        })
      : await db.document.create({
          data: {
            title: fm.title,
            source: fm.source,
            roleScope: fm.roleScope,
            indexStatus: IndexStatus.indexing,
          },
        });

    // Wipe + reinsert chunks
    await db.documentChunk.deleteMany({ where: { documentId: doc.id } });
    let ordinal = 0;
    for (const c of chunks) {
      await db.documentChunk.create({
        data: {
          documentId: doc.id,
          section: c.section,
          ordinal: ordinal++,
          text: c.text,
          roleScope: fm.roleScope,
        },
      });
    }
    await db.document.update({
      where: { id: doc.id },
      data: { indexStatus: IndexStatus.ready, indexedAt: new Date() },
    });
    console.log(`  · ${fm.title} — ${chunks.length} chunks`);
  }

  console.log("✓ Corpus ingest complete.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
