// Shared helpers for working with RCSB PDB structures.

const AA3TO1: Record<string, string> = {
  ALA: "A", ARG: "R", ASN: "N", ASP: "D", CYS: "C",
  GLN: "Q", GLU: "E", GLY: "G", HIS: "H", ILE: "I",
  LEU: "L", LYS: "K", MET: "M", PHE: "F", PRO: "P",
  SER: "S", THR: "T", TRP: "W", TYR: "Y", VAL: "V",
  MSE: "M", SEC: "U", PYL: "O",
};

export interface ReceptorData {
  /** ATOM records only, for docking (DiffDock). */
  atomText: string;
  /** One-letter sequence of the primary chain, derived from the crystallized construct (for Boltz2 folding). */
  sequence: string;
  chainId: string;
}

/** Fetch a PDB entry from RCSB and extract the receptor structure + its primary chain sequence. */
export async function fetchReceptor(pdbId: string): Promise<ReceptorData> {
  const res = await fetch(`https://files.rcsb.org/download/${pdbId}.pdb`);
  if (!res.ok) throw new Error(`RCSB PDB download failed for ${pdbId}: ${res.status}`);
  const raw = await res.text();

  const atomLines = raw.split("\n").filter((line) => line.startsWith("ATOM"));
  const atomText = atomLines.join("\n");
  if (atomLines.length === 0) throw new Error(`No ATOM records found for ${pdbId}`);

  // Prefer chain A; fall back to whichever chain appears first.
  const chains = new Set(atomLines.map((l) => l[21]));
  const chainId = chains.has("A") ? "A" : atomLines[0][21];

  const seenResidues = new Set<string>();
  const residues: string[] = [];
  for (const line of atomLines) {
    if (line[21] !== chainId) continue;
    if (line.slice(12, 16).trim() !== "CA") continue;
    const resName = line.slice(17, 20).trim();
    const resSeq = line.slice(22, 26).trim();
    const iCode = line[26];
    const key = `${resSeq}${iCode}`;
    if (seenResidues.has(key)) continue;
    seenResidues.add(key);
    residues.push(AA3TO1[resName] ?? "X");
  }

  return { atomText, sequence: residues.join(""), chainId };
}
