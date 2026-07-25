import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Base44Logo } from '@/components/Base44Logo';
import { OncoBindLogo } from '@/components/OncoBindLogo';
import { DisclaimerBanner } from '@/components/DisclaimerBanner';
import { FirstRunExplainer } from '@/components/FirstRunExplainer';
import { ScenarioList } from '@/components/ScenarioList';
import { ScenarioDetail } from '@/components/ScenarioDetail';

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
    <div className="min-h-screen bg-[radial-gradient(ellipse_120%_60%_at_50%_-10%,#E4F5F3_0%,#FAFDFD_45%,#FFFFFF_100%)]">
      <header className="border-b border-slate-100/80 bg-white/85 backdrop-blur sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center gap-3">
          <button
            onClick={() => setSelectedScenarioId(null)}
            className="flex items-center gap-2.5 group"
          >
            <OncoBindLogo className="w-9 h-9 shrink-0 transition-transform group-hover:scale-105" />
            <div className="text-left">
              <h1 className="text-base font-display font-semibold text-brand-ink leading-none tracking-tight">
                OncoBind
              </h1>
              <p className="text-[11px] text-slate-400 mt-0.5 leading-none">Precision Oncology Therapy Advisor</p>
            </div>
          </button>
          <div className="ml-auto flex items-center gap-1.5 text-xs text-slate-300">
            <span>built on</span>
            <Base44Logo className="w-4 h-4" />
            <span className="font-medium text-slate-400">Base44</span>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-10 space-y-7">
        {!selectedScenario && (
          <>
            <div className="max-w-2xl">
              <span className="inline-block text-[11px] font-semibold uppercase tracking-wider text-brand-teal bg-brand-tealLight rounded-full px-2.5 py-1">
                Molecular target &middot; therapy comparison
              </span>
              <h2 className="mt-3 text-3xl font-display font-semibold text-brand-ink tracking-tight">
                Choose the therapy the biology actually supports.
              </h2>
              <p className="mt-2.5 text-[15px] text-slate-500 leading-relaxed">
                For each molecularly-defined cancer, OncoBind docks every approved candidate drug
                against the real target structure, predicts binding affinity, and weighs the result
                against known adverse-effect burden &mdash; so the tradeoffs are visible, not buried
                in prescribing information.
              </p>
            </div>
            <FirstRunExplainer />
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
        Binding poses and affinities from NVIDIA BioNeMo (DiffDock, Boltz2). Not affiliated with or
        endorsed by any of these databases.
      </footer>
    </div>
  );
}
