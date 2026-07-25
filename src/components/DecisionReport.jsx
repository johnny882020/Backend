import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { FileText, Printer, Loader2 } from 'lucide-react';

export function DecisionReport({ scenario, drugs, activeFlags }) {
  const [status, setStatus] = useState('idle'); // idle | generating | done | error
  const [report, setReport] = useState(null);
  const [error, setError] = useState(null);
  const [generatedAt, setGeneratedAt] = useState(null);

  const generate = async () => {
    setStatus('generating');
    setError(null);
    try {
      const res = await base44.functions.invoke('oncology-report', {
        scenario: {
          name: scenario.name,
          cancer_type: scenario.cancer_type,
          target_name: scenario.target_name,
          target_pdb_id: scenario.target_pdb_id,
          target_summary: scenario.target_summary,
        },
        drugs,
        patientFlags: activeFlags,
      });
      setReport(res.data.report);
      setGeneratedAt(res.data.generated_at);
      setStatus('done');
    } catch (err) {
      setError(err?.response?.data?.error || err?.message || 'Could not generate the report.');
      setStatus('error');
    }
  };

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 text-sm font-semibold text-brand-ink">
          <FileText className="w-4 h-4 text-brand-teal" />
          Personalized decision report
        </div>
        <div className="flex gap-2">
          {status === 'done' && (
            <Button onClick={() => window.print()} className="bg-white border border-slate-200 text-slate-700 hover:bg-slate-50">
              <Printer className="w-4 h-4 mr-1.5" /> Print / Save as PDF
            </Button>
          )}
          <Button onClick={generate} disabled={status === 'generating'} className="bg-teal-700 hover:bg-teal-800">
            {status === 'generating' ? (
              <span className="flex items-center gap-1.5"><Loader2 className="w-4 h-4 animate-spin" /> Generating&hellip;</span>
            ) : status === 'done' ? 'Regenerate' : 'Generate report'}
          </Button>
        </div>
      </div>

      {activeFlags.length > 0 && (
        <p className="mt-2 text-xs text-slate-400">
          Personalizing for {activeFlags.length} active patient factor{activeFlags.length > 1 ? 's' : ''}.
        </p>
      )}

      {error && (
        <p className="mt-3 text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
      )}

      {report && (
        <div id="decision-report-print" className="mt-4">
          <div className="hidden print:block mb-4">
            <h1 className="text-xl font-display font-semibold text-brand-ink">OncoBind Decision Report</h1>
            <p className="text-sm text-slate-500">{scenario.name} &middot; generated {new Date(generatedAt).toLocaleString()}</p>
          </div>
          <div className="prose prose-sm max-w-none text-slate-700 whitespace-pre-wrap leading-relaxed">
            {report}
          </div>
          <p className="mt-4 text-[11px] text-slate-400 print:block">
            Research &amp; education tool only — not a diagnostic or prescribing device. Verify against
            current FDA prescribing information and institutional guidelines before clinical use.
          </p>
        </div>
      )}
    </Card>
  );
}
