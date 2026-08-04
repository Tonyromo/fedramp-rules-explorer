# Source Integrity

The FedRAMP Rules Explorer is a read-only viewer of the official FedRAMP consolidated rules. It does not edit, correct, shorten, paraphrase, or replace FedRAMP source content.

## Canonical source

The canonical source is the official `FedRAMP/rules` GitHub repository. The application retrieves:

- `fedramp-consolidated-rules.json`
- `schemas/fedramp-consolidated-rules.schema.json`

The application treats the exact response text from these files as immutable source material.

## Loading and verification

For every successful live load, the application:

1. Retrieves the dataset and schema as text without modification.
2. Parses the retrieved text as JSON.
3. Validates the dataset against the official schema.
4. Calculates a SHA-256 digest of the exact retrieved text for both files.
5. Stores the exact source text, digests, and retrieval time as the last known valid cache.
6. Creates read-only navigation records from the validated parsed data.

The normalization layer exists only to support navigation, filtering, and display. It must not write changes back to the source or present derived wording as official FedRAMP text.

## Cache behavior

When the official source cannot be reached, the application may use the last known valid local cache. Before use, it recalculates both SHA-256 digests and rejects the cache if either digest differs from the value recorded when the source was retrieved.

A failed live load with no valid cache stops the application. The application must fail closed rather than display unvalidated or silently repaired content.

## Presentation rules

Official content and locally derived information must remain distinguishable:

- Official rule text is displayed as source content.
- Source paths identify the exact location within the consolidated dataset.
- Search indexes, relationships, tags, and filters are application metadata.
- Explanations or guidance added in the future must be explicitly labelled non-authoritative and kept separate from official text.

## Prohibited behavior

The application must not:

- silently alter malformed source content;
- rewrite FedRAMP statements for readability;
- merge derived guidance into official wording;
- allow source text to be edited through the interface;
- represent cached or derived content as a newly published FedRAMP source;
- continue loading when schema validation or cache integrity verification fails.
