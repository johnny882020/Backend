import { useState } from 'react';
import { X, Compass } from 'lucide-react';

const STORAGE_KEY = 'oncobind_explainer_dismissed_v1';

export function FirstRunExplainer() {
  const [dismissed, setDismissed] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) === '1';
    } catch {
      return false;
    }
  });

  if (dismissed) return null;

  const dismiss = () => {
    setDismissed(true);
    try {
      localStorage.setItem(STORAGE_KEY, '1');
    } catch {
      // localStorage unavailable — dismissal just won't persist across visits
    }
  };

  return (
    <div className="relative flex items-start gap-3 rounded-xl border border-brand-teal/20 bg-white px-4 py-3.5 text-sm text-slate-600 shadow-sm">
      <Compass className="w-5 h-5 text-brand-teal shrink-0 mt-0.5" />
      <div className="pr-6">
        <p>
          <strong className="text-brand-ink">How to read this:</strong> the{' '}
          <strong>composite score</strong> (0&ndash;100) blends predicted binding affinity,
          docking confidence, and adverse-effect burden &mdash; higher is a stronger
          candidate <em>relative to the other drugs in that scenario only</em>. The 3D
          viewer shows the real target structure fetched live from RCSB PDB; once a
          drug's binding pose is computed, it overlays as a docked ligand.
        </p>
      </div>
      <button
        onClick={dismiss}
        className="absolute top-3 right-3 text-slate-300 hover:text-slate-500 transition-colors"
        aria-label="Dismiss"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
