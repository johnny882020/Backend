import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Base44Logo } from '@/components/Base44Logo';
import { DisclaimerBanner } from '@/components/DisclaimerBanner';
import { ScenarioList } from '@/components/ScenarioList';
import { ScenarioDetail } from '@/components/ScenarioDetail';
import { FlaskConical } from 'lucide-react';

export default function App() {
  const [scenarios, setScenarios] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedScenarioId, setSelectedScenarioId] = useState(null);

  useEffect(() => {
    base44.entities.Scenario.list().then((data) => {
      data.sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0));
      setScenarios(data);
      setIsLoading(false);
    });
  }, []);

  const selectedScenario = scenarios.find((s) => s.id === selectedScenarioId);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-teal-50/40">
      <header className="border-b border-slate-100 bg-white/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center gap-3">
          <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-teal-700 text-white">
            <FlaskConical className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-semibold text-slate-900 leading-none">OncoBind</h1>
            <p className="text-xs text-slate-400 mt-0.5">Precision Oncology Therapy Advisor</p>
          </div>
          <div className="ml-auto flex items-center gap-1.5 text-xs text-slate-300">
            <span>built on</span>
            <Base44Logo className="w-4 h-4" />
            <span className="font-medium text-slate-400">Base44</span>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8 space-y-6">
        {!selectedScenario && (
          <>
            <div>
              <h2 className="text-xl font-semibold text-slate-900">Cancer Scenarios</h2>
              <p className="text-sm text-slate-500 mt-1">
                Select a molecularly-defined cancer scenario to compare candidate targeted
                therapies by predicted binding mode, binding affinity, and adverse-effect profile.
              </p>
            </div>
            <DisclaimerBanner />
            <ScenarioList scenarios={scenarios} isLoading={isLoading} onSelect={setSelectedScenarioId} />
          </>
        )}

        {selectedScenario && (
          <ScenarioDetail scenario={selectedScenario} onBack={() => setSelectedScenarioId(null)} />
        )}
      </main>

      <footer className="max-w-6xl mx-auto px-6 py-8 text-center text-xs text-slate-300">
        Target structures &amp; sequences from RCSB PDB and UniProt. Drug identifiers from PubChem.
        Not affiliated with or endorsed by any of these databases.
      </footer>
    </div>
  );
}
