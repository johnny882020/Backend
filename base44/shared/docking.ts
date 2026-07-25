// Shared DiffDock + Boltz2 calls against NVIDIA BioNeMo hosted NIMs, used by
// both compute-docking (curated drugs) and dock-candidate (on-demand).
const DIFFDOCK_URL = "https://health.api.nvidia.com/v1/biology/mit/diffdock";
const BOLTZ2_URL = "https://health.api.nvidia.com/v1/biology/mit/boltz2/predict";

export interface DockingResult {
  bestPoseSdf: string;
  dockingConfidence: number;
}

export interface AffinityResult {
  affinityPic50: number | null;
  affinityProbabilityBinding: number | null;
}

export async function runDiffDock(
  ngcApiKey: string,
  receptorAtomText: string,
  ligandSmiles: string
): Promise<DockingResult> {
  const res = await fetch(DIFFDOCK_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${ngcApiKey}` },
    body: JSON.stringify({
      protein: receptorAtomText,
      ligand: ligandSmiles,
      ligand_file_type: "txt",
      num_poses: 10,
      time_divisions: 20,
      steps: 18,
      save_trajectory: false,
    }),
  });
  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`DiffDock failed (${res.status}): ${detail.slice(0, 500)}`);
  }
  const result = await res.json();
  const bestPoseSdf: string | undefined = result.ligand_positions?.[0];
  const dockingConfidence: number | undefined = result.position_confidence?.[0];
  if (bestPoseSdf === undefined || dockingConfidence === undefined) {
    throw new Error("DiffDock returned no poses");
  }
  return { bestPoseSdf, dockingConfidence };
}

export async function runBoltz2Affinity(
  ngcApiKey: string,
  targetSequence: string,
  ligandSmiles: string
): Promise<AffinityResult> {
  const res = await fetch(BOLTZ2_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${ngcApiKey}` },
    body: JSON.stringify({
      polymers: [{ id: "A", molecule_type: "protein", sequence: targetSequence }],
      ligands: [{ id: "L1", smiles: ligandSmiles, predict_affinity: true }],
      recycling_steps: 3,
      sampling_steps: 50,
      diffusion_samples: 1,
      output_format: "mmcif",
    }),
  });
  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`Boltz2 failed (${res.status}): ${detail.slice(0, 500)}`);
  }
  const result = await res.json();
  const affinity = result.affinities?.L1;
  return {
    affinityPic50: affinity?.affinity_pic50?.[0] ?? null,
    affinityProbabilityBinding: affinity?.affinity_probability_binary?.[0] ?? null,
  };
}
