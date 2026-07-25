// Anonymous-capable chat with the oncology advisor. Replaces the old
// base44.agents-based conversation (which requires a logged-in user) with a
// direct call to Base44's AI Gateway via the service-role connection, so
// visitors don't have to sign in to ask a question.
import { createClientFromRequest } from "npm:@base44/sdk";
import { generateText } from "npm:ai@7.0.16";
import { createOpenAICompatible } from "npm:@ai-sdk/openai-compatible@3.0.5";
import { ONCOLOGY_SYSTEM_PROMPT, buildGroundingContext } from "../../shared/oncology-prompt.ts";

// Base44's AI Gateway on this app's current plan does not expose any Claude
// Opus model (confirmed via direct probing — Opus IDs return 404
// model_not_found, not a quota error). claude_sonnet_4_6 is the strongest
// model actually available; automatic is Base44's cheapest default.
const MODEL_ID = "claude_sonnet_4_6";

interface RequestBody {
  scenarioId: string;
  question: string;
  history?: { role: "user" | "assistant"; content: string }[];
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { scenarioId, question, history } = (await req.json()) as RequestBody;
    if (!scenarioId || !question) {
      return Response.json({ error: "scenarioId and question are required" }, { status: 400 });
    }

    const scenario = await base44.asServiceRole.entities.Scenario.get(scenarioId);
    if (!scenario) return Response.json({ error: `Scenario ${scenarioId} not found` }, { status: 404 });
    const drugs = await base44.asServiceRole.entities.Drug.filter({ scenario_id: scenarioId });

    const { baseURL, token } = base44.asServiceRole.aiGateway.connection();
    const base44Models = createOpenAICompatible({ name: "base44", baseURL, apiKey: token });

    const context = buildGroundingContext(scenario, drugs);
    const messages = [
      ...(Array.isArray(history) ? history.slice(-8) : []),
      { role: "user" as const, content: question },
    ];

    const { text } = await generateText({
      model: base44Models(MODEL_ID),
      system: `${ONCOLOGY_SYSTEM_PROMPT}\n\nScenario and drug data (only cite what's here):\n${context}`,
      messages,
    });

    return Response.json({ answer: text });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
});
