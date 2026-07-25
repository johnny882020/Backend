import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { MoleculeViewer } from '@/components/MoleculeViewer';
import { ScoreBar } from '@/components/ui/score-bar';
import { computeScoreBreakdown } from '@/lib/scoring';
import { AlertTriangle } from 'lucide-react';

const SEVERITY_VARIANT = { common: 'default', serious: 'amber', black_box: 'red' };

export function DrugDetail({ drug, scenario, scenarioDrugs = [] }) {
  const breakdown = computeScoreBreakdown(drug, scenarioDrugs);

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

          <p className="mt-4 text-[11px] text-slate-400">{drug.data_source}</p>
        </div>
      </div>
    </Card>
  );
}
