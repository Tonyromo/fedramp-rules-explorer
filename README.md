# FedRAMP Rules Explorer

A lightweight, read-only web application for exploring the machine-readable FedRAMP Consolidated Rules for 2026.

## Current capabilities

- Loads the official FedRAMP rules JSON directly from the `FedRAMP/rules` repository.
- Preserves the official source wording and displays the authoritative source path for each record.
- Normalizes definitions, process requirements, controls, and Key Security Indicators for presentation.
- Provides dataset totals and requirement-force summaries.
- Supports global fuzzy search across IDs, terms, statements, controls, artifacts, and metadata.
- Provides dedicated browse views for definitions, rules, indicators, and controls.
- Provides detailed record pages with cross-links between related rules, indicators, controls, and processes.
- Includes a relationship viewer for control records with:
  - Clickable graph nodes and node detail cards.
  - Breadcrumb navigation.
  - Hover and focus relationship highlighting.
  - Relationship explanations and source-backed reasoning.
  - Radial, hierarchical, tree, and force layouts.
  - Mini-map navigation.
  - Graph search by node ID, label, or type.
  - Pinning and dragging of nodes while preserving pinned positions across layout changes.
  - Dataset-derived relationship counts and supporting evidence.

## Run locally

```bash
npm install
npm run dev
```

## Production build

```bash
npm run build
npm run preview
```

## Data source

The application currently retrieves:

```text
https://raw.githubusercontent.com/FedRAMP/rules/main/fedramp-consolidated-rules.json
```

The application does not modify, reinterpret, or replace the official rule wording. Derived presentation metadata and relationship guidance are kept separate from the source data and are clearly identified in the interface.

This is an independent visualization tool and is not an official FedRAMP product.

## Planned next steps

- Schema validation against the official JSON Schema.
- Framework, class, process, force, control, and artifact filters.
- Local bookmarks and collections.
- Version comparison and change visualization.
- Export and print-friendly views.
