import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { MoleculeViewer } from '@/components/MoleculeViewer';
import { ScoreBar } from '@/components/ui/score-bar';
import { computeScoreBreakdown } from '@/lib/scoring';
import { adjustForPatientContext } from '@/lib/patientContext';
import { AlertTriangle, User } from 'lucide-react';

const SEVERITY_VARIANT = { common: 'default', serious: 'amber', black_box: 'red' };

export function DrugDetail({ drug, scenario, scenarioDrugs = [], activeFlags = [] }) {
  const breakdown = computeScoreBreakdown(drug, scenarioDrugs);
  const adjustment = activeFlags.length > 0 ? adjustForPatientContext(drug, activeFlags) : null;

  return (
    <Card className="overflow-hidden">
      <div className="grid md:grid-cols-2">
        <MoleculeViewer pdbId={scenario.target_pdb_id} ligandSdf={drug.best_pose_sdf} className="h-72 md:h-full" />
        <div className="p-5">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-xl font-display font-semibold text-brand-ink">{drug.name}</h3>
            {drug.brand_name && <span className="text-sm text-slate-400">({drug.brand_name})</span>}
            <Badge variant={drug.approval_status === 'fda_approved' ? 'teal' : 'default'}>
              {drug.approval_status === 'fda_approved' ? 'FDA Approved' : 'Investigational'}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-slate-500">{drug.drug_class}</p>

          {drug.black_box_warning && (
            <div className="mt-3 flex items-start gap-2 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-800">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span><strong>Black box warning:</strong> {drug.black_box_warning}</span>
            </div>
          )}

          <h4 className="mt-4 text-xs font-semibold uppercase tracking-wide text-slate-400">Mechanism of action</h4>
          <p className="mt-1 text-sm text-slate-700">{drug.mechanism_summary}</p>

          <h4 className="mt-4 text-xs font-semibold uppercase tracking-wide text-slate-400">Adverse effects</h4>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {(drug.adverse_effects ?? []).map((ae) => (
              <Badge key={ae.effect} variant={SEVERITY_VARIANT[ae.severity] ?? 'default'} title={ae.notes}>
                {ae.effect}
              </Badge>
            ))}
          </div>

          {breakdown ? (
            <div className="mt-5">
              <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2">
                Why this score &middot; relative to other candidates for this scenario
              </h4>
              <div className="space-y-2.5 rounded-lg border border-slate-100 bg-slate-50/60 p-3">
                <ScoreBar
                  label="Binding affinity (45%)"
                  value={breakdown.affinityNorm * 100}
                  formatValue={(v) => `${Math.round(v)}`}
                />
                <ScoreBar
                  label="Docking confidence (35%)"
                  value={breakdown.dockingNorm * 100}
                  formatValue={(v) => `${Math.round(v)}`}
                />
                <ScoreBar
                  label="Adverse-effect safety (20%)"
                  value={breakdown.safetyNorm * 100}
                  formatValue={(v) => `${Math.round(v)}`}
                />
              </div>
            </div>
          ) : (
            <div className="mt-4 grid grid-cols-3 gap-3 text-center">
              <div className="rounded-lg bg-slate-50 py-2">
                <div className="text-[11px] text-slate-400">Docking conf.</div>
                <div className="text-sm font-mono text-slate-800">{drug.docking_confidence?.toFixed(2) ?? '—'}</div>
              </div>
              <div className="rounded-lg bg-slate-50 py-2">
                <div className="text-[11px] text-slate-400">pIC50</div>
                <div className="text-sm font-mono text-slate-800">{drug.affinity_pic50?.toFixed(2) ?? '—'}</div>
              </div>
              <div className="rounded-lg bg-slate-50 py-2">
                <div className="text-[11px] text-slate-400">Composite</div>
                <div className="text-sm font-mono text-slate-800">{drug.composite_score?.toFixed(0) ?? '—'}</div>
              </div>
            </div>
          )}

          {adjustment && (
            <div className="mt-4 rounded-lg border border-brand-teal/20 bg-brand-tealLight/30 px-3 py-2.5">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-brand-ink">
                <User className="w-3.5 h-3.5 text-brand-teal" />
                Patient-adjusted: {drug.composite_score} &rarr; {adjustment.adjustedScore}{' '}
                <span className={adjustment.adjustedScore >= drug.composite_score ? 'text-emerald-600' : 'text-red-500'}>
                  ({adjustment.adjustedScore >= drug.composite_score ? '+' : ''}{adjustment.adjustedScore - drug.composite_score})
                </span>
              </div>
              {adjustment.matchedFlags.length > 0 ? (
                <ul className="mt-1.5 text-xs text-slate-600 space-y-0.5">
                  {adjustment.matchedFlags.map(({ flag, matchedEffects }, i) => (
                    <li key={i}>
                      &bull; {flag.label}: {flag.kind === 'penalty'
                        ? `matches ${matchedEffects.map((ae) => ae.effect).join(', ')}`
                        : 'relevant to this mechanism'}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-1 text-xs text-slate-500">No flagged factors matched this drug's known effects/mechanism.</p>
              )}
            </div>
          )}

          <p className="mt-4 text-[11px] text-slate-400">{drug.data_source}</p>
          {drug.computed_at && (
            <p className="mt-1 text-[11px] text-slate-400">
              Binding pose &amp; affinity computed {new Date(drug.computed_at).toLocaleDateString(undefined, {
                year: 'numeric', month: 'short', day: 'numeric',
              })} via DiffDock 2.2.0 + Boltz2 1.6.0 (NVIDIA BioNeMo).
            </p>
          )}
        </div>
      </div>
    </Card>
  );
}
