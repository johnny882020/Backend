import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { ArrowLeft } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { DrugComparisonTable } from '@/components/DrugComparisonTable';
import { DrugDetail } from '@/components/DrugDetail';
import { AdvisorChat } from '@/components/AdvisorChat';
import { DisclaimerBanner } from '@/components/DisclaimerBanner';
import { CandidateDrugForm } from '@/components/CandidateDrugForm';

export function ScenarioDetail({ scenario, onBack }) {
  const [drugs, setDrugs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDrugId, setSelectedDrugId] = useState(null);

  useEffect(() => {
    setIsLoading(true);
    setSelectedDrugId(null);
    base44.entities.Drug.filter({ scenario_id: scenario.id }).then((data) => {
      setDrugs(data);
      setSelectedDrugId(data[0]?.id ?? null);
      setIsLoading(false);
    });
  }, [scenario.id]);

  const selectedDrug = drugs.find((d) => d.id === selectedDrugId);

  const handleCandidateAdded = (candidate) => {
    setDrugs((prev) => [...prev, candidate]);
    setSelectedDrugId(candidate.id);
  };

  return (
    <div className="space-y-5">
      <button
        onClick={onBack}
        className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> All scenarios
      </button>

      <div>
        <div className="text-xs font-medium uppercase tracking-wide text-brand-teal">
          {scenario.cancer_type}
        </div>
        <h2 className="text-2xl font-display font-semibold text-brand-ink mt-0.5">{scenario.name}</h2>
        <p className="text-sm text-slate-500 mt-1">{scenario.mutation_context}</p>
      </div>

      <Card className="p-5">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
          {scenario.target_name} &middot; PDB {scenario.target_pdb_id} &middot; UniProt {scenario.target_uniprot_id}
        </h4>
        <p className="mt-1.5 text-sm text-slate-700">{scenario.target_summary}</p>
      </Card>

      {isLoading ? (
        <div className="h-40 rounded-2xl bg-slate-100 animate-pulse" />
      ) : (
        <div className="grid lg:grid-cols-3 gap-5 items-start">
          <div className="lg:col-span-2 space-y-5">
            <DrugComparisonTable drugs={drugs} selectedDrugId={selectedDrugId} onSelect={setSelectedDrugId} />
            <CandidateDrugForm scenario={scenario} onAdded={handleCandidateAdded} />
            {selectedDrug && (
              <DrugDetail drug={selectedDrug} scenario={scenario} scenarioDrugs={drugs} />
            )}
          </div>
          <Card className="lg:sticky lg:top-6 h-[560px]">
            <AdvisorChat scenario={scenario} drugs={drugs} />
          </Card>
        </div>
      )}

      <DisclaimerBanner compact />
    </div>
  );
}
