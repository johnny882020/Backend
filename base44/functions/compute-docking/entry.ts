// Computes a real DiffDock binding pose and Boltz2 binding-affinity prediction
// for one Drug against its Scenario's molecular target, using NVIDIA BioNeMo
// hosted NIMs, and writes the results back onto the Drug entity.
import { createClientFromRequest } from "npm:@base44/sdk";
import { fetchReceptor } from "../../shared/pdb.ts";
import { runDiffDock, runBoltz2Affinity } from "../../shared/docking.ts";

interface RequestBody {
  drugId: string;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { drugId } = (await req.json()) as RequestBody;
    if (!drugId) {
      return Response.json({ error: "drugId is required" }, { status: 400 });
    }

    const NGC_API_KEY = Deno.env.get("NGC_API_KEY");
    if (!NGC_API_KEY) {
      return Response.json({ error: "NGC_API_KEY secret is not configured" }, { status: 500 });
    }

    const drug = await base44.asServiceRole.entities.Drug.get(drugId);
    if (!drug) return Response.json({ error: `Drug ${drugId} not found` }, { status: 404 });
    const scenario = await base44.asServiceRole.entities.Scenario.get(drug.scenario_id);
    if (!scenario) return Response.json({ error: `Scenario ${drug.scenario_id} not found` }, { status: 404 });

    const receptor = await fetchReceptor(scenario.target_pdb_id);
    const { bestPoseSdf, dockingConfidence } = await runDiffDock(NGC_API_KEY, receptor.atomText, drug.smiles);
    const { affinityPic50, affinityProbabilityBinding } = await runBoltz2Affinity(
      NGC_API_KEY,
      receptor.sequence,
      drug.smiles
    );

    const updated = await base44.asServiceRole.entities.Drug.update(drugId, {
      docking_confidence: dockingConfidence,
      best_pose_sdf: bestPoseSdf,
      affinity_pic50: affinityPic50,
      affinity_probability_binding: affinityProbabilityBinding,
      computed_at: new Date().toISOString(),
    });

    return Response.json({ success: true, drug: updated });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
});
