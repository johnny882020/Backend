import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { RISK_FLAGS } from '@/lib/patientContext';
import { ChevronDown, ChevronUp, Upload, User, ShieldAlert, Loader2 } from 'lucide-react';

const LAB_SCHEMA = {
  type: 'object',
  properties: {
    alt_u_l: { type: 'number', description: 'ALT (SGPT), U/L' },
    ast_u_l: { type: 'number', description: 'AST (SGOT), U/L' },
    creatinine_mg_dl: { type: 'number', description: 'Serum creatinine, mg/dL' },
    egfr: { type: 'number', description: 'eGFR, mL/min/1.73m2' },
    qtc_ms: { type: 'number', description: 'QTc interval, ms, if reported' },
    platelets_10e9_l: { type: 'number', description: 'Platelet count, 10^9/L' },
  },
};

// Rough, deliberately simple thresholds for a research/education demo — not
// a validated clinical interpretation rule set.
function flagsFromLabs(labs) {
  const flags = [];
  if ((labs.alt_u_l ?? 0) > 40 || (labs.ast_u_l ?? 0) > 40) flags.push('hepatic_impairment');
  if ((labs.egfr ?? 999) < 60 || (labs.creatinine_mg_dl ?? 0) > 1.3) flags.push('renal_impairment');
  if ((labs.qtc_ms ?? 0) > 450) flags.push('cardiac_risk');
  return flags;
}

export function PatientContextPanel({ activeFlags, onChange }) {
  const [expanded, setExpanded] = useState(false);
  const [uploadStatus, setUploadStatus] = useState('idle'); // idle | uploading | done | error
  const [uploadError, setUploadError] = useState(null);
  const [extractedLabs, setExtractedLabs] = useState(null);

  const toggleFlag = (flagId) => {
    onChange(activeFlags.includes(flagId) ? activeFlags.filter((f) => f !== flagId) : [...activeFlags, flagId]);
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadStatus('uploading');
    setUploadError(null);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      const labs = await base44.integrations.Core.ExtractDataFromUploadedFile({
        file_url,
        json_schema: LAB_SCHEMA,
      });
      setExtractedLabs(labs);
      const derived = flagsFromLabs(labs || {});
      onChange([...new Set([...activeFlags, ...derived])]);
      setUploadStatus('done');
    } catch (err) {
      setUploadError(err?.response?.data?.error || err?.message || 'Could not analyze this file.');
      setUploadStatus('error');
    }
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-slate-900"
      >
        <span className="flex items-center gap-2">
          <User className="w-4 h-4 text-brand-teal" />
          Patient context {activeFlags.length > 0 && (
            <span className="text-xs font-normal text-brand-teal bg-brand-tealLight rounded-full px-2 py-0.5">
              {activeFlags.length} active
            </span>
          )}
        </span>
        {expanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
      </button>

      {expanded && (
        <div className="px-4 pb-4 border-t border-slate-100 pt-3 space-y-4">
          <div className="flex items-start gap-2 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-800">
            <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
            <span>
              For demonstration only. Do not upload real patient-identifiable information &mdash;
              use de-identified or synthetic example labs. Nothing here is saved to a shared
              patient record; it exists only in this browser session.
            </span>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2">
              Relevant patient factors
            </p>
            <div className="grid sm:grid-cols-2 gap-2">
              {RISK_FLAGS.map((flag) => (
                <label key={flag.id} className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={activeFlags.includes(flag.id)}
                    onChange={() => toggleFlag(flag.id)}
                    className="rounded border-slate-300 text-brand-teal focus:ring-brand-teal"
                  />
                  {flag.label}
                </label>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2">
              Or upload a lab report (optional)
            </p>
            <label className="flex items-center gap-2 text-sm text-brand-teal border border-dashed border-brand-teal/40 rounded-lg px-3 py-2 cursor-pointer hover:bg-brand-tealLight/40 w-fit">
              {uploadStatus === 'uploading' ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Upload className="w-4 h-4" />
              )}
              {uploadStatus === 'uploading' ? 'Analyzing…' : 'Upload lab report (PDF/image)'}
              <input type="file" accept=".pdf,image/*" className="hidden" onChange={handleFileUpload} />
            </label>
            {uploadError && <p className="mt-2 text-xs text-red-600">{uploadError}</p>}
            {extractedLabs && uploadStatus === 'done' && (
              <p className="mt-2 text-xs text-slate-500">
                Extracted values applied above where out of range: {Object.entries(extractedLabs)
                  .filter(([, v]) => v != null)
                  .map(([k, v]) => `${k}=${v}`)
                  .join(', ') || 'none found'}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
