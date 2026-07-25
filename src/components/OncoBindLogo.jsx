// Two overlapping marks (target + ligand) blending at their binding
// interface — the brand mark for OncoBind.
export function OncoBindLogo({ className = 'w-8 h-8' }) {
  return (
    <svg viewBox="0 0 32 32" className={className} xmlns="http://www.w3.org/2000/svg">
      <g style={{ isolation: 'isolate' }}>
        <circle cx="12.5" cy="13" r="8.5" fill="#2DBEB2" style={{ mixBlendMode: 'multiply' }} />
        <circle cx="19.5" cy="19" r="8.5" fill="#3B6FE0" style={{ mixBlendMode: 'multiply' }} />
      </g>
    </svg>
  );
}
