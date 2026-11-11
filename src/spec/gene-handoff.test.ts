/// <reference types="node" />
import { runInNewContext } from "node:vm";
import { expect, it, vi } from "vitest";
import { geneHandoffWorkflow } from "./gene-handoff";

const association = (id = "3603", symbol = "FBN1") => ({ Gene: { Symbol: symbol, ExternalReference: [{ Source: "HGNC", Reference: id }] }, DisorderGeneAssociationStatus: "Not yet assessed", DisorderGeneAssociationType: "Candidate gene tested in", SourceOfValidation: null });
const disorder = () => ({ ORPHAcode: 284963, Date: "source date", DisorderGeneAssociation: [association(), association("19706", "ADAMTSL4"), association()] });
function fixture() {
  const native = { data: { __licence: { identifier: "CC-BY-4.0" }, results: disorder() } };
  const cross = { data: { results: { ORPHAcode: 284963, ExternalReference: [{ Source: "OMIM", Reference: "154700", DisorderMappingRelation: "narrower" }] } } };
  const api = { get: vi.fn().mockResolvedValueOnce(native).mockResolvedValueOnce(cross), query: vi.fn() };
  return { api, native, cross };
}
const run = (api: unknown, code = geneHandoffWorkflow.code) => runInNewContext(`(async()=>{${code}})()`, { api });

it("retains candidate status, duplicates, source qualifiers and an exact gene handoff", async () => {
  const f = fixture(); const result = await run(f.api);
  expect(result.step).toBe("gene_handoff"); expect(result.associations).toEqual(f.native); expect(result.cross_references).toEqual(f.cross);
  expect(result.selected_associations.map((row: any) => row.association_index)).toEqual([0, 2]);
  expect(result.selected_associations[0].native.DisorderGeneAssociationStatus).toBe("Not yet assessed");
  expect(result).toMatchObject({ disease_equivalence_verified: false, handoff: { hgnc_id: "HGNC:3603", orphacode: 284963 } });
});

it.each(["03603", "36030", "", "HGNC:19706"])("does not hand off a mismatched HGNC identity %s", async id => {
  const f = fixture(); f.native.data.results.DisorderGeneAssociation = [association(id)];
  expect((await run(f.api)).step).toBe("selected_gene_identity_not_observed"); expect(f.api.get).toHaveBeenCalledTimes(1);
});

it("does not choose arbitrarily among contradictory gene references", async () => {
  const f = fixture(); const a = association(); a.Gene.ExternalReference.push({ Source: "HGNC", Reference: "9999" });
  f.native.data.results.DisorderGeneAssociation = [a]; expect((await run(f.api)).step).toBe("selected_gene_identity_not_observed");
});

it.each(["__api_error", "__stage_error"])("retains %s and earlier evidence on a downstream failure", async marker => {
  const f = fixture(); const failure = { [marker]: true, data_access_id: "retained", status: 503 };
  f.api.get.mockReset().mockResolvedValueOnce(f.native).mockResolvedValueOnce(failure);
  expect(await run(f.api)).toMatchObject({ __api_error: true, associations: f.native, cross_references: failure });
});

it("resumes a staged native disease record using its exact ORPHAcode", async () => {
  const f = fixture(); f.api.get.mockReset().mockResolvedValueOnce({ __staged: true, data_access_id: "source" }).mockResolvedValueOnce(f.cross);
  f.api.query.mockResolvedValue({ results: [{ native_json: JSON.stringify(disorder()) }] });
  expect((await run(f.api)).step).toBe("gene_handoff");
  expect(f.api.query).toHaveBeenCalledWith("source", "SELECT native_json FROM disorders WHERE ORPHAcode = 284963 LIMIT 2");
});

it("preserves recursively staged SQL without reading absent results as an empty gene list", async () => {
  const f = fixture(); f.api.get.mockReset().mockResolvedValue({ __staged: true, data_access_id: "source" });
  const staged = { __staged: true, data_access_id: "query" }; f.api.query.mockResolvedValue(staged);
  expect(await run(f.api)).toMatchObject({ step: "inspect_selected_record", selected_record_query: staged });
});

it("rejects a broader disease record even when the gene matches", async () => {
  const f = fixture(); f.native.data.results.ORPHAcode = 558;
  expect(await run(f.api)).toMatchObject({ __api_error: true, step: "disease_identity_or_shape_mismatch" });
});

it("rejects malformed selection before a provider request", async () => {
  const f = fixture(); await expect(run(f.api, geneHandoffWorkflow.code.replace('hgnc_id: "HGNC:3603"', 'hgnc_id: "HGNC:3603\\\' OR 1=1"'))).rejects.toThrow();
  expect(f.api.get).not.toHaveBeenCalled();
});
