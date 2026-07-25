# OncoBind

**Precision oncology therapy advisor.** OncoBind helps physicians compare
FDA-approved targeted cancer therapies for a molecularly-defined cancer
subtype by predicted binding mode, predicted binding affinity, and
adverse-effect burden — grounded in real target structures and real
computational chemistry, not static reference tables.

> **This is a research and education decision-support tool, not a diagnostic
> or prescribing device.** It does not replace clinical judgment, current FDA
> prescribing information, or institutional guidelines. See
> [Limitations](#limitations--disclaimers).

Live app: https://backend-f3b88536.base44.app

## What it does

For five curated cancer scenarios (a cancer subtype paired with the specific
kinase-domain target its therapies act on), OncoBind:

1. Docks every candidate drug against the real receptor structure using
   **DiffDock** (NVIDIA BioNeMo NIM), producing a predicted 3D binding pose
   and pose-confidence score.
2. Predicts binding affinity (pIC50) and binding probability using
   **Boltz2** (NVIDIA BioNeMo NIM), folding the ligand against the same
   kinase-domain sequence used for docking.
3. Combines affinity, docking confidence, and a severity-weighted
   adverse-effect burden into a transparent **composite score**, normalized
   relative to the other candidates for that same scenario.
4. Lets the physician ask a grounded AI advisor *why* a drug scored the way
   it did — the advisor only cites data actually present in the app's
   database, never invented numbers.

## Scenarios covered

| Cancer scenario | Target | Candidate drugs |
|---|---|---|
| EGFR-mutant NSCLC | EGFR kinase domain (PDB 1M17) | Gefitinib, Erlotinib, Afatinib, Osimertinib |
| BRAF V600E melanoma | BRAF V600E kinase domain (PDB 3OG7) | Vemurafenib, Dabrafenib, Encorafenib |
| HER2+ breast cancer | HER2/ERBB2 kinase domain (PDB 3PP0) | Lapatinib, Neratinib, Tucatinib |
| CML (BCR-ABL1+) | ABL1 kinase domain (PDB 2HYY) | Imatinib, Nilotinib, Dasatinib, Ponatinib |
| ALK+ NSCLC | ALK kinase domain (PDB 2XP2) | Crizotinib, Alectinib, Lorlatinib |

Target sequences come from UniProt, structures from RCSB PDB, and drug
identifiers/SMILES from PubChem — fetched live by the seed script, not
hand-typed. See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for the full
data pipeline and the exact composite-score formula.

## Tech stack

- **Frontend**: React 18 + Vite, Tailwind CSS, [3Dmol.js](https://3dmol.org) for in-browser structure visualization
- **Backend**: [Base44](https://base44.com) — entities (data model), a Deno backend function, and an AI agent, all defined as code in `base44/`
- **Computational chemistry**: [NVIDIA BioNeMo](https://build.nvidia.com) hosted NIMs — DiffDock (docking) and Boltz2 (structure + affinity prediction)
- **Public data sources**: RCSB PDB, UniProt, PubChem (all fetched live, no vendored/hardcoded biological data)

## Project structure

```
base44/
├── config.jsonc                    # Base44 project config
├── entities/
│   ├── scenario.jsonc              # Cancer scenario + molecular target schema
│   └── drug.jsonc                  # Candidate drug schema (MOA, adverse effects, computed scores)
├── functions/
│   └── compute-docking/entry.ts    # Calls DiffDock + Boltz2, writes results back to Drug
├── shared/
│   └── pdb.ts                      # RCSB fetch + PDB→sequence parsing, shared by the function
└── agents/
    └── oncology_advisor.jsonc      # Read-only AI agent that explains scores/tradeoffs

scripts/
├── seed.ts                         # Populates the 5 scenarios + 17 drugs from live public APIs
└── compute-all.ts                  # Batch-runs compute-docking + the composite-score pass

src/
├── App.jsx                         # Top-level layout, scenario picker
├── api/base44Client.js             # Base44 SDK client (dev-aware)
├── components/                     # ScenarioList, ScenarioDetail, DrugComparisonTable,
│                                    # DrugDetail, MoleculeViewer (3Dmol), AdvisorChat, ...
└── lib/scoring.js                  # Client-side mirror of the composite-score formula
                                     # (drives the "why this score" breakdown view)
```

## Development

```bash
npm install
npx base44 login
npx base44 dev        # local backend (localhost:4400) + frontend (localhost:5173)
```

Re-seeding or re-running the docking pipeline against the **real** Base44
backend (not the local dev emulator):

```bash
cat scripts/seed.ts | npx base44 exec
cat scripts/compute-all.ts | npx base44 exec
```

## Deployment

**Base44 hosting** (primary):

```bash
npm run build
npx base44 site deploy -y
```

**Render** (static site, talks to the same Base44 backend over the network):
this repo includes a `render.yaml` blueprint — connect the repo in the
Render dashboard ("New +" → "Blueprint") and it will auto-configure the
build (`npm ci && npm run build`, publish `./dist`).

## Limitations & disclaimers

- Binding poses and affinities are **computational predictions** from
  general-purpose structure-prediction/docking models, not experimentally
  validated measurements. They are a reasonable comparative signal, not a
  clinical efficacy score.
- The composite score is an explicit, transparent heuristic (documented in
  `docs/ARCHITECTURE.md`) — it is intentionally *not* a black box, but it is
  also not a substitute for trial data, NCCN guidelines, or a treating
  physician's judgment.
- Adverse-effect and mechanism-of-action text is a curated summary based on
  FDA prescribing information and NCCN guidelines at the time of writing;
  always verify against current labeling before clinical use.
- OncoBind does not diagnose disease, does not recommend a specific
  prescription, and is not a medical device.
