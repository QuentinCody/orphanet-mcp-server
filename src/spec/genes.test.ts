/// <reference types="node" />
import { runInNewContext } from "node:vm";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createOrphanetApiFetch } from "../lib/api-adapter";
import { orphanetCatalog } from "./catalog";
import { geneEndpoints } from "./genes";

afterEach(() => vi.unstubAllGlobals());
const api = createOrphanetApiFetch();

describe("Orphadata gene associations", () => {
  it("normalizes gene symbols without altering association qualifications or dates", async () => {
    const data = { data: { __licence: { identifier: "CC-BY-4.0" }, __count: 1, results: [{ Date: "2026-06-23 07:57:31", ORPHAcode: 2084, DisorderGeneAssociation: [{ DisorderGeneAssociationStatus: "Not yet assessed", DisorderGeneAssociationType: "Candidate gene tested in", SourceOfValidation: null, Gene: { Symbol: "FBN1", ExternalReference: [{ Source: "Ensembl", Reference: "ENSG00000166147" }] } }] }] } };
    const fetchMock = vi.fn().mockResolvedValue(Response.json(data)); vi.stubGlobal("fetch", fetchMock);
    expect((await api({ method: "GET", path: "/rd-associated-genes/genes/symbols/FBN1", params: { lang: "en" } })).data).toEqual(data);
    expect(fetchMock).toHaveBeenCalledWith("https://api.orphadata.com/rd-associated-genes/genes/symbols/fbn1?lang=en", expect.anything());
  });
  it("preserves disease record objects and the selected subtype code", async () => {
    const data = { data: { __count: 1, results: { ORPHAcode: 284963, "Preferred term": "Marfan syndrome type 1", DisorderGeneAssociation: [{ Gene: { Symbol: "FBN1" }, SourceOfValidation: "20301510[PMID]" }] } } };
    const fetchMock = vi.fn().mockResolvedValue(Response.json(data)); vi.stubGlobal("fetch", fetchMock);
    expect((await api({ method: "GET", path: "/rd-associated-genes/orphacodes/284963" })).data).toEqual(data);
    expect(fetchMock.mock.calls[0][0]).toBe("https://api.orphadata.com/rd-associated-genes/orphacodes/284963");
  });
  it("keeps a parent-code miss as an explicit error", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ error: { type: "Query not found" } }, { status: 404 })));
    await expect(api({ method: "GET", path: "/rd-associated-genes/orphacodes/558" })).rejects.toThrow("HTTP 404");
  });
  it.each([{ method: "POST" }, { method: "DELETE" }, { method: "GET", body: {} }])("rejects undocumented mutations or request bodies %#", async request => {
    const mock = vi.fn(); vi.stubGlobal("fetch", mock);
    await expect(api({ ...request, path: "/rd-associated-genes/genes" })).rejects.toMatchObject({ status: 405 });
    expect(mock).not.toHaveBeenCalled();
  });
  it("publishes executable name/symbol/subtype examples and retains existing routes", async () => {
    const mockApi = { get: vi.fn().mockResolvedValue({ data: {} }) };
    for (const endpoint of geneEndpoints.filter(e => e.example)) await runInNewContext(`(async()=>{${endpoint.example}})()`, { api: mockApi });
    expect(mockApi.get).toHaveBeenCalledWith("/rd-associated-genes/genes/symbols/FBN1");
    expect(mockApi.get).toHaveBeenCalledWith("/rd-associated-genes/orphacodes/284963");
    expect(orphanetCatalog.endpointCount).toBe(orphanetCatalog.endpoints.length);
    expect(orphanetCatalog.endpoints.some(e => e.path === "/rd-cross-referencing/orphacodes/{orphacode}")).toBe(true);
  });
});
