import type { RoleKey } from "@prisma/client";
import { createKnowledgeClient } from "@/server/clients/knowledge";
import type { AgentClient, PlanStep, ResponsePlan, TaskSuggestion } from "./types";

/**
 * In-process Agent Builder fallback. Retrieves passages via the
 * KnowledgeClient (already role-scoped) and assembles a plan by mapping
 * top passages to numbered steps and to a small set of task cards.
 *
 * For the LSS-204 scenario this reliably surfaces the exact four-step
 * SOP ladder because the retrieval matches on "backup pump", "manual
 * oxygen", "notify", "document / incident". For other alerts it
 * degrades gracefully — returning whatever is grounded.
 */
export class LocalAgentClient implements AgentClient {
  async planIncidentResponse(input: {
    alert: {
      assetCode: string;
      severity: "warning" | "critical";
      message: string;
      metric?: string;
    };
    context: string;
    roleScope: RoleKey;
  }): Promise<ResponsePlan> {
    const knowledge = createKnowledgeClient({ id: "agent", role: input.roleScope });
    // Bias life-support alerts toward emergency-procedure vocabulary so the
    // plan surfaces the response ladder rather than maintenance-history
    // context. This is a stand-in for what an LLM-backed Agent Builder
    // would do with a system prompt.
    const isLifeSupport = /LSS|life-support|pump|dissolved oxygen|pressure/i.test(
      input.alert.message + " " + input.alert.assetCode,
    );
    const biasTerms = isLifeSupport
      ? " engage backup pump manual oxygen supplementation notify curator emergency procedure step"
      : "";
    const query = `${input.alert.message}${biasTerms}`;
    const passages = await knowledge.search({
      query,
      roleScope: input.roleScope,
      limit: 8,
    });

    // Prefer passages from the emergency-procedure document, ordered by
    // their section title (the SOP orders sections "Step 1 —", "Step 2 —",
    // ..., which sorts naturally).
    const primary = passages
      .filter((p) => /Step\s+\d/i.test(p.section) || /Response ladder/i.test(p.section))
      .sort((a, b) => a.section.localeCompare(b.section));

    const useForSteps = primary.length > 0 ? primary : passages.slice(0, 4);

    const steps: PlanStep[] = useForSteps.slice(0, 5).map((p, i) => ({
      ordinal: i,
      text: p.text.trim(),
      citations: [
        {
          chunkId: p.chunkId,
          documentTitle: p.documentTitle,
          section: p.section,
        },
      ],
    }));

    const tasks: TaskSuggestion[] = deriveTasks(input.alert, steps);

    const suggestedPO = isLifeSupport
      ? {
          vendor: "AquaCore Systems",
          itemDescription: `Shaft seal kit for ${input.alert.assetCode} primary pump (part LSS-SEAL-A)`,
          qty: 1,
          unitCostCents: 32_500, // $325.00 illustrative
        }
      : null;

    const summary =
      input.alert.severity === "critical"
        ? `Critical incident on ${input.alert.assetCode}: ${input.alert.message}. Engaging documented response ladder from the emergency SOP.`
        : `Alert on ${input.alert.assetCode}: ${input.alert.message}. Following escalation-policy monitoring cadence.`;

    return {
      summary,
      steps,
      tasks,
      suggestedPO,
      modelId: "local-agent-v1",
    };
  }
}

function deriveTasks(
  alert: { assetCode: string; severity: string; message: string },
  steps: PlanStep[],
): TaskSuggestion[] {
  const critical = alert.severity === "critical";
  const isLife = /LSS|life-support|pump/i.test(alert.assetCode + alert.message);

  const tasks: TaskSuggestion[] = [];

  if (isLife && critical) {
    tasks.push({
      title: `Engage backup pump ${alert.assetCode}B via transfer switch`,
      column: "in_progress",
      order: 0,
      suggestedRole: "maintenance",
    });
    tasks.push({
      title: "Begin manual O₂ supplementation if DO stays below 6.0 mg/L",
      column: "todo",
      order: 1,
      suggestedRole: "maintenance",
    });
    tasks.push({
      title: "Notify on-duty curator and Facilities Manager",
      column: "todo",
      order: 2,
      suggestedRole: "facilities_mgr",
    });
    tasks.push({
      title: "Approve replacement shaft-seal purchase order",
      column: "review",
      order: 3,
      suggestedRole: "facilities_mgr",
    });
    tasks.push({
      title: "Document incident timeline and root cause",
      column: "todo",
      order: 4,
      suggestedRole: "facilities_mgr",
    });
    return tasks;
  }

  // Generic: one task per plan step
  steps.forEach((s, i) =>
    tasks.push({
      title: (s.text.split(/\.\s|\n/)[0] ?? s.text).slice(0, 140),
      column: i === 0 ? "in_progress" : "todo",
      order: i,
      suggestedRole: "facilities_mgr",
    }),
  );
  if (tasks.length === 0) {
    tasks.push({ title: `Investigate ${alert.assetCode}`, column: "todo", order: 0 });
  }
  return tasks;
}
