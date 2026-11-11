import { expect, it, vi } from "vitest";
import { McpServer } from "@bio-mcp/shared/mcp";
import { registerCodeMode } from "./code-mode";
import { registerGetSchema } from "./get-schema";
import { registerQueryData } from "./query-data";
import { geneWorkflows } from "../spec/genes";

it("registers both aliases and cites discovery and helper errors", async () => {
  const server = new McpServer({ name: "fixture", version: "1" });
  registerCodeMode(server, { CODE_MODE_LOADER: { get: () => ({}) } } as unknown as Parameters<typeof registerCodeMode>[1]);
  registerGetSchema(server, {}); registerQueryData(server, {});
  const registered = (server as unknown as { _registeredTools: Record<string, { handler: (args: unknown, extra: unknown) => Promise<unknown> }> })._registeredTools;
  for (const prefix of ["", "mcp_"]) {
    for (const suffix of ["search", "execute", "query_data", "get_schema"]) expect(registered[`${prefix}orphanet_${suffix}`]).toBeDefined();
    expect(await registered[`${prefix}orphanet_search`].handler({ query: "association qualifications", category: "workflows", max_results: 5 }, {})).toMatchObject({ content: expect.any(Array), structuredContent: { _meta: { citation: { source: { id: "orphanet" } } } } });
    expect(await registered[`${prefix}orphanet_query_data`].handler({ data_access_id: "orphanet_absent", sql: "SELECT 1" }, {})).toMatchObject({ isError: true, content: expect.any(Array), structuredContent: { success: false, _meta: { citation: { result_hash: expect.any(String) } } } });
  }
});

it.each([{ __api_error: true }, { __stage_error: true }, { __staged: true, data_access_id: "orphanet_data" }])("recipes retain source failures and stage handles %#", async handle => {
  for (const recipe of geneWorkflows) {
    const api = { get: vi.fn().mockResolvedValue(handle) };
    expect(await new Function("api", `return (async () => {${recipe.code}})()`)(api)).toEqual(handle);
    expect(api.get).toHaveBeenCalledTimes(1);
  }
});
