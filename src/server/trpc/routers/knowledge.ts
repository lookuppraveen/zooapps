import { z } from "zod";
import { router, moduleProcedure } from "../init";
import { knowledgeMode } from "@/server/clients/knowledge";
import { askKnowledge, listCorpusFor, SUGGESTED_QUESTIONS } from "@/server/services/knowledge";

const read = moduleProcedure("knowledge", "read");
const act = moduleProcedure("knowledge", "act");

export const knowledgeRouter = router({
  mode: read.query(() => ({ mode: knowledgeMode() })),

  corpus: read.query(async ({ ctx }) => {
    return listCorpusFor(ctx.user.role);
  }),

  suggestions: read.query(() => SUGGESTED_QUESTIONS),

  ask: act
    .input(
      z.object({
        question: z.string().min(3).max(500),
        context: z.string().max(500).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const result = await askKnowledge({
        question: input.question,
        context: input.context,
        actor: { id: ctx.user.id, role: ctx.user.role },
      });
      return result;
    }),
});
