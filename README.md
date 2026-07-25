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

Live app: https://backend-f3b88536.base44.app (Base44) &middot; https://oncobind.onrender.com (Render)

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
   database, never invented numbers. No sign-in required.
5. Runs the **same real docking pipeline live** for any drug not in the
   curated list, typed in on the spot.
6. Lets the physician flag patient-specific factors (or upload a lab
   report) to see a transparently-adjusted score, and generate a
   personalized, step-by-step decision report — printable as a PDF.

## How to use OncoBind

No account, sign-up, or installation needed — open a live link and start:

- **Base44 hosting**: https://backend-f3b88536.base44.app
- **Render**: https://oncobind.onrender.com

**1. Pick a scenario.** The home screen lists five molecularly-defined cancer
scenarios (e.g. "EGFR-Mutant Non-Small Cell Lung Cancer"). Each card shows the
molecular target and its PDB structure ID. Click one to open it.

**2. Read the target biology.** The scenario page opens with a plain-language
summary of the molecular target and why it drives that cancer.

**3. Compare the candidates.** The table lists every FDA-approved drug for
that target, ranked by **composite score** — a transparent blend of predicted
binding affinity, docking confidence, and adverse-effect burden (the exact
formula is in [Composite score formula](docs/ARCHITECTURE.md#composite-score-formula)).
Click any row to open its detail view: mechanism of action, adverse effects,
a "why this score" breakdown, and a live 3D viewer showing the drug docked
against the real target structure.

**4. Ask the Oncology Advisor.** The chat panel on the right is grounded only
in the data shown on that page — it won't invent numbers, and it explains its
own scoring math if asked. No sign-in required.

**5. Dock a drug that isn't on the list.** Type any drug name into "Dock a
candidate drug not on this list" to run real DiffDock + Boltz2 computation
against that scenario's target, live (typically under a minute). The result
is shown only in your session — it isn't saved for other visitors.

**6. Personalize for a patient.** Open "Patient context" to flag relevant
clinical factors (cardiac history, hepatic/renal impairment, CNS
involvement, prior TKI exposure) — or upload a lab report to have relevant
flags derived automatically. The table re-ranks with a **patient-adjusted
score**, and each drug's detail view shows exactly which flag matched which
effect and by how much. **Use de-identified or synthetic example data only —
see the on-screen warning; nothing here is saved to a shared record.**

**7. Generate a decision report.** "Generate report" produces a step-by-step
narrative — grounded in the same data, personalized if patient context is
active — that you can print or save as a PDF via "Print / Save as PDF."

Throughout, a persistent banner reminds that OncoBind is a research and
education decision-support tool, not a diagnostic or prescribing device —
see [Limitations](#limitations--disclaimers).

## Scenarios covered

| Cancer scenario | Target | Candidate drugs |
|---|---|---|
| EGFR-mutant NSCLC | EGFR kinase domain (PDB 1M17) | Gefitinib, Erlotinib, Afatinib, Osimertinib |
| BRAF V600E melanoma | BRAF V600E kinase domain (PDB 3OG7) | Vemurafenib, Dabrafenib, Encorafenib |
| HER2+ breast cancer | HER2/ERBB2 kinase domain (PDB 3PP0) | Lapatinib, Neratinib, Tucatinib |
| CML (BCR-ABL1+) | ABL1 kinase domain (PDB 2HYY) | Imatinib, Nilotinib, Dasatinib, Ponatinib |
| ALK+ NSCLC | ALK kinase domain (PDB 2XP2) | Crizotinib, Alectinib, Lorlatinib |

...plus any drug a physician types into "Dock a candidate drug not on this
list," docked live against the same target. Target sequences come from
UniProt, structures from RCSB PDB, and drug identifiers/SMILES from
PubChem — fetched live, not hand-typed. See
[`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for the full data pipeline,
every backend function, and the exact scoring formulas.

## Tech stack

- **Frontend**: React 18 + Vite, Tailwind CSS, [3Dmol.js](https://3dmol.org) for in-browser structure visualization
- **Backend**: [Base44](https://base44.com) — entities (data model) and five Deno backend functions, all defined as code in `base44/`
- **AI**: Base44's AI Gateway (Claude Sonnet — see note below) for the chat advisor, live-candidate descriptions, and personalized reports; all anonymous-capable, no login required
- **Computational chemistry**: [NVIDIA BioNeMo](https://build.nvidia.com) hosted NIMs — DiffDock (docking) and Boltz2 (structure + affinity prediction)
- **Public data sources**: RCSB PDB, UniProt, PubChem (all fetched live, no vendored/hardcoded biological data)

> **Note on model choice**: Claude Opus is not available on this app's
> current Base44 AI Gateway plan (confirmed by direct probing — Opus model
> IDs return `model_not_found`, not a quota error). The app uses
> `claude_sonnet_4_6`, the strongest model actually available on the
> gateway.

## Project structure

```
base44/
├── config.jsonc                      # Base44 project config
├── entities/
│   ├── scenario.jsonc                # Cancer scenario + molecular target schema
│   └── drug.jsonc                    # Candidate drug schema (MOA, adverse effects, computed scores)
├── functions/
│   ├── compute-docking/entry.ts      # Dock a curated Drug, persist results
│   ├── dock-candidate/entry.ts       # Dock a user-typed drug live, session-only (not persisted)
│   ├── oncology-chat/entry.ts        # Anonymous-capable grounded chat (AI Gateway)
│   └── oncology-report/entry.ts      # Personalized step-by-step decision report (AI Gateway)
├── shared/
│   ├── pdb.ts                        # RCSB fetch + PDB→sequence parsing
│   ├── docking.ts                    # DiffDock + Boltz2 calls, shared by both docking functions
│   ├── pubchem.ts                    # Drug-name → SMILES resolution
│   ├── oncology-prompt.ts            # Shared grounding/disclaimer system prompt
│   └── patient-context.ts            # Server-side mirror of the patient-adjustment formula
└── (no agents — the AI Gateway replaced the old agents-based chat; see ARCHITECTURE.md)

scripts/
├── seed.ts                           # Populates the 5 scenarios + 17 drugs from live public APIs
├── fix-smiles.ts                     # One-off backfill (see "Known issues" in ARCHITECTURE.md)
└── compute-all.ts                    # Batch-runs compute-docking + the composite-score pass

src/
├── App.jsx                           # Top-level layout, scenario picker
├── api/base44Client.js               # Base44 SDK client (dev-aware)
├── components/                       # ScenarioList, ScenarioDetail, DrugComparisonTable,
│                                      # DrugDetail, MoleculeViewer (3Dmol), AdvisorChat,
│                                      # CandidateDrugForm, PatientContextPanel, DecisionReport, ...
└── lib/
    ├── scoring.js                    # Client-side mirror of the composite-score formula
    └── patientContext.js             # Client-side mirror of the patient-adjustment formula
```

## Development

```bash
npm install
npx base44 login
npx base44 dev        # local backend (localhost:4400) + frontend (localhost:5173)
```

Re-seeding or re-running the docking pipeline against the **real** Base44
backend (not the local dev emulator, which doesn't mirror secrets):

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

**Render** (Docker web service — see `Dockerfile`, which builds the Vite app
and serves `dist/` with `serve`, listening on Render's injected `$PORT`):
auto-deploys on push to `claude/base44-create-3yhg90`, configured via
`render.yaml`.

## Limitations & disclaimers

- Binding poses and affinities are **computational predictions** from
  general-purpose structure-prediction/docking models, not experimentally
  validated measurements. They are a reasonable comparative signal, not a
  clinical efficacy score.
- The composite score and the patient-context adjustment are both explicit,
  transparent heuristics (documented in `docs/ARCHITECTURE.md`) — neither is
  a black box, but neither is a substitute for trial data, NCCN guidelines,
  or a treating physician's judgment.
- Adverse-effect and mechanism-of-action text for the 17 curated drugs is a
  curated summary based on FDA prescribing information and NCCN guidelines
  at the time of writing; text for live-docked candidate drugs is
  AI-generated and explicitly labeled as such. Always verify against
  current labeling before clinical use.
- The patient-context feature is demo-safe by design: an explicit on-screen
  warning against uploading real patient-identifiable data, and nothing
  entered there is persisted to a shared entity — it exists only in that
  browser session.
- OncoBind does not diagnose disease, does not recommend a specific
  prescription, and is not a medical device.
