# OncoBind — Architecture

## System overview

OncoBind is a single-page React app backed entirely by Base44 (data and five
backend functions) plus external NVIDIA BioNeMo NIM APIs for the actual
computational chemistry and Base44's AI Gateway for language generation.
There is no separate application server: the frontend talks directly to
Base44 over the SDK, and Base44's backend functions talk directly to
NVIDIA's hosted inference endpoints and Base44's own AI Gateway.

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
        CD["compute-docking"]
        DC["dock-candidate\n(session-only, not persisted)"]
        Chat["oncology-chat"]
        Report["oncology-report"]
        Gateway["AI Gateway\n(asServiceRole — anonymous-capable)"]
    end

    Seed["scripts/seed.ts\n(one-time, base44 exec)"] --> UniProt
    Seed --> RCSB
    Seed --> PubChem
    Seed --> Scenario
    Seed --> Drug

    ComputeAll["scripts/compute-all.ts\n(batch driver)"] -->|invoke per drug| CD
    CD --> RCSB
    CD --> DiffDock
    CD --> Boltz2
    CD -->|write docking/affinity fields| Drug
    ComputeAll -->|write composite_score\n(per-scenario normalization)| Drug

    DC --> PubChem
    DC --> RCSB
    DC --> DiffDock
    DC --> Boltz2
    DC --> Gateway

    Chat --> Scenario
    Chat --> Drug
    Chat --> Gateway

    Report --> Gateway

    subgraph Frontend (React + Vite)
        UI[ScenarioDetail / DrugDetail / DrugComparisonTable]
        Viewer["MoleculeViewer (3Dmol.js)"]
        AdvisorChat
        CandidateDrugForm
        PatientContextPanel
        DecisionReport
    end

    UI -->|list/filter| Scenario
    UI -->|list/filter| Drug
    Viewer -->|fetch receptor PDB directly| RCSB
    AdvisorChat -->|functions.invoke| Chat
    CandidateDrugForm -->|functions.invoke| DC
    PatientContextPanel -->|UploadFile + ExtractDataFromUploadedFile| Gateway
    DecisionReport -->|functions.invoke| Report
```

## Data model

### `Scenario` (`base44/entities/scenario.jsonc`)

One row per cancer-type + molecular-target pairing. `target_pdb_id` and
`target_uniprot_id` are the only hand-curated fields; `target_sequence` is
fetched from UniProt by the seed script. The receptor **structure** itself
(the large PDB file) is deliberately *not* stored in the database — Base44
entity fields have a size ceiling well below a ~200KB PDB file, and there's
no reason to duplicate RCSB's own hosting. Both `compute-docking`/
`dock-candidate` and the frontend's `MoleculeViewer` resolve `target_pdb_id`
against `files.rcsb.org` directly, on demand.

### `Drug` (`base44/entities/drug.jsonc`)

One row per curated candidate drug per scenario (`scenario_id` foreign key).
`smiles` is resolved from PubChem by name at seed time (preferring
`IsomericSMILES`, falling back through PubChem's several historical property
key names — see [Known issues](#known-issues-worth-knowing-about) below).
`mechanism_summary`, `adverse_effects`, and `black_box_warning` are curated
text. `docking_confidence`, `best_pose_sdf`, `affinity_pic50`,
`affinity_probability_binding`, and `composite_score` start `null` and are
filled in by the compute pipeline.

Row-level security on both entities: public read, admin-only write — the
data is reference content curated by the app owner, not user-generated.
**On-demand candidate drugs (from `dock-candidate`) are never written to
this entity** — see below.

## The curated compute pipeline

`base44/functions/compute-docking/entry.ts`, given a `drugId`:

1. Loads the `Drug` and its parent `Scenario` via service role.
2. Fetches the receptor structure from RCSB (`base44/shared/pdb.ts`), and
   derives the **crystallized construct's amino-acid sequence directly from
   the PDB `ATOM` records** (not the full UniProt sequence) — this keeps
   what DiffDock docks against and what Boltz2 folds perfectly consistent,
   and keeps Boltz2 focused on the relevant kinase domain rather than
   attempting to fold an entire multi-domain receptor.
3. Calls DiffDock and Boltz2 (`base44/shared/docking.ts`, shared with
   `dock-candidate` below) and writes the results back onto the `Drug`
   record via `asServiceRole`.

Both NIM calls use a shared `NGC_API_KEY` secret (Base44 secrets store,
injected as `Deno.env.get("NGC_API_KEY")` — never present in frontend code
or in the repo).

`scripts/compute-all.ts` is the batch driver: it calls the function once per
drug that doesn't yet have a `docking_confidence`, then runs a **second
pass** per scenario to compute `composite_score` — a second pass because the
score is a *relative* comparison across a scenario's drugs, so it needs
every sibling's raw value before it can normalize any one of them.

## Live on-demand docking

`base44/functions/dock-candidate/entry.ts` lets a physician dock a drug that
isn't in the curated list, computed live: resolve SMILES via PubChem
(`base44/shared/pubchem.ts`), fetch the receptor, run the same DiffDock +
Boltz2 pipeline, generate a one-sentence mechanism description via the AI
Gateway, and **return the full result without writing to any entity**.
Anonymous, unmoderated free-text input creating permanent public records
visible to every future visitor is a data-quality/abuse problem for a public
demo, so the result lives only in that browser's session state
(`ScenarioDetail.jsx` holds it in the same in-memory `drugs` array as the
curated ones, tagged `is_candidate: true`). It's deliberately excluded from
`composite_score` (no curated adverse-effect data exists to weigh safety —
treating an empty array as "zero adverse effects" would be misleading) and
from other drugs' score-normalization pool (`src/lib/scoring.js` filters
`is_candidate` out before computing min/max).

## AI Gateway usage (chat, live-candidate description, reports)

The original design used a Base44 **agent** (`base44.agents`) for the chat
advisor. That module requires a logged-in user, and the app has no sign-in
flow, so every anonymous visitor hit a hard "sign in to communicate" wall —
a real bug found via live testing after deployment. It's replaced by direct
calls to Base44's **AI Gateway**, an OpenAI-compatible endpoint over Base44's
managed models (`base44.aiGateway`/`base44.asServiceRole.aiGateway`,
`.claude/skills/base44-sdk/references/ai-gateway.md`). Anonymous callers get
an **empty token** from the non-service-role gateway connection, so every
function here uses `base44.asServiceRole.aiGateway.connection()` instead,
which works regardless of caller auth state — appropriate here since there's
no per-user identity to scope to anyway (it's a public chat feature, not
user-owned data).

Three functions use it:
- **`oncology-chat/entry.ts`** — the chat advisor. Stateless; the frontend
  (`AdvisorChat.jsx`) resends recent turns as `history` on each call rather
  than relying on a persisted conversation object.
- **`dock-candidate/entry.ts`** — a one-sentence mechanism description for
  the live-docked drug (wrapped in try/catch with a graceful fallback
  string, since it's a nice-to-have alongside the real docking result, not
  the point of the call).
- **`oncology-report/entry.ts`** — the personalized decision report (below).

All three share one system prompt (`base44/shared/oncology-prompt.ts`) —
carried over from the retired `oncology_advisor` agent's instructions
verbatim: ground every claim only in the provided scenario/drug data, state
the composite-score formula exactly when asked, never recommend a specific
prescription, end substantive responses with the decision-support
disclaimer.

**Model note**: Claude Opus is not available on this app's Base44 AI Gateway
plan — confirmed by direct probing (`chat/completions` with an Opus model ID
returns `404 model_not_found`, not a quota error, while `claude_sonnet_4_6`
and `automatic` both validate). All three functions use `claude_sonnet_4_6`,
the strongest model actually available. Separately, this app's monthly
integration-credit quota was exhausted during development (the same
100-credit free-tier cap hit earlier by `UploadFile`), which blocks any
gateway call with a 402 surfaced as a 500 — an account/billing constraint,
not a code defect; every function here was verified correct up to that
point (real data fetched, real request sent, error handled gracefully) via
direct `base44 exec` calls before being wired into the UI.

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
  (not globally, and excluding on-demand candidates — see above).
- `adverse_norm` is a severity-weighted burden: black-box warning = 3,
  serious = 1, common = 0.3, summed per drug, then min-max normalized the
  same way.
- Implemented in both `scripts/compute-all.ts` (writes the persisted
  `composite_score`) and `src/lib/scoring.js` (drives the client-side "why
  this score" breakdown bars, since the normalized sub-scores aren't
  themselves persisted).

## Patient-context adjustment formula

A second, separate transparent formula layers on top of `composite_score`
when a physician flags patient factors or uploads a lab report
(`PatientContextPanel.jsx`, `src/lib/patientContext.js`, mirrored
server-side in `base44/shared/patient-context.ts` for the report
generator):

```
patient_adjusted_score = clamp(
    composite_score
  − (matched adverse-effect severity weight × 8)   // penalty flags
  + (10 × count of matched relevant-mechanism flags), // bonus flags
  0, 100
)
```

Five flags, each an explicit keyword match against real data (never a model
judgment):
- **Penalty** flags (match against `adverse_effects[].effect` text): cardiac
  history/QT risk, hepatic impairment, renal impairment.
- **Bonus** flags (match against `mechanism_summary` text): CNS
  involvement/brain metastases (rewards CNS-penetrant drugs), prior TKI
  exposure/resistance concern (rewards drugs whose mechanism specifically
  addresses resistance mutations, e.g. T790M, T315I, G1202R).

Uploading a lab report (`integrations.Core.UploadFile` +
`ExtractDataFromUploadedFile` with a small JSON schema for common panel
values) auto-derives penalty flags from out-of-range values using
deliberately simple, stated thresholds (ALT/AST > 40 U/L, eGFR < 60,
QTc > 450ms) — a research/education heuristic, not a validated clinical
interpretation rule set. The panel carries an explicit on-screen warning
against uploading real patient-identifiable data; nothing here is written
to a shared entity, only held in client state for that session (Base44's
own file storage is an inherent side effect of the `UploadFile` step, which
the warning covers).

## Known issues worth knowing about

- **PubChem property aliasing**: PubChem's PUG REST API has, across
  versions, returned the requested `CanonicalSMILES` property under
  different response keys (`ConnectivitySMILES` in the version this project
  hit). `fetchPubChemSmiles()` (`base44/shared/pubchem.ts`, and duplicated
  inline in `scripts/seed.ts` since exec scripts can't import project
  files) checks `IsomericSMILES → CanonicalSMILES → ConnectivitySMILES →
  SMILES` in order rather than trusting the requested key name.
  `scripts/fix-smiles.ts` is the one-off backfill script used to repair
  records seeded before this fix.
- **DiffDock confidence is not a 0–1 probability.** It's the raw output of
  DiffDock's confidence model, commonly negative even for reasonable poses
  (observed roughly −2 to +0.4 across the curated 17 drugs). Every formula
  here only ever uses it in a relative, within-scenario min-max
  normalization — never as an absolute score.
- **Claude Opus unavailable / quota exhaustion** — see the AI Gateway
  section above.
