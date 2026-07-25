import { useEffect, useRef, useState } from 'react';
import * as $3Dmol from '3dmol';

// Fetches the receptor structure live from RCSB PDB (public, no key) and
// renders it with 3Dmol.js. When `ligandSdf` is provided (post-docking),
// overlays the predicted binding pose as sticks.
export function MoleculeViewer({ pdbId, ligandSdf, className = '' }) {
  const containerRef = useRef(null);
  const viewerRef = useRef(null);
  const [status, setStatus] = useState('loading');

  useEffect(() => {
    let cancelled = false;
    setStatus('loading');

    async function load() {
      try {
        const res = await fetch(`https://files.rcsb.org/download/${pdbId}.pdb`);
        if (!res.ok) throw new Error(`RCSB fetch failed: ${res.status}`);
        const pdbText = await res.text();
        if (cancelled || !containerRef.current) return;

        containerRef.current.innerHTML = '';
        const viewer = $3Dmol.createViewer(containerRef.current, {
          backgroundColor: 'white',
        });
        viewerRef.current = viewer;

        viewer.addModel(pdbText, 'pdb');
        viewer.setStyle({}, { cartoon: { color: 'spectrum' } });

        if (ligandSdf) {
          viewer.addModel(ligandSdf, 'sdf');
          viewer.setStyle({ model: 1 }, { stick: { colorscheme: 'greenCarbon' } });
        }

        viewer.zoomTo();
        viewer.render();
        setStatus('ready');
      } catch (err) {
        if (!cancelled) setStatus('error');
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [pdbId, ligandSdf]);

  return (
    <div className={`relative ${className}`}>
      <div ref={containerRef} className="w-full h-full rounded-xl bg-white" />
      {status === 'loading' && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/70 rounded-xl">
          <div className="w-6 h-6 border-2 border-slate-200 border-t-teal-600 rounded-full animate-spin" />
        </div>
      )}
      {status === 'error' && (
        <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-slate-50 text-sm text-slate-400">
          Could not load structure {pdbId} from RCSB PDB.
        </div>
      )}
      <div className="absolute bottom-2 right-3 text-[11px] text-slate-400">
        Source: RCSB PDB {pdbId}
      </div>
    </div>
  );
}
