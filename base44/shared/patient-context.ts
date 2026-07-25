// Mirrors src/lib/patientContext.js — same flags, same constants, same
// formula — so the server-generated report's numbers match what the UI
// shows. Kept in sync manually since one runs in the browser and one in Deno.
const PENALTY_MULTIPLIER = 8;
const BONUS_POINTS = 10;
const SEVERITY_WEIGHT: Record<string, number> = { common: 0.3, serious: 1, black_box: 3 };

export const RISK_FLAGS = [
  { id: "cardiac_risk", label: "Cardiac history / QT risk", kind: "penalty", keywords: ["qt", "cardiac", "arterial", "hypertension", "heart", "bradycardia"] },
  { id: "hepatic_impairment", label: "Hepatic impairment", kind: "penalty", keywords: ["hepato", "liver"] },
  { id: "renal_impairment", label: "Renal impairment", kind: "penalty", keywords: ["renal", "kidney"] },
  { id: "cns_involvement", label: "CNS involvement / brain metastases", kind: "bonus", keywords: ["cns", "brain", "blood-brain"] },
  { id: "resistance_concern", label: "Prior TKI exposure / resistance concern", kind: "bonus", keywords: ["resistance", "gatekeeper", "solvent-front", "t790m", "t315i", "g1202r"] },
] as const;

function textMatchesAny(text: string | undefined, keywords: readonly string[]): boolean {
  const lower = (text ?? "").toLowerCase();
  return keywords.some((kw) => lower.includes(kw));
}

export function adjustForPatientContext(drug: any, activeFlagIds: string[]) {
  if (drug.composite_score == null || !activeFlagIds || activeFlagIds.length === 0) return null;
  let penalty = 0;
  let bonus = 0;
  const matchedFlagLabels: string[] = [];

  for (const flagId of activeFlagIds) {
    const flag = RISK_FLAGS.find((f) => f.id === flagId);
    if (!flag) continue;
    if (flag.kind === "penalty") {
      const matched = (drug.adverse_effects ?? []).filter((ae: any) => textMatchesAny(ae.effect, flag.keywords));
      if (matched.length > 0) {
        const weight = matched.reduce((sum: number, ae: any) => sum + (SEVERITY_WEIGHT[ae.severity] ?? 0), 0);
        penalty += weight * PENALTY_MULTIPLIER;
        matchedFlagLabels.push(flag.label);
      }
    } else if (textMatchesAny(drug.mechanism_summary, flag.keywords)) {
      bonus += BONUS_POINTS;
      matchedFlagLabels.push(flag.label);
    }
  }

  const adjustedScore = Math.max(0, Math.min(100, Math.round(drug.composite_score - penalty + bonus)));
  return { penalty, bonus, adjustedScore, matchedFlagLabels };
}
