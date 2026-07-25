// Mirrors the composite_score formula computed server-side in
// scripts/compute-all.ts, so the UI can show a transparent "why this score"
// breakdown without needing the sub-scores persisted separately.
const SEVERITY_WEIGHT = { common: 0.3, serious: 1, black_box: 3 };

function adverseBurden(drug) {
  return (drug.adverse_effects ?? []).reduce((sum, ae) => sum + (SEVERITY_WEIGHT[ae.severity] ?? 0), 0);
}

function minMaxNorm(values, value) {
  const min = Math.min(...values);
  const max = Math.max(...values);
  if (max === min) return 0.5;
  return (value - min) / (max - min);
}

/**
 * Returns null if the drug or its scenario-mates don't have computed data
 * yet, or if `drug` is a session-only candidate (never scored — no curated
 * adverse-effect data exists to weigh safety, so a composite would be
 * misleading, not just incomplete). Candidates are also excluded from the
 * normalization pool so they can't skew curated drugs' scores.
 */
export function computeScoreBreakdown(drug, scenarioDrugs) {
  if (drug.is_candidate) return null;
  const computed = scenarioDrugs.filter(
    (d) => !d.is_candidate && d.docking_confidence != null && d.affinity_pic50 != null
  );
  if (computed.length === 0 || drug.docking_confidence == null || drug.affinity_pic50 == null) return null;

  const pic50s = computed.map((d) => d.affinity_pic50);
  const dockings = computed.map((d) => d.docking_confidence);
  const burdens = computed.map((d) => adverseBurden(d));

  const affinityNorm = minMaxNorm(pic50s, drug.affinity_pic50);
  const dockingNorm = minMaxNorm(dockings, drug.docking_confidence);
  const safetyNorm = 1 - minMaxNorm(burdens, adverseBurden(drug));

  return { affinityNorm, dockingNorm, safetyNorm };
}
