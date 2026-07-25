import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { FlaskConical, Loader2 } from 'lucide-react';

export function CandidateDrugForm({ scenario, onAdded }) {
  const [drugName, setDrugName] = useState('');
  const [status, setStatus] = useState('idle'); // idle | docking | error
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const name = drugName.trim();
    if (!name || status === 'docking') return;
    setStatus('docking');
    setError(null);
    try {
      const res = await base44.functions.invoke('dock-candidate', {
        scenarioId: scenario.id,
        drugName: name,
      });
      onAdded({ ...res.data, id: `candidate-${crypto.randomUUID()}` });
      setDrugName('');
      setStatus('idle');
    } catch (err) {
      setError(err?.response?.data?.error || err?.message || 'Docking failed.');
      setStatus('error');
    }
  };

  return (
    <div className="rounded-xl border border-dashed border-brand-teal/30 bg-brand-tealLight/30 p-4">
      <div className="flex items-center gap-2 text-sm font-medium text-brand-ink mb-2">
        <FlaskConical className="w-4 h-4 text-brand-teal" />
        Dock a candidate drug not on this list
      </div>
      <p className="text-xs text-slate-500 mb-3">
        Runs real DiffDock + Boltz2 computation against {scenario.target_name} live. Takes up to a
        few minutes. Results are shown only in this session, not saved for other visitors — and
        unlike the curated drugs, mechanism/adverse-effect text isn't sourced from FDA prescribing
        information.
      </p>
      <form onSubmit={handleSubmit} className="flex gap-2">
        <Input
          value={drugName}
          onChange={(e) => setDrugName(e.target.value)}
          placeholder="e.g. Selpercatinib"
          disabled={status === 'docking'}
          className="flex-1 bg-white"
        />
        <Button type="submit" disabled={!drugName.trim() || status === 'docking'} className="bg-teal-700 hover:bg-teal-800 shrink-0">
          {status === 'docking' ? (
            <span className="flex items-center gap-1.5"><Loader2 className="w-4 h-4 animate-spin" /> Docking&hellip;</span>
          ) : (
            'Dock it'
          )}
        </Button>
      </form>
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </div>
  );
}
