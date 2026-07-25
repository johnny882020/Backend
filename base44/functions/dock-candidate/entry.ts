// Live, on-demand docking for a drug NOT in the curated dataset. Unlike
// compute-docking, this never writes to the Drug entity — the result lives
// only in the requesting browser's session, so anonymous free-text input
// can't create permanent public records. Same real DiffDock + Boltz2
// computation as the curated drugs, just not persisted.
import { createClientFromRequest } from "npm:@base44/sdk";
import { generateText } from "npm:ai@7.0.16";
import { createOpenAICompatible } from "npm:@ai-sdk/openai-compatible@3.0.5";
import { fetchReceptor } from "../../shared/pdb.ts";
import { runDiffDock, runBoltz2Affinity } from "../../shared/docking.ts";
import { fetchPubChemSmiles } from "../../shared/pubchem.ts";

const MODEL_ID = "claude_sonnet_4_6";

interface RequestBody {
  scenarioId: string;
  drugName: string;
}

async function describeMechanism(base44: any, drugName: string, targetName: string): Promise<string> {
  try {
    const { baseURL, token } = base44.asServiceRole.aiGateway.connection();
    const base44Models = createOpenAICompatible({ name: "base44", baseURL, apiKey: token });
    const { text } = await generateText({
      model: base44Models(MODEL_ID),
      system:
        "You are a pharmacology reference assistant. Answer in exactly one factual sentence about the drug's known mechanism of action, if you know it. If you are not confident, say plainly that you don't have reliable information rather than guessing.",
      messages: [{ role: "user", content: `What is ${drugName}'s mechanism of action relevant to ${targetName}?` }],
    });
    return text;
  } catch {
    return "AI-generated description unavailable right now — verify this drug's mechanism of action independently.";
  }
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { scenarioId, drugName } = (await req.json()) as RequestBody;
    if (!scenarioId || !drugName?.trim()) {
      return Response.json({ error: "scenarioId and drugName are required" }, { status: 400 });
    }

    const NGC_API_KEY = Deno.env.get("NGC_API_KEY");
    if (!NGC_API_KEY) {
      return Response.json({ error: "NGC_API_KEY secret is not configured" }, { status: 500 });
    }

    const scenario = await base44.asServiceRole.entities.Scenario.get(scenarioId);
    if (!scenario) return Response.json({ error: `Scenario ${scenarioId} not found` }, { status: 404 });

    const { cid, smiles } = await fetchPubChemSmiles(drugName.trim());
    const receptor = await fetchReceptor(scenario.target_pdb_id);
    const { bestPoseSdf, dockingConfidence } = await runDiffDock(NGC_API_KEY, receptor.atomText, smiles);
    const { affinityPic50, affinityProbabilityBinding } = await runBoltz2Affinity(
      NGC_API_KEY,
      receptor.sequence,
      smiles
    );
    const mechanismSummary = await describeMechanism(base44, drugName.trim(), scenario.target_name);

    return Response.json({
      name: drugName.trim(),
      brand_name: "",
      drug_class: "Investigational — user-submitted candidate",
      approval_status: "investigational",
      pubchem_cid: cid,
      smiles,
      mechanism_summary: mechanismSummary,
      adverse_effects: [],
      black_box_warning: "",
      docking_confidence: dockingConfidence,
      best_pose_sdf: bestPoseSdf,
      affinity_pic50: affinityPic50,
      affinity_probability_binding: affinityProbabilityBinding,
      composite_score: null,
      data_source: `Target: RCSB PDB ${scenario.target_pdb_id}. Drug: PubChem CID ${cid}. Computed live for this session — not part of the curated dataset; mechanism/adverse-effect text is AI-generated or unavailable, not sourced from FDA prescribing information.`,
      computed_at: new Date().toISOString(),
      is_candidate: true,
    });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
});
