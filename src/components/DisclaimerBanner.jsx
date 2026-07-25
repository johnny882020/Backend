import { ShieldAlert } from 'lucide-react';

export function DisclaimerBanner({ compact = false }) {
  return (
    <div className={`flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 text-amber-900 ${compact ? 'px-3 py-2 text-xs' : 'px-4 py-3 text-sm'}`}>
      <ShieldAlert className={compact ? 'w-4 h-4 mt-0.5 shrink-0' : 'w-5 h-5 mt-0.5 shrink-0'} />
      <p>
        <strong>Research &amp; education tool only.</strong> Binding poses and affinities are
        computational predictions, not clinical measurements. This is not a diagnostic or
        prescribing device and does not replace clinical judgment, current FDA prescribing
        information, or institutional guidelines.
      </p>
    </div>
  );
}
