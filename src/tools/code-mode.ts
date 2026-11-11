/**
 * Orphanet Code Mode — registers search + execute tools for full API access.
 *
 * search: In-process catalog query, returns matching endpoints with docs.
 * execute: V8 isolate with api.get/api.post + searchSpec/listCategories.
 */

import type { McpServer } from "@bio-mcp/shared/mcp";
import { createSearchTool } from "@bio-mcp/shared/codemode/search-tool";
import { createExecuteTool } from "@bio-mcp/shared/codemode/execute-tool";
import { orphanetCatalog } from "../spec/catalog";
import { createOrphanetApiFetch } from "../lib/api-adapter";
import { orphanetResponse } from "../lib/tool-result";

interface CodeModeEnv {
    ORPHANET_DATA_DO: DurableObjectNamespace;
    CODE_MODE_LOADER: WorkerLoader;
}

/**
 * Register orphanet_search and orphanet_execute tools.
 */
export function registerCodeMode(
    server: McpServer,
    env: CodeModeEnv,
): void {
    const apiFetch = createOrphanetApiFetch();
    const registrar = {tool: (...args: unknown[]) => {
        const [name, ...rest] = args;
        const register = server.tool.bind(server) as (...values: unknown[]) => void;
        const handler = rest.pop() as (input: unknown, extra: unknown) => ReturnType<typeof orphanetResponse>;
        const respond = (input: unknown, extra: unknown) => orphanetResponse(() => handler(input, extra), env, String(name), extra, input);
        register(name, ...rest, respond);
        register(`mcp_${String(name)}`, ...rest, respond);
    }};

    // Register the search tool (in-process, no isolate)
    const searchTool = createSearchTool({
        prefix: "orphanet",
        catalog: orphanetCatalog,
    });
    searchTool.register(registrar);

    // Register the execute tool (V8 isolate via DynamicWorkerExecutor)
    const executeTool = createExecuteTool({
        prefix: "orphanet",
        // Verifiable provenance: orphanet_execute results carry a _meta.citation.
        source: { id: "orphanet", name: "Orphanet", url: "https://www.orpha.net", license: "CC BY 4.0" },
        catalog: orphanetCatalog,
        apiFetch,
        preserveApiErrors: true,
        stagingThreshold: 30 * 1024,
        maxInlineBytes: 30 * 1024,
        timeout: 90_000,
        doNamespace: env.ORPHANET_DATA_DO,
        loader: env.CODE_MODE_LOADER,
    });
    executeTool.register(registrar);
}
