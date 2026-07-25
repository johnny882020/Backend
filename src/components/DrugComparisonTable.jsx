import { Badge } from '@/components/ui/badge';

const SEVERITY_VARIANT = { common: 'default', serious: 'amber', black_box: 'red' };

function ScoreCell({ value, suffix = '', decimals = 2 }) {
  if (value === null || value === undefined) {
    return <span className="text-slate-300 text-xs">pending</span>;
  }
  return (
    <span className="font-mono text-sm text-slate-800">
      {value.toFixed(decimals)}
      {suffix}
    </span>
  );
}

export function DrugComparisonTable({ drugs, selectedDrugId, onSelect }) {
  const sorted = [...drugs].sort((a, b) => (b.composite_score ?? -1) - (a.composite_score ?? -1));

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
            <th className="text-left font-medium px-4 py-2.5">Drug</th>
            <th className="text-left font-medium px-4 py-2.5">Class</th>
            <th className="text-left font-medium px-4 py-2.5">Docking conf.</th>
            <th className="text-left font-medium px-4 py-2.5">pIC50</th>
            <th className="text-left font-medium px-4 py-2.5">Composite score</th>
            <th className="text-left font-medium px-4 py-2.5">Key adverse effects</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((drug) => (
            <tr
              key={drug.id}
              onClick={() => onSelect(drug.id)}
              className={`cursor-pointer border-t border-slate-100 transition-colors ${
                selectedDrugId === drug.id ? 'bg-teal-50/60' : 'hover:bg-slate-50'
              }`}
            >
              <td className="px-4 py-3">
                <div className="font-medium text-slate-900">{drug.name}</div>
                <div className="text-xs text-slate-400">{drug.brand_name}</div>
              </td>
              <td className="px-4 py-3 text-slate-600">{drug.drug_class}</td>
              <td className="px-4 py-3"><ScoreCell value={drug.docking_confidence} /></td>
              <td className="px-4 py-3"><ScoreCell value={drug.affinity_pic50} /></td>
              <td className="px-4 py-3"><ScoreCell value={drug.composite_score} decimals={0} /></td>
              <td className="px-4 py-3">
                <div className="flex flex-wrap gap-1">
                  {(drug.adverse_effects ?? []).slice(0, 2).map((ae) => (
                    <Badge key={ae.effect} variant={SEVERITY_VARIANT[ae.severity] ?? 'default'}>
                      {ae.effect}
                    </Badge>
                  ))}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
