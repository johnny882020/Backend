// One-off patch: the initial seed run stored null SMILES for every drug
// because PubChem's API returned the property under a renamed key. Refetch
// and backfill smiles on all existing Drug records.

async function fetchPubChemSmiles(drugName: string): Promise<{ cid: string; smiles: string }> {
  const url = `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name/${encodeURIComponent(
    drugName
  )}/property/IsomericSMILES,CanonicalSMILES/JSON`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`PubChem lookup failed for ${drugName}: ${res.status}`);
  const data = await res.json();
  const prop = data?.PropertyTable?.Properties?.[0];
  if (!prop) throw new Error(`PubChem returned no properties for ${drugName}`);
  const smiles = prop.IsomericSMILES ?? prop.CanonicalSMILES ?? prop.ConnectivitySMILES ?? prop.SMILES;
  if (!smiles) throw new Error(`PubChem returned no SMILES for ${drugName}: ${JSON.stringify(prop)}`);
  return { cid: String(prop.CID), smiles };
}

async function main() {
  const drugs = await base44.entities.Drug.list();
  for (const drug of drugs) {
    if (drug.smiles) {
      console.log(`skip ${drug.name} (already has smiles)`);
      continue;
    }
    const { cid, smiles } = await fetchPubChemSmiles(drug.name);
    await base44.entities.Drug.update(drug.id, { smiles, pubchem_cid: cid });
    console.log(`fixed ${drug.name}: ${smiles}`);
  }
}

await main();
