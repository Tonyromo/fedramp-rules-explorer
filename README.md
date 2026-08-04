# FedRAMP Rules Explorer

A small, read-only web application for exploring the machine-readable FedRAMP Consolidated Rules for 2026.

## Current capabilities

- Loads the official FedRAMP rules JSON directly from the `FedRAMP/rules` repository.
- Normalizes definitions, process requirements, and Key Security Indicators for presentation.
- Provides dataset totals and requirement-force summaries.
- Supports global fuzzy search across IDs, terms, statements, controls, artifacts, and metadata.
- Provides dedicated browse views for definitions, rules, and indicators.
- Displays the authoritative source path for every record.

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

The application does not modify, reinterpret, or replace the official rule wording. It is an independent visualization tool and is not an official FedRAMP product.

## Planned next steps

- Schema validation against the official JSON Schema.
- Detailed record pages with class-specific variants.
- Framework, class, process, force, control, and artifact filters.
- Cross-links between definitions, requirements, indicators, and controls.
- Local bookmarks and collections.
- Version comparison and change visualization.
