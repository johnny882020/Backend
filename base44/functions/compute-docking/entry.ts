// Computes a real DiffDock binding pose and Boltz2 binding-affinity prediction
// for one Drug against its Scenario's molecular target, using NVIDIA BioNeMo
// hosted NIMs, and writes the results back onto the Drug entity.
import { createClientFromRequest } from "npm:@base44/sdk";
import { fetchReceptor } from "../../shared/pdb.ts";

const DIFFDOCK_URL = "https://health.api.nvidia.com/v1/biology/mit/diffdock";
const BOLTZ2_URL = "https://health.api.nvidia.com/v1/biology/mit/boltz2/predict";

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
    const headers = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${NGC_API_KEY}`,
    };

    const diffdockRes = await fetch(DIFFDOCK_URL, {
      method: "POST",
      headers,
      body: JSON.stringify({
        protein: receptor.atomText,
        ligand: drug.smiles,
        ligand_file_type: "txt",
        num_poses: 10,
        time_divisions: 20,
        steps: 18,
        save_trajectory: false,
      }),
    });
    if (!diffdockRes.ok) {
      const detail = await diffdockRes.text();
      return Response.json(
        { error: `DiffDock failed (${diffdockRes.status}): ${detail.slice(0, 500)}` },
        { status: 502 }
      );
    }
    const diffdockResult = await diffdockRes.json();
    const bestPoseSdf: string = diffdockResult.ligand_positions?.[0];
    const dockingConfidence: number = diffdockResult.position_confidence?.[0];
    if (bestPoseSdf === undefined || dockingConfidence === undefined) {
      return Response.json({ error: "DiffDock returned no poses" }, { status: 502 });
    }

    const boltzRes = await fetch(BOLTZ2_URL, {
      method: "POST",
      headers,
      body: JSON.stringify({
        polymers: [{ id: "A", molecule_type: "protein", sequence: receptor.sequence }],
        ligands: [{ id: "L1", smiles: drug.smiles, predict_affinity: true }],
        recycling_steps: 3,
        sampling_steps: 50,
        diffusion_samples: 1,
        output_format: "mmcif",
      }),
    });
    if (!boltzRes.ok) {
      const detail = await boltzRes.text();
      return Response.json(
        { error: `Boltz2 failed (${boltzRes.status}): ${detail.slice(0, 500)}` },
        { status: 502 }
      );
    }
    const boltzResult = await boltzRes.json();
    const affinity = boltzResult.affinities?.L1;
    const affinityPic50: number | null = affinity?.affinity_pic50?.[0] ?? null;
    const affinityProbabilityBinding: number | null = affinity?.affinity_probability_binary?.[0] ?? null;

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
