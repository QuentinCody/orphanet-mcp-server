# Orphanet MCP Server

This is a [Model Context Protocol](https://modelcontextprotocol.io) (MCP) server. It lets MCP clients (Claude Desktop, Claude Code, Continue, etc.) query the upstream Orphanet API in natural language. It belongs to the [Bio MCP](../../README.md) monorepo.

## Connect

The server is deployed and ready at:

```
https://orphanet-mcp-server.quentincody.workers.dev/mcp
```

Add it to your MCP client (Claude Desktop → Settings → Developer → Edit Config):

```json
{
  "mcpServers": {
    "orphanet": {
      "command": "npx",
      "args": ["mcp-remote", "https://orphanet-mcp-server.quentincody.workers.dev/mcp"]
    }
  }
}
```

For local development the server runs at `http://localhost:8830/mcp` (start it with `./scripts/dev-servers.sh orphanet`):

```json
{
  "mcpServers": {
    "orphanet-local": {
      "command": "npx",
      "args": ["mcp-remote", "http://localhost:8830/mcp"]
    }
  }
}
```

## Tools

- `orphanet_search` — discover the GET routes captured from the current provider OpenAPI
- `orphanet_execute` — **Code Mode**: use `api.get()` and `searchSpec()` in a V8 isolate; undocumented methods and request bodies are rejected
- `orphanet_query_data` — run SQL over large responses auto-staged into a per-session SQLite database
- `orphanet_get_schema` — inspect the inferred schema of a staged dataset

Large responses (>30KB) are auto-staged into a queryable SQLite database; the tools return a `data_access_id` you can query with SQL.

Every tool has both `orphanet_*` and `mcp_orphanet_*` aliases. Successes and errors include `content`, `structuredContent` and verifiable citations. The complete composed response, including SQL/schema reads, stages above 30 KiB with reserved space for SDK metadata. Follow each returned handle. Native HTTP errors retain status, source URL, a bounded 64 KiB decoded body and its hash/completeness.

## Gene associations

The [Orphadata API](https://api.orphadata.com/openapi.json) exposes gene and disease indexes plus lookups by gene name, symbol, or specific ORPHAcode:

```javascript
return await api.get('/rd-associated-genes/genes/symbols/FBN1');
// The adapter sends lowercase fbn1, as required by this upstream route.
```

For the opposite direction, use `/rd-associated-genes/orphacodes/284963`
(Marfan syndrome type 1). Discover entity codes with
`/rd-associated-genes/orphacodes`: a broad parent such as `558` can return 404
even when a subtype has gene associations. Gene name searches, such as
`/rd-associated-genes/genes/names/fibrillin`, match substrings and may include several genes.

Retain each record's `Date`, association type/status, validation references, and
gene cross-references when joining to HGNC, Ensembl, or UniProt. Candidate and
not-yet-assessed records do not establish causation. Responses retain the
provider's CC-BY-4.0 attribution; the complete gene index auto-stages for SQL.
The [bulk XML release](https://sciences.orphadata.com/genes/) is also available
upstream for offline datasets.

Symbol/name results are disease records and can include other genes' associations. The October 5 `FBN1` read returned 11 diseases containing 38 associations; `fibrillin` returned 12 diseases containing 39. Preserve the entire native result and deliberately filter `Gene.Symbol` only when constructing a selected-gene view. Each association retains its own type, status and validation source. `Date` is a native record date, not a verified release pin.

Staged gene data has `genes` or `disorders` plus `response_context`, which retains the provider count, licence, dataset category/language, request parameters and URI. `gene_associations`, `gene_references`, `gene_synonyms` and `gene_loci` retain ordered child records when populated. Join them with `record_index` and `association_index`; child index columns retain source order. Each row's `native_json` preserves the exact source record. Empty HGNC values remain distinct from null, and reference identifiers remain strings. Canonical `payloads` storage independently preserves the full response.

## Compare a gene association with ClinGen and G2P

Search `orphanet_search` with `category: "workflows"` and the title
`Orphadata gene evidence handoff to ClinGen and G2P`, then execute the returned
code using `orphanet_execute`. Its explicit example selects ORPHAcode `284963`,
`FBN1` and `HGNC:3603`. Replace all three together for another association.
The recipe verifies the subtype and every matching association's HGNC references;
it retains repeated matches and the complete native gene/cross-reference responses.
Provider gene IDs without the `HGNC:` prefix are compared as identifier strings,
without numeric coercion. Conflicting HGNC references prevent a handoff.

Keep this result, including licence, record date, association type/status,
validation references and qualified disease mappings. In `clingen_search`, find
`Compare Orphadata gene handoff with ClinGen and G2P evidence`. Copy the handoff's
selection into that recipe and explicitly select a G2P stable ID from
`/g2p/gene/{symbol}/summary`; the worked example uses `G2P01013`. Execute it in
`clingen_execute`. Handles belong to their originating server; retain the
Orphadata evidence separately when calling ClinGen.

ClinGen assertions are selected by exact HGNC identity from the current export.
The selected G2P record must match its stable ID and `locus.ids.HGNC`. This
establishes a gene-identifier comparison, not disease equivalence or equal
evidence strength. Keep source-specific disease concepts, inheritance, mechanism,
confidence/classification, panel and dates separately. The retained ClinGen
FBN1 export includes both Definitive and Disputed assertions for different
conditions. A candidate or disputed association is never promoted by this recipe.

Source, SQL or combined results can stage. Follow `get_schema`/`query_data` in the
appropriate server. An `inspect_*` step requires the retained staged evidence
before comparison; it does not imply an empty source. Current G2P contract tests
use synthetic responses against the provider's published schema; fresh G2P and
edited Worker acceptance remain pending. See the
[workflow review](../../docs/audits/2026-10-06-gene-disease-workflow-review.md).

## Discovery and language

The catalog includes the provider's documented classification hierarchy/placement, ICD-11, medical-specialty and phenotype indexes. Classification membership lists can repeat ORPHAcodes; they are not unique disease counts. Preserve mapping qualifications and parent/child context. The documented `/rd-medical-specialties/parents` index returned native HTTP 500 on October 5; disease detail can still provide a parent code for the working `/rd-medical-specialties/parents/{parentcode}` route.

Language support is route-specific: cross-reference routes document 12 codes, epidemiology/natural-history routes nine, and phenotype routes seven. Gene, classification and specialty routes do not document language selection. A native gene request with `lang=fr` still reports English and merely echoes that parameter. Retain `datasetCategory.lang` and any `__unfiltered_warning`; do not treat echoed query parameters as proof of translation. HPO multi-lookup uses an array serialized as a comma-separated path segment.

October 5 native/local Worker acceptance covers all five gene routes, the added discovery routes (including the explicit provider failure), complete index/association SQL recovery, language behavior and HPO array interpolation. See the [review and verification](../../docs/audits/2026-10-05-orphanet-review.md). These changes are undeployed; public observations do not establish exhaustive biological coverage or cross-release equivalence.

## Development

```bash
./scripts/dev-servers.sh orphanet            # run locally (port 8830)
pnpm --filter orphanet-mcp-server run deploy   # deploy to Cloudflare Workers
```

See [`docs/adding-mcp-servers.md`](../../docs/adding-mcp-servers.md) and the root [README](../../README.md) for the full architecture (Code Mode, staging, portals).

---

*Auto-generated baseline README — refine with server-specific detail as needed.*

<!-- license-and-data-terms:start -->
## License and data terms

The code in this repository is licensed under the Apache License 2.0 (see `LICENSE`).
If you use it in your work, please cite it (see `CITATION.cff`). Citation is requested, not required.

The license covers the code only. Data that this server returns comes from Orphanet and stays under the terms of that source: CC BY 4.0.
You are responsible for your use of the data under those terms.
<!-- license-and-data-terms:end -->
