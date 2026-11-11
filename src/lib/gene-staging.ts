import type { SchemaHints } from "@bio-mcp/shared/staging/schema-inference";

type Row = Record<string, unknown>;
const object = (value: unknown): value is Row => value !== null && typeof value === "object" && !Array.isArray(value);
const items = (value: unknown): unknown[] => Array.isArray(value) ? value : [];

export function orphanetEnvelope(value: unknown): unknown {
  return object(value) && Array.isArray(value.content) && object(value.structuredContent) ? value.structuredContent.data : value;
}

/** Unwrap only the SQL projection; canonical evidence keeps the native envelope. */
export function orphanetResults(value: unknown): unknown {
  const data = orphanetEnvelope(value);
  return object(data) && object(data.data) && "results" in data.data ? data.data.results : data;
}

/** Ordered, source-linked gene evidence; no association or identifier deduplication. */
export function geneTables(value: unknown): Record<string, Row[]> | undefined {
  const data = orphanetEnvelope(value);
  if (!object(data) || typeof data.uri !== "string" || !object(data.data) || !("results" in data.data)) return undefined;
  let path: string;
  try { path = new URL(data.uri, "https://api.orphadata.com").pathname; } catch { return undefined; }
  if (!path.startsWith("/rd-associated-genes/")) return undefined;
  const { results, ...metadata } = data.data;
  const rows = Array.isArray(results) ? results : object(results) ? [results] : [];
  const tables: Record<string, Row[]> = { response_context: [{ native_json: JSON.stringify({ ...data, data: metadata }), results_shape: Array.isArray(results) ? "array" : typeof results }] };
  if (path === "/rd-associated-genes/genes") {
    tables.genes = rows.map((value, record_index) => { const row = object(value) ? value : {}; return { record_index, HGNC: row.HGNC ?? null, name: row.name ?? null, symbol: row.symbol ?? null, native_json: JSON.stringify(value) }; });
    return tables;
  }
  tables.disorders = rows.map((value, record_index) => { const row = object(value) ? value : {}; return { record_index, ORPHAcode: row.ORPHAcode ?? null,
    preferred_term: row["Preferred term"] ?? null, date: row.Date ?? null, disorder_group: row.DisorderGroup ?? null,
    typology: row.Typology ?? null, native_json: JSON.stringify(value) }; });
  const associations: Row[] = [];
  const references: Row[] = [];
  const synonyms: Row[] = [];
  const loci: Row[] = collectGeneAssociations(rows, associations, references, synonyms);
  Object.assign(tables, { gene_associations: associations, gene_references: references, gene_synonyms: synonyms, gene_loci: loci });
  return tables;
}

export const geneSchemaHints: SchemaHints = { columnTypes: {
  native_json: "TEXT", HGNC: "TEXT", name: "TEXT", symbol: "TEXT", preferred_term: "TEXT", date: "TEXT", disorder_group: "TEXT", typology: "TEXT",
  association_type: "TEXT", association_status: "TEXT", validation_source: "TEXT", gene_name: "TEXT", gene_type: "TEXT",
  source: "TEXT", reference: "TEXT", value: "TEXT", gene_locus: "TEXT", results_shape: "TEXT",
} };

function collectGeneAssociations(rows: unknown[], associations: Row[], references: Row[], synonyms: Row[]) {
  const loci: Row[] = [];
  rows.forEach((row, record_index) => {
    if (!object(row)) return;
    items(row.DisorderGeneAssociation).forEach((association, association_index) => {
      if (!object(association)) return;
      const gene = object(association.Gene) ? association.Gene : {};
      const identity = { record_index, association_index };
      associations.push({
        ...identity, ORPHAcode: row.ORPHAcode ?? null, date: row.Date ?? null,
        association_type: association.DisorderGeneAssociationType ?? null, association_status: association.DisorderGeneAssociationStatus ?? null,
        validation_source: association.SourceOfValidation ?? null, symbol: gene.Symbol ?? null, gene_name: gene.name ?? null,
        gene_type: gene.GeneType ?? null, native_json: JSON.stringify(association)
      });
      items(gene.ExternalReference).forEach((reference, reference_index) => {
        if (object(reference)) references.push({ ...identity, reference_index, source: reference.Source ?? null, reference: reference.Reference ?? null, native_json: JSON.stringify(reference) });
      });
      items(gene.Synonym).forEach((synonym, synonym_index) => { synonyms.push({ ...identity, synonym_index, value: synonym, native_json: JSON.stringify(synonym) }); });
      items(gene.Locus).forEach((locus, locus_index) => {
        if (object(locus)) loci.push({ ...identity, locus_index, gene_locus: locus.GeneLocus ?? null, locus_key: locus.LocusKey ?? null, native_json: JSON.stringify(locus) });
      });
    });
  });
  return loci;
}
