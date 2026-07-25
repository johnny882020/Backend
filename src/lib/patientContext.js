// Patient-context personalization: transparent, keyword-based adjustments
// layered on top of composite_score. Deliberately simple and auditable —
// every adjustment traces to an explicit keyword match, stated here and
// shown in the UI, not a hidden model judgment.
//
// PENALTY_MULTIPLIER and BONUS_POINTS are the only "weights" in this system;
// both are named constants so the magnitude of every adjustment is visible
// in the source, not tuned invisibly.
const PENALTY_MULTIPLIER = 8; // points per matching adverse-effect severity-weight unit
const BONUS_POINTS = 10; // flat points per matching mechanism keyword

const SEVERITY_WEIGHT = { common: 0.3, serious: 1, black_box: 3 };

export const RISK_FLAGS = [
  {
    id: 'cardiac_risk',
    label: 'Cardiac history / QT risk',
    kind: 'penalty',
    keywords: ['qt', 'cardiac', 'arterial', 'hypertension', 'heart', 'bradycardia'],
  },
  {
    id: 'hepatic_impairment',
    label: 'Hepatic impairment',
    kind: 'penalty',
    keywords: ['hepato', 'liver'],
  },
  {
    id: 'renal_impairment',
    label: 'Renal impairment',
    kind: 'penalty',
    keywords: ['renal', 'kidney'],
  },
  {
    id: 'cns_involvement',
    label: 'CNS involvement / brain metastases',
    kind: 'bonus',
    keywords: ['cns', 'brain', 'blood-brain'],
  },
  {
    id: 'resistance_concern',
    label: 'Prior TKI exposure / resistance concern',
    kind: 'bonus',
    keywords: ['resistance', 'gatekeeper', 'solvent-front', 't790m', 't315i', 'g1202r'],
  },
];

function textMatchesAny(text, keywords) {
  const lower = (text ?? '').toLowerCase();
  return keywords.some((kw) => lower.includes(kw));
}

/**
 * Computes the patient-context adjustment for one drug.
 * Returns { penalty, bonus, adjustedScore, matchedFlags } or null if the
 * drug has no composite_score to adjust (candidates, or not-yet-computed).
 */
export function adjustForPatientContext(drug, activeFlagIds) {
  if (drug.composite_score == null || !activeFlagIds || activeFlagIds.length === 0) return null;

  let penalty = 0;
  let bonus = 0;
  const matchedFlags = [];

  for (const flagId of activeFlagIds) {
    const flag = RISK_FLAGS.find((f) => f.id === flagId);
    if (!flag) continue;

    if (flag.kind === 'penalty') {
      const matchedEffects = (drug.adverse_effects ?? []).filter((ae) =>
        textMatchesAny(ae.effect, flag.keywords)
      );
      if (matchedEffects.length > 0) {
        const weight = matchedEffects.reduce((sum, ae) => sum + (SEVERITY_WEIGHT[ae.severity] ?? 0), 0);
        penalty += weight * PENALTY_MULTIPLIER;
        matchedFlags.push({ flag, matchedEffects });
      }
    } else if (flag.kind === 'bonus') {
      if (textMatchesAny(drug.mechanism_summary, flag.keywords)) {
        bonus += BONUS_POINTS;
        matchedFlags.push({ flag, matchedEffects: [] });
      }
    }
  }

  const adjustedScore = Math.max(0, Math.min(100, Math.round(drug.composite_score - penalty + bonus)));
  return { penalty, bonus, adjustedScore, matchedFlags };
}

export const PATIENT_CONTEXT_FORMULA_NOTE =
  `patient_adjusted_score = clamp(composite_score − (matched adverse-effect severity weight × ${PENALTY_MULTIPLIER}) + (${BONUS_POINTS} × matched relevant-mechanism flags), 0, 100)`;
