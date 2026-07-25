// Generates a personalized, step-by-step decision report walking through
// each candidate drug and why it ranks where it does — optionally adjusted
// for patient-context risk flags supplied by the client (never persisted;
// this function is stateless like oncology-chat).
import { createClientFromRequest } from "npm:@base44/sdk";
import { generateText } from "npm:ai@7.0.16";
import { createOpenAICompatible } from "npm:@ai-sdk/openai-compatible@3.0.5";
import { ONCOLOGY_SYSTEM_PROMPT } from "../../shared/oncology-prompt.ts";
import { adjustForPatientContext, RISK_FLAGS } from "../../shared/patient-context.ts";

const MODEL_ID = "claude_sonnet_4_6";

interface RequestBody {
  scenario: { name: string; cancer_type: string; target_name: string; target_pdb_id: string; target_summary?: string };
  drugs: any[];
  patientFlags?: string[];
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { scenario, drugs, patientFlags = [] } = (await req.json()) as RequestBody;
    if (!scenario || !Array.isArray(drugs) || drugs.length === 0) {
      return Response.json({ error: "scenario and drugs are required" }, { status: 400 });
    }

    const activeFlagLabels = RISK_FLAGS.filter((f) => patientFlags.includes(f.id)).map((f) => f.label);
    const adjusted = drugs.map((d) => ({
      ...d,
      patient_adjustment: adjustForPatientContext(d, patientFlags),
    }));

    const { baseURL, token } = base44.asServiceRole.aiGateway.connection();
    const base44Models = createOpenAICompatible({ name: "base44", baseURL, apiKey: token });

    const taskInstruction = activeFlagLabels.length > 0
      ? `Write a personalized, step-by-step decision report for this patient (flagged factors: ${activeFlagLabels.join(", ")}). For each candidate drug, in ranked order (by patient_adjustment.adjustedScore when present, else composite_score), explain: (1) its raw composite score and why, (2) how the patient's flagged factors specifically shifted it (cite patient_adjustment.penalty/bonus and which flags matched), (3) the net takeaway for this patient. End with an overall summary ranking and the mandatory disclaimer.`
      : `Write a step-by-step decision report for this scenario. For each candidate drug, in ranked order by composite_score, explain its mechanism, binding data, and adverse-effect tradeoffs relative to the others. End with an overall summary and the mandatory disclaimer.`;

    const { text } = await generateText({
      model: base44Models(MODEL_ID),
      system: `${ONCOLOGY_SYSTEM_PROMPT}\n\n${taskInstruction}\n\nScenario and drug data (ground every claim in this, cite nothing else):\n${JSON.stringify(
        { scenario, drugs: adjusted }
      )}`,
      messages: [{ role: "user", content: "Generate the report now." }],
    });

    return Response.json({ report: text, generated_at: new Date().toISOString() });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
});
