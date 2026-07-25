// Seed script for the curated oncology dataset.
// Run with: cat scripts/seed.ts | npx base44 exec
//
// Fetches real target sequences/structures from UniProt + RCSB PDB, and real
// canonical SMILES from PubChem, so no biological data is hand-typed. Prints
// fetched titles/metadata for each scenario so results can be sanity-checked.
// Docking/affinity fields are left null here; they're filled in by the
// computeDocking backend function once an NVIDIA API key is configured.

interface DrugSeed {
  name: string;
  brand_name: string;
  drug_class: string;
  approval_status: "fda_approved" | "investigational";
  mechanism_summary: string;
  adverse_effects: { effect: string; severity: "common" | "serious" | "black_box"; notes?: string }[];
  black_box_warning?: string;
}

interface ScenarioSeed {
  name: string;
  cancer_type: string;
  mutation_context: string;
  target_name: string;
  target_pdb_id: string;
  target_uniprot_id: string;
  target_summary: string;
  display_order: number;
  drugs: DrugSeed[];
}

const SCENARIOS: ScenarioSeed[] = [
  {
    name: "EGFR-Mutant Non-Small Cell Lung Cancer",
    cancer_type: "Non-Small Cell Lung Cancer (NSCLC)",
    mutation_context: "EGFR exon 19 deletion / L858R activating mutations",
    target_name: "EGFR Tyrosine Kinase Domain",
    target_pdb_id: "1M17",
    target_uniprot_id: "P00533",
    target_summary:
      "EGFR-activating mutations lock the kinase domain in a constitutively active state, driving uncontrolled tumor growth. EGFR tyrosine kinase inhibitors (TKIs) compete with ATP for the kinase's catalytic pocket, shutting down downstream proliferative signaling.",
    display_order: 1,
    drugs: [
      {
        name: "Gefitinib",
        brand_name: "Iressa",
        drug_class: "1st-generation reversible EGFR TKI",
        approval_status: "fda_approved",
        mechanism_summary: "Reversibly binds the EGFR ATP-binding pocket, blocking autophosphorylation and downstream MAPK/PI3K signaling.",
        adverse_effects: [
          { effect: "Diarrhea", severity: "common" },
          { effect: "Acneiform rash", severity: "common" },
          { effect: "Interstitial lung disease", severity: "serious", notes: "Rare but potentially fatal" },
        ],
      },
      {
        name: "Erlotinib",
        brand_name: "Tarceva",
        drug_class: "1st-generation reversible EGFR TKI",
        approval_status: "fda_approved",
        mechanism_summary: "Reversible ATP-competitive EGFR inhibitor, similar binding mode to gefitinib with a distinct pharmacokinetic profile.",
        adverse_effects: [
          { effect: "Rash", severity: "common" },
          { effect: "Diarrhea", severity: "common" },
          { effect: "Hepatotoxicity", severity: "serious" },
        ],
      },
      {
        name: "Afatinib",
        brand_name: "Gilotrif",
        drug_class: "2nd-generation irreversible EGFR/HER2 TKI",
        approval_status: "fda_approved",
        mechanism_summary: "Covalently binds Cys797 in the EGFR ATP pocket for irreversible inhibition; also inhibits HER2/HER4.",
        adverse_effects: [
          { effect: "Diarrhea", severity: "common", notes: "More frequent/severe than 1st-gen agents" },
          { effect: "Paronychia", severity: "common" },
          { effect: "Interstitial lung disease", severity: "serious" },
        ],
      },
      {
        name: "Osimertinib",
        brand_name: "Tagrisso",
        drug_class: "3rd-generation irreversible, mutant-selective EGFR TKI",
        approval_status: "fda_approved",
        mechanism_summary: "Irreversibly and selectively targets EGFR-activating and T790M resistance mutations while sparing wild-type EGFR, reducing skin/GI toxicity.",
        adverse_effects: [
          { effect: "QT prolongation", severity: "serious" },
          { effect: "Interstitial lung disease", severity: "serious" },
          { effect: "Diarrhea", severity: "common" },
        ],
      },
    ],
  },
  {
    name: "BRAF V600E-Mutant Melanoma",
    cancer_type: "Cutaneous Melanoma",
    mutation_context: "BRAF V600E activating mutation",
    target_name: "BRAF V600E Kinase Domain",
    target_pdb_id: "3OG7",
    target_uniprot_id: "P15056",
    target_summary:
      "The V600E mutation locks BRAF's activation loop in an active conformation, driving constitutive MAPK pathway signaling independent of upstream RAS activation. BRAF inhibitors selectively bind the mutant active-conformation ATP pocket.",
    display_order: 2,
    drugs: [
      {
        name: "Vemurafenib",
        brand_name: "Zelboraf",
        drug_class: "1st-generation selective BRAF V600E inhibitor",
        approval_status: "fda_approved",
        mechanism_summary: "Binds the ATP pocket of active-conformation BRAF V600E, blocking downstream MEK/ERK signaling.",
        adverse_effects: [
          { effect: "Photosensitivity", severity: "common" },
          { effect: "Arthralgia", severity: "common" },
          { effect: "Cutaneous squamous cell carcinoma", severity: "serious", notes: "Paradoxical MAPK activation in RAS-mutant cells" },
        ],
      },
      {
        name: "Dabrafenib",
        brand_name: "Tafinlar",
        drug_class: "Selective BRAF V600E/K inhibitor",
        approval_status: "fda_approved",
        mechanism_summary: "ATP-competitive BRAF V600E/K inhibitor, typically combined with the MEK inhibitor trametinib to reduce paradoxical activation toxicity.",
        adverse_effects: [
          { effect: "Pyrexia", severity: "common", notes: "Especially in combination with trametinib" },
          { effect: "Skin papilloma", severity: "common" },
          { effect: "Cutaneous squamous cell carcinoma", severity: "serious" },
        ],
      },
      {
        name: "Encorafenib",
        brand_name: "Braftovi",
        drug_class: "Selective BRAF V600E/K inhibitor",
        approval_status: "fda_approved",
        mechanism_summary: "Slow off-rate BRAF V600E/K inhibitor, combined with binimetinib (MEK inhibitor) for durable pathway suppression.",
        adverse_effects: [
          { effect: "Nausea", severity: "common" },
          { effect: "Palmar-plantar erythrodysesthesia", severity: "common" },
          { effect: "Uveitis", severity: "serious" },
        ],
      },
    ],
  },
  {
    name: "HER2-Positive Breast Cancer",
    cancer_type: "Breast Cancer",
    mutation_context: "ERBB2 (HER2) gene amplification/overexpression",
    target_name: "HER2 (ERBB2) Tyrosine Kinase Domain",
    target_pdb_id: "3PP0",
    target_uniprot_id: "P04626",
    target_summary:
      "HER2 amplification drives ligand-independent receptor dimerization and constitutive downstream proliferative signaling. Small-molecule HER2 TKIs block the intracellular kinase domain, complementing antibody-based therapies that target the extracellular domain.",
    display_order: 3,
    drugs: [
      {
        name: "Lapatinib",
        brand_name: "Tykerb",
        drug_class: "Dual EGFR/HER2 TKI",
        approval_status: "fda_approved",
        mechanism_summary: "Reversible ATP-competitive inhibitor of both EGFR and HER2 kinase domains.",
        adverse_effects: [
          { effect: "Diarrhea", severity: "common" },
          { effect: "Palmar-plantar erythrodysesthesia", severity: "common" },
          { effect: "Hepatotoxicity", severity: "serious" },
        ],
      },
      {
        name: "Neratinib",
        brand_name: "Nerlynx",
        drug_class: "Irreversible pan-HER TKI",
        approval_status: "fda_approved",
        mechanism_summary: "Covalently binds EGFR, HER2, and HER4 kinase domains for irreversible pan-HER inhibition.",
        adverse_effects: [
          { effect: "Severe diarrhea", severity: "serious", notes: "Requires mandatory antidiarrheal prophylaxis" },
          { effect: "Hepatotoxicity", severity: "serious" },
        ],
      },
      {
        name: "Tucatinib",
        brand_name: "Tukysa",
        drug_class: "HER2-selective TKI",
        approval_status: "fda_approved",
        mechanism_summary: "Highly HER2-selective TKI with minimal EGFR inhibition, improving tolerability and enabling CNS-penetrant combination regimens.",
        adverse_effects: [
          { effect: "Diarrhea", severity: "common" },
          { effect: "Hepatotoxicity", severity: "serious" },
          { effect: "Palmar-plantar erythrodysesthesia", severity: "common" },
        ],
      },
    ],
  },
  {
    name: "Chronic Myeloid Leukemia (BCR-ABL1+)",
    cancer_type: "Chronic Myeloid Leukemia (CML)",
    mutation_context: "BCR-ABL1 fusion oncoprotein (Philadelphia chromosome)",
    target_name: "ABL1 Tyrosine Kinase Domain",
    target_pdb_id: "2HYY",
    target_uniprot_id: "P00519",
    target_summary:
      "The t(9;22) translocation fuses BCR to ABL1, producing a constitutively active tyrosine kinase that drives myeloid proliferation. BCR-ABL1 TKIs bind the kinase's ATP pocket, and later-generation agents were designed to overcome resistance mutations like T315I.",
    display_order: 4,
    drugs: [
      {
        name: "Imatinib",
        brand_name: "Gleevec",
        drug_class: "1st-generation BCR-ABL1 TKI",
        approval_status: "fda_approved",
        mechanism_summary: "Binds the inactive conformation of the BCR-ABL1 ATP pocket, the original targeted therapy that transformed CML treatment.",
        adverse_effects: [
          { effect: "Periorbital edema", severity: "common" },
          { effect: "Nausea", severity: "common" },
          { effect: "Myelosuppression", severity: "serious" },
        ],
      },
      {
        name: "Nilotinib",
        brand_name: "Tasigna",
        drug_class: "2nd-generation BCR-ABL1 TKI",
        approval_status: "fda_approved",
        mechanism_summary: "Structurally optimized imatinib analog with higher BCR-ABL1 binding affinity and activity against several imatinib-resistant mutations.",
        adverse_effects: [
          { effect: "QT prolongation", severity: "black_box", notes: "Requires baseline/on-treatment ECG monitoring" },
          { effect: "Hyperglycemia", severity: "common" },
          { effect: "Arterial occlusive events", severity: "serious" },
        ],
        black_box_warning: "QT prolongation and sudden death risk.",
      },
      {
        name: "Dasatinib",
        brand_name: "Sprycel",
        drug_class: "2nd-generation dual BCR-ABL1/SRC TKI",
        approval_status: "fda_approved",
        mechanism_summary: "Binds both active and inactive BCR-ABL1 conformations with broad SRC-family kinase activity, active against most imatinib-resistant mutants except T315I.",
        adverse_effects: [
          { effect: "Pleural effusion", severity: "serious" },
          { effect: "Thrombocytopenia", severity: "serious" },
          { effect: "Pulmonary arterial hypertension", severity: "serious" },
        ],
      },
      {
        name: "Ponatinib",
        brand_name: "Iclusig",
        drug_class: "3rd-generation pan-BCR-ABL1 TKI",
        approval_status: "fda_approved",
        mechanism_summary: "Structurally engineered to retain potency against the gatekeeper T315I resistance mutation that defeats earlier-generation TKIs.",
        adverse_effects: [
          { effect: "Arterial occlusive events", severity: "black_box", notes: "Including cardiovascular, cerebrovascular, and peripheral vascular occlusion" },
          { effect: "Hepatotoxicity", severity: "serious" },
          { effect: "Hypertension", severity: "common" },
        ],
        black_box_warning: "Arterial occlusion, venous thromboembolism, heart failure, and hepatotoxicity.",
      },
    ],
  },
  {
    name: "ALK-Positive Non-Small Cell Lung Cancer",
    cancer_type: "Non-Small Cell Lung Cancer (NSCLC)",
    mutation_context: "EML4-ALK fusion oncoprotein",
    target_name: "ALK Tyrosine Kinase Domain",
    target_pdb_id: "2XP2",
    target_uniprot_id: "Q9UM73",
    target_summary:
      "The EML4-ALK fusion produces a constitutively dimerized, active ALK kinase that drives oncogenic signaling in a molecularly distinct subset of NSCLC. Successive generations of ALK inhibitors were developed for greater potency and CNS penetration as resistance mutations emerged.",
    display_order: 5,
    drugs: [
      {
        name: "Crizotinib",
        brand_name: "Xalkori",
        drug_class: "1st-generation ALK/ROS1/MET TKI",
        approval_status: "fda_approved",
        mechanism_summary: "ATP-competitive multi-kinase inhibitor of ALK, ROS1, and MET; first ALK inhibitor approved for EML4-ALK+ NSCLC.",
        adverse_effects: [
          { effect: "Visual disturbances", severity: "common" },
          { effect: "GI upset", severity: "common" },
          { effect: "Hepatotoxicity", severity: "serious" },
        ],
      },
      {
        name: "Alectinib",
        brand_name: "Alecensa",
        drug_class: "2nd-generation selective ALK TKI",
        approval_status: "fda_approved",
        mechanism_summary: "Highly selective ALK inhibitor with strong CNS penetration, active against several crizotinib-resistance mutations.",
        adverse_effects: [
          { effect: "Myalgia", severity: "common" },
          { effect: "Hepatotoxicity", severity: "serious" },
          { effect: "Bradycardia", severity: "common" },
        ],
      },
      {
        name: "Lorlatinib",
        brand_name: "Lorbrena",
        drug_class: "3rd-generation macrocyclic ALK/ROS1 TKI",
        approval_status: "fda_approved",
        mechanism_summary: "Macrocyclic design with high CNS penetration, engineered to overcome resistance mutations from earlier-generation ALK inhibitors, including the solvent-front G1202R mutation.",
        adverse_effects: [
          { effect: "Hyperlipidemia", severity: "common" },
          { effect: "CNS effects (cognitive/mood)", severity: "serious" },
          { effect: "Edema", severity: "common" },
        ],
      },
    ],
  },
];

async function fetchUniProtSequence(accession: string): Promise<string> {
  const res = await fetch(`https://rest.uniprot.org/uniprotkb/${accession}.fasta`);
  if (!res.ok) throw new Error(`UniProt fetch failed for ${accession}: ${res.status}`);
  const fasta = await res.text();
  return fasta.split("\n").slice(1).join("").trim();
}

// We don't store the PDB structure itself — target_pdb_id is resolved live
// against RCSB (files.rcsb.org) by the docking function and the 3D viewer.
// Here we only fetch the lightweight metadata record to validate the ID is
// real and sanity-check its title before trusting it in the dataset.
async function validatePdbId(pdbId: string): Promise<{ title: string }> {
  const metaRes = await fetch(`https://data.rcsb.org/rest/v1/core/entry/${pdbId}`);
  if (!metaRes.ok) throw new Error(`RCSB metadata fetch failed for ${pdbId}: ${metaRes.status}`);
  const meta = await metaRes.json();
  const title = meta?.struct?.title ?? "(title unavailable)";
  return { title };
}

async function fetchPubChemSmiles(drugName: string): Promise<{ cid: string; smiles: string }> {
  const url = `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name/${encodeURIComponent(
    drugName
  )}/property/IsomericSMILES,CanonicalSMILES/JSON`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`PubChem lookup failed for ${drugName}: ${res.status}`);
  const data = await res.json();
  const prop = data?.PropertyTable?.Properties?.[0];
  if (!prop) throw new Error(`PubChem returned no properties for ${drugName}`);
  // PubChem's REST API has renamed these properties across versions
  // (e.g. CanonicalSMILES -> ConnectivitySMILES); check all known aliases
  // defensively rather than trusting the requested property name back.
  const smiles = prop.IsomericSMILES ?? prop.CanonicalSMILES ?? prop.ConnectivitySMILES ?? prop.SMILES;
  if (!smiles) throw new Error(`PubChem returned no SMILES for ${drugName}: ${JSON.stringify(prop)}`);
  return { cid: String(prop.CID), smiles };
}

async function main() {
  console.log(`Seeding ${SCENARIOS.length} scenarios...\n`);

  for (const scenario of SCENARIOS) {
    console.log(`=== ${scenario.name} ===`);
    const sequence = await fetchUniProtSequence(scenario.target_uniprot_id);
    const { title } = await validatePdbId(scenario.target_pdb_id);
    console.log(`  UniProt ${scenario.target_uniprot_id}: ${sequence.length} residues`);
    console.log(`  PDB ${scenario.target_pdb_id}: "${title}"`);

    const scenarioRecord = await base44.entities.Scenario.create({
      name: scenario.name,
      cancer_type: scenario.cancer_type,
      mutation_context: scenario.mutation_context,
      target_name: scenario.target_name,
      target_pdb_id: scenario.target_pdb_id,
      target_uniprot_id: scenario.target_uniprot_id,
      target_sequence: sequence,
      target_summary: scenario.target_summary,
      display_order: scenario.display_order,
    });

    for (const drug of scenario.drugs) {
      const { cid, smiles } = await fetchPubChemSmiles(drug.name);
      console.log(`  ${drug.name}: PubChem CID ${cid}`);
      await base44.entities.Drug.create({
        scenario_id: scenarioRecord.id,
        name: drug.name,
        brand_name: drug.brand_name,
        drug_class: drug.drug_class,
        approval_status: drug.approval_status,
        pubchem_cid: cid,
        smiles,
        mechanism_summary: drug.mechanism_summary,
        adverse_effects: drug.adverse_effects,
        black_box_warning: drug.black_box_warning ?? "",
        data_source: `Target: RCSB PDB ${scenario.target_pdb_id} / UniProt ${scenario.target_uniprot_id}. Drug: PubChem CID ${cid}. MOA/adverse effects: FDA prescribing information & NCCN guidelines (summarized).`,
      });
    }
    console.log("");
  }

  console.log("Seeding complete.");
}

await main();
