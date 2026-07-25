// Runs compute-docking (DiffDock + Boltz2) for every Drug that doesn't yet
// have results, then computes a transparent per-scenario composite_score:
//
//   composite = 100 * clamp(0.45 * pic50_norm + 0.35 * docking_norm + 0.20 * (1 - adverse_norm))
//
// where each *_norm is min-max normalized across the drugs within the same
// scenario (comparisons only make sense within a scenario, since different
// targets have different affinity/confidence scales), and adverse_norm is a
// severity-weighted adverse-effect burden (black_box=3, serious=1, common=0.3)
// normalized the same way.

const SEVERITY_WEIGHT: Record<string, number> = { common: 0.3, serious: 1, black_box: 3 };

async function computeDrug(drugId: string, name: string) {
  const res = await base44.functions.invoke("compute-docking", { drugId });
  if (res.status !== 200) {
    console.error(`FAILED ${name}: ${JSON.stringify(res.data)}`);
    return false;
  }
  console.log(
    `OK ${name}: docking_confidence=${res.data.drug.docking_confidence?.toFixed(3)} ` +
      `pIC50=${res.data.drug.affinity_pic50?.toFixed(2)} ` +
      `P(bind)=${res.data.drug.affinity_probability_binding?.toFixed(3)}`
  );
  return true;
}

function adverseBurden(drug: any): number {
  return (drug.adverse_effects ?? []).reduce(
    (sum: number, ae: any) => sum + (SEVERITY_WEIGHT[ae.severity] ?? 0),
    0
  );
}

function minMaxNorm(values: number[], value: number): number {
  const min = Math.min(...values);
  const max = Math.max(...values);
  if (max === min) return 0.5;
  return (value - min) / (max - min);
}

async function main() {
  const scenarios = await base44.entities.Scenario.list();
  const allDrugs = await base44.entities.Drug.list();

  for (const scenario of scenarios) {
    const drugs = allDrugs.filter((d: any) => d.scenario_id === scenario.id);
    console.log(`\n=== ${scenario.name} (${drugs.length} drugs) ===`);
    for (const drug of drugs) {
      if (drug.docking_confidence !== null && drug.docking_confidence !== undefined) {
        console.log(`skip ${drug.name} (already computed)`);
        continue;
      }
      const ok = await computeDrug(drug.id, drug.name);
      if (!ok) continue;
    }
  }

  console.log("\n=== Computing composite scores per scenario ===");
  for (const scenario of scenarios) {
    const drugs = await base44.entities.Drug.filter({ scenario_id: scenario.id });
    const computed = drugs.filter((d: any) => d.docking_confidence != null && d.affinity_pic50 != null);
    if (computed.length === 0) {
      console.log(`${scenario.name}: no computed drugs, skipping`);
      continue;
    }
    const pic50s = computed.map((d: any) => d.affinity_pic50);
    const dockings = computed.map((d: any) => d.docking_confidence);
    const burdens = computed.map((d: any) => adverseBurden(d));

    for (const drug of computed) {
      const pic50Norm = minMaxNorm(pic50s, drug.affinity_pic50);
      const dockingNorm = minMaxNorm(dockings, drug.docking_confidence);
      const adverseNorm = minMaxNorm(burdens, adverseBurden(drug));
      const raw = 0.45 * pic50Norm + 0.35 * dockingNorm + 0.2 * (1 - adverseNorm);
      const composite = Math.round(100 * Math.min(1, Math.max(0, raw)));
      await base44.entities.Drug.update(drug.id, { composite_score: composite });
      console.log(`${drug.name}: composite_score=${composite}`);
    }
  }

  console.log("\nDone.");
}

await main();
