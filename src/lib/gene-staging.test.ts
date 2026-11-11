/// <reference types="node" />
import { readFileSync } from "node:fs";
import { URL } from "node:url";
import { expect, it } from "vitest";
import { geneTables, orphanetResults } from "./gene-staging";

const fixture = (name: string) => JSON.parse(readFileSync(new URL(`./fixtures/${name}.json`, import.meta.url), "utf8"));

it("retains every native FBN1 disease and each gene's independently qualified association", () => {
  const native = fixture("gene-symbol");
  const tables = geneTables(native)!;
  expect(tables.disorders).toHaveLength(11);
  expect(tables.gene_associations).toHaveLength(38);
  expect(new Set(tables.gene_associations.map(row => row.symbol)).size).toBeGreaterThan(1);
  expect(tables.disorders.map(row => JSON.parse(String(row.native_json)))).toEqual(native.data.results);
  native.data.results.forEach((record: Record<string, unknown>, record_index: number) => {
    const associations = tables.gene_associations.filter(row => row.record_index === record_index);
    expect(associations.map(row => JSON.parse(String(row.native_json)))).toEqual(record.DisorderGeneAssociation);
    for (const row of associations) {
      const association = JSON.parse(String(row.native_json));
      expect(row).toMatchObject({ ORPHAcode: record.ORPHAcode, date: record.Date, association_status: association.DisorderGeneAssociationStatus,
        association_type: association.DisorderGeneAssociationType, validation_source: association.SourceOfValidation });
      const children = (table: string) => tables[table].filter(child => child.record_index === record_index && child.association_index === row.association_index).map(child => JSON.parse(String(child.native_json)));
      expect(children("gene_references")).toEqual(association.Gene.ExternalReference ?? []);
      expect(children("gene_synonyms")).toEqual(association.Gene.Synonym ?? []);
      expect(children("gene_loci")).toEqual(association.Gene.Locus ?? []);
    }
  });
  const { results: _rows, ...metadata } = native.data;
  expect(JSON.parse(String(tables.response_context[0].native_json))).toEqual({ ...native, data: metadata });
  expect(tables.gene_associations[0]).toMatchObject({ association_status: "Not yet assessed", association_type: "Candidate gene tested in", validation_source: null });
});

it("preserves detail objects, source envelopes and complete MCP response projections", () => {
  const native = fixture("disease-genes");
  const tables = geneTables(native)!;
  expect(tables.response_context[0].results_shape).toBe("object");
  expect(JSON.parse(String(tables.disorders[0].native_json))).toEqual(native.data.results);
  expect(geneTables({ content: [], structuredContent: { data: native } })).toEqual(tables);
  expect(orphanetResults(native)).toEqual(native.data.results);
  expect(geneTables({ ...native, uri: "/rd-cross-referencing/orphacodes/284963" })).toBeUndefined();
});

it("retains empty versus null identifiers, duplicate records and lexical reference values", () => {
  const rows = [{ HGNC: "", name: "empty", symbol: "A" }, { HGNC: null, name: "null", symbol: "B" }, { HGNC: "0009007199254740993", symbol: "C" }, { HGNC: "0009007199254740993", symbol: "C" }, null];
  const tables = geneTables({ uri: "/rd-associated-genes/genes", data: { __count: 5, results: rows } })!;
  expect(tables.genes.map(row => JSON.parse(String(row.native_json)))).toEqual(rows);
  expect(tables.genes.map(row => row.record_index)).toEqual([0, 1, 2, 3, 4]);
  expect(tables.genes.map(row => row.HGNC)).toEqual(["", null, "0009007199254740993", "0009007199254740993", null]);
});

it.each([null, "raw", { data: {} }, { uri: "http://[invalid", data: { results: [] } }])("leaves non-gene input intact for canonical storage %#", value => {
  expect(geneTables(value)).toBeUndefined();
});
