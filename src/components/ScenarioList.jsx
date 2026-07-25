import { ArrowRight, Dna } from 'lucide-react';
import { Card } from '@/components/ui/card';

export function ScenarioList({ scenarios, isLoading, onSelect }) {
  if (isLoading) {
    return (
      <div className="grid sm:grid-cols-2 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-40 rounded-2xl bg-slate-100 animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid sm:grid-cols-2 gap-4">
      {scenarios.map((scenario) => (
        <Card
          key={scenario.id}
          className="p-5 cursor-pointer hover:shadow-md hover:border-teal-200 transition-all group"
        >
          <button className="w-full text-left" onClick={() => onSelect(scenario.id)}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2 text-teal-700">
                <Dna className="w-4 h-4" />
                <span className="text-xs font-medium uppercase tracking-wide">
                  {scenario.cancer_type}
                </span>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-teal-600 group-hover:translate-x-0.5 transition-all" />
            </div>
            <h3 className="mt-2 text-lg font-semibold text-slate-900">{scenario.name}</h3>
            <p className="mt-1 text-sm text-slate-500">{scenario.mutation_context}</p>
            <p className="mt-3 text-xs text-slate-400">
              Target: {scenario.target_name} &middot; PDB {scenario.target_pdb_id}
            </p>
          </button>
        </Card>
      ))}
    </div>
  );
}
