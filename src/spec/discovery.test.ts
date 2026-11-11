/// <reference types="node" />
import { readFileSync } from "node:fs";
import { URL } from "node:url";
import { expect, it } from "vitest";
import { orphanetCatalog } from "./catalog";

const contract = JSON.parse(readFileSync(new URL("./fixtures/openapi-contract.json", import.meta.url), "utf8"));
it("covers the captured provider GET surface and route-specific language contracts", () => {
  expect(orphanetCatalog.endpointCount).toBe(contract.operations.length);
  expect(orphanetCatalog.endpoints.map(e => `${e.method} ${e.path}`).sort()).toEqual(contract.operations.map((e: { method: string; path: string }) => `${e.method} ${e.path}`).sort());
  for (const endpoint of orphanetCatalog.endpoints) {
    const operation = contract.operations.find((e: { path: string }) => e.path === endpoint.path);
    for (const location of ["path", "query"]) {
      const actual = location === "path" ? endpoint.pathParams ?? [] : endpoint.queryParams ?? [];
      const expected = operation.parameters.filter((p: { in: string }) => p.in === location);
      expect(actual.map(p => p.name).sort()).toEqual(expected.map((p: { name: string }) => p.name).sort());
      for (const param of actual) {
        const native = expected.find((p: { name: string }) => p.name === param.name);
        expect(param.enum).toEqual(native.schema.enum);
        expect(param.required).toBe(native.required);
        expect(param.type).toBe(native.schema.type === "integer" ? "number" : native.schema.type);
      }
    }
  }
});
