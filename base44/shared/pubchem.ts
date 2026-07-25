// Resolves a drug name to its canonical SMILES + PubChem CID.
// PubChem's REST API has renamed this property across versions (observed:
// CanonicalSMILES -> ConnectivitySMILES), so check known aliases defensively
// rather than trusting the requested property name back. Prefers
// IsomericSMILES (includes stereochemistry) when available.
export async function fetchPubChemSmiles(drugName: string): Promise<{ cid: string; smiles: string }> {
  const url = `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name/${encodeURIComponent(
    drugName
  )}/property/IsomericSMILES,CanonicalSMILES/JSON`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`PubChem lookup failed for "${drugName}": ${res.status}`);
  const data = await res.json();
  const prop = data?.PropertyTable?.Properties?.[0];
  if (!prop) throw new Error(`PubChem returned no properties for "${drugName}"`);
  const smiles = prop.IsomericSMILES ?? prop.CanonicalSMILES ?? prop.ConnectivitySMILES ?? prop.SMILES;
  if (!smiles) throw new Error(`PubChem returned no SMILES for "${drugName}": ${JSON.stringify(prop)}`);
  return { cid: String(prop.CID), smiles };
}
