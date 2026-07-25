# OncoBind — Architecture

## System overview

OncoBind is a single-page React app backed entirely by Base44 (data,
authentication, AI agent, and one backend function) plus two external NVIDIA
BioNeMo NIM APIs for the actual computational chemistry. There is no separate
application server: the frontend talks directly to Base44 over the SDK, and
Base44's backend function talks directly to NVIDIA's hosted inference
endpoints.

```mermaid
flowchart TB
    subgraph External data sources
        UniProt[UniProt REST API]
        RCSB[RCSB PDB]
        PubChem[PubChem PUG REST API]
    end

    subgraph NVIDIA BioNeMo NIMs
        DiffDock[DiffDock — docking]
        Boltz2[Boltz2 — structure + affinity]
    end

    subgraph Base44 backend
        Scenario[(Scenario entity)]
        Drug[(Drug entity)]
        Fn["compute-docking\nbackend function"]
        Agent["oncology_advisor\nAI agent (read-only)"]
    end

    Seed["scripts/seed.ts\n(one-time, base44 exec)"] -->|fetch sequence| UniProt
    Seed -->|validate PDB id| RCSB
    Seed -->|resolve SMILES| PubChem
    Seed -->|create records| Scenario
    Seed -->|create records| Drug

    ComputeAll["scripts/compute-all.ts\n(base44 exec, batch driver)"] -->|invoke per drug| Fn
    Fn -->|fetch receptor + derive sequence| RCSB
    Fn -->|dock ligand| DiffDock
    Fn -->|predict affinity| Boltz2
    Fn -->|write docking_confidence, best_pose_sdf,\naffinity_pic50, affinity_probability_binding| Drug
    ComputeAll -->|write composite_score\n(per-scenario normalization)| Drug

    subgraph Frontend (React + Vite)
        UI[App.jsx / ScenarioDetail / DrugDetail]
        Viewer["MoleculeViewer\n(3Dmol.js)"]
        Chat[AdvisorChat]
    end

    UI -->|list/filter| Scenario
    UI -->|list/filter| Drug
    Viewer -->|fetch receptor PDB directly| RCSB
    Chat -->|createConversation / addMessage| Agent
    Agent -->|read-only| Scenario
    Agent -->|read-only| Drug
```

## Data model

### `Scenario` (`base44/entities/scenario.jsonc`)

One row per cancer-type + molecular-target pairing. `target_pdb_id` and
`target_uniprot_id` are the only hand-curated fields; `target_sequence` is
fetched from UniProt by the seed script. The receptor **structure** itself
(the large PDB file) is deliberately *not* stored in the database — Base44
entity fields have a size ceiling well below a ~200KB PDB file, and there's
no reason to duplicate RCSB's own hosting. Both the `compute-docking`
function and the frontend's `MoleculeViewer` resolve `target_pdb_id` against
`files.rcsb.org` directly, on demand.

### `Drug` (`base44/entities/drug.jsonc`)

One row per candidate drug per scenario (`scenario_id` foreign key).
`smiles` is resolved from PubChem by name at seed time (preferring
`IsomericSMILES`, falling back through PubChem's several historical property
key names — see [Known issues](#known-issues-worth-knowing-about) below).
`mechanism_summary`, `adverse_effects`, and `black_box_warning` are curated
text. `docking_confidence`, `best_pose_sdf`, `affinity_pic50`,
`affinity_probability_binding`, and `composite_score` start `null` and are
filled in by the compute pipeline.

Row-level security on both entities: public read, admin-only write — the
data is reference content curated by the app owner, not user-generated.

## The compute pipeline

`base44/functions/compute-docking/entry.ts` is a Base44 backend function
(Deno, deployed) that, given a `drugId`:

1. Loads the `Drug` and its parent `Scenario` via service role.
2. Fetches the receptor structure from RCSB (`base44/shared/pdb.ts`), and
   derives the **crystallized construct's amino-acid sequence directly from
   the PDB `ATOM` records** (not the full UniProt sequence) — this keeps
   what DiffDock docks against and what Boltz2 folds perfectly consistent,
   and keeps Boltz2 focused on the relevant kinase domain rather than
   attempting to fold an entire multi-domain receptor.
3. Calls DiffDock (`POST /v1/biology/mit/diffdock`) with the receptor's
   `ATOM`-only text and the drug's SMILES, requesting 10 poses, and keeps
   the top-ranked pose (`ligand_positions[0]`) and its confidence
   (`position_confidence[0]`).
4. Calls Boltz2 (`POST /v1/biology/mit/boltz2/predict`) with
   `predict_affinity: true` for the same ligand against the derived
   sequence, and reads `affinity_pic50` / `affinity_probability_binary`.
5. Writes all four values plus `computed_at` back onto the `Drug` record via
   `asServiceRole`.

Both NIM calls use a shared `NGC_API_KEY` secret (Base44 secrets store,
injected as `Deno.env.get("NGC_API_KEY")` — never present in frontend code
or in the repo).

`scripts/compute-all.ts` is the batch driver: it calls the function once per
drug that doesn't yet have a `docking_confidence`, then runs a **second
pass** per scenario to compute `composite_score` — this has to be a second
pass because the score is a *relative* comparison across a scenario's
drugs, so it needs every sibling's raw value before it can normalize any one
of them.

## Composite score formula

```
composite_score = 100 × clamp(
    0.45 × pic50_norm
  + 0.35 × docking_norm
  + 0.20 × (1 − adverse_norm)
)
```

- `pic50_norm`, `docking_norm`, and `adverse_norm` are each **min-max
  normalized only across the other candidate drugs in the same scenario**
  (not globally) — different targets have different absolute affinity and
  docking-confidence scales, so only within-scenario comparisons are
  meaningful.
- `adverse_norm` is a severity-weighted burden: black-box warning = 3,
  serious = 1, common = 0.3, summed per drug, then min-max normalized the
  same way.
- The exact same formula is implemented twice, deliberately: once in
  `scripts/compute-all.ts` (writes the persisted `composite_score`), and
  once in `src/lib/scoring.js` (drives the client-side "why this score"
  breakdown bars, since the three normalized sub-scores aren't themselves
  persisted). The `oncology_advisor` agent's instructions also state this
  formula verbatim, so it can explain it accurately on request.

## AI agent

`oncology_advisor` (`base44/agents/oncology_advisor.jsonc`) has **read-only**
tool access to `Scenario` and `Drug` — it cannot create, update, or delete
data. Its instructions require it to ground every claim in the actual
records it reads (never invent a PDB ID, binding number, or adverse effect),
to explicitly say when a field is `null`/not yet computed rather than
guessing, and to end substantive responses with a decision-support
disclaimer. It never recommends a specific prescription.

## Known issues worth knowing about

- **PubChem property aliasing**: PubChem's PUG REST API has, across
  versions, returned the requested `CanonicalSMILES` property under
  different response keys (`ConnectivitySMILES` in the version this project
  hit). `fetchPubChemSmiles()` in `scripts/seed.ts` now checks
  `IsomericSMILES → CanonicalSMILES → ConnectivitySMILES → SMILES` in order
  rather than trusting the requested key name. `scripts/fix-smiles.ts` is
  the one-off backfill script that was used to repair records seeded before
  this fix.
- **DiffDock confidence is not a 0–1 probability.** It's the raw output of
  DiffDock's confidence model, which is commonly negative even for
  reasonable poses (this project observed roughly −2 to +0.4 across 17
  drugs). The composite-score formula only ever uses it in a relative,
  within-scenario min-max normalization — never as an absolute score.
