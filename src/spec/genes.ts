import type { ApiEndpoint, WorkflowRecipe } from "@bio-mcp/shared/codemode/catalog";

export const geneNotes =
  "- Gene association routes are available. Gene-symbol lookup requires lowercase upstream; the adapter normalizes FBN1 to fbn1. Name lookup is a substring search and can return several genes.\n" +
  "- Discover associated disease entities via /rd-associated-genes/orphacodes. Associations may attach to a specific subtype (Marfan syndrome type 1: 284963), not a broader parent (558). A 404 is not proof of no genetic association.\n" +
  "- Keep Date, __licence, DisorderGeneAssociationStatus, DisorderGeneAssociationType and SourceOfValidation, plus gene cross-references. Candidate/not-yet-assessed associations must not be presented as established causation.\n" +
  "- Symbol/name results are disease records and may include associations to OTHER genes. Preserve all native records; filter Gene.Symbol explicitly only for a selected-gene view. Do not silently transfer another gene's evidence status to the requested gene.\n" +
  "- Gene/classification/specialty routes do not document lang. Echoed query parameters do not prove translation; retain datasetCategory.lang. Date is the provider record date, not a verified scientific release pin.\n" +
  "- Staged gene data exposes genes or disorders, response_context, gene_associations, gene_references, gene_synonyms and gene_loci when populated. Join children by record_index and association_index; native_json retains exact source records. Use get_schema because SQL results can themselves stage.\n";

export const geneEndpoints: ApiEndpoint[] = [
  { method: "GET", path: "/rd-associated-genes/genes", category: "gene", summary: "List associated gene names, symbols and HGNC IDs; the full index auto-stages" },
  {
    method: "GET", path: "/rd-associated-genes/genes/names/{name}", category: "gene", summary: "Find disease associations by substring of gene name; preserve each returned gene and qualification",
    pathParams: [{ name: "name", type: "string", required: true, description: "Gene name substring, e.g. fibrillin" }],
    example: "return await api.get('/rd-associated-genes/genes/names/fibrillin');",
  },
  {
    method: "GET", path: "/rd-associated-genes/genes/symbols/{symbol}", category: "gene", summary: "Get rare-disease associations for a gene symbol; the adapter normalizes upstream case",
    pathParams: [{ name: "symbol", type: "string", required: true, description: "Gene symbol, e.g. FBN1; sent to the provider as fbn1" }],
    example: "return await api.get('/rd-associated-genes/genes/symbols/FBN1');",
  },
  { method: "GET", path: "/rd-associated-genes/orphacodes", category: "gene", summary: "List specific disease entities with gene associations; discover valid ORPHAcodes before querying" },
  {
    method: "GET", path: "/rd-associated-genes/orphacodes/{orphacode}", category: "gene", summary: "Get a disease entity's genes with association type/status, validation references and record date",
    pathParams: [{ name: "orphacode", type: "number", required: true, description: "Code from the associated-disease index; e.g. 284963 for Marfan syndrome type 1" }],
    example: "return await api.get('/rd-associated-genes/orphacodes/284963');",
  },
];

export const geneWorkflows: WorkflowRecipe[] = [
  { title: "Gene to rare diseases with association qualifications", keywords: ["gene", "FBN1", "candidate", "validation", "association"],
    description: "Read the complete native disease records for a symbol. Preserve stage/error handles, dates, licence and other genes' associations; query gene_associations by symbol only when intentionally selecting that gene.",
    code: `const result = await api.get("/rd-associated-genes/genes/symbols/FBN1");
if (result.__api_error || result.__stage_error || result.__staged) return result;
return {native: result, complete: false, interpretation: "Disease records may include other genes; status and validation belong to each association."};` },
  { title: "Disease subtype to qualified genes and cross-references", keywords: ["ORPHAcode", "Marfan", "HGNC", "Ensembl", "gene"],
    description: "Read a discovered disease subtype without substituting its broader parent. Cross-references identify source gene records and do not establish causation or disease equivalence.",
    code: `const result = await api.get("/rd-associated-genes/orphacodes/284963");
if (result.__api_error || result.__stage_error || result.__staged) return result;
return {native: result, complete: false, interpretation: "Retain each association's type, status, validation, gene identifiers and native record date."};` },
];
