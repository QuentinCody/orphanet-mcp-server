/**
 * Orphanet API adapter — wraps orphanetFetch into the ApiFetchFn
 * interface for use by the Code Mode __api_proxy tool.
 */

import type { ApiFetchFn } from "@bio-mcp/shared/codemode/catalog";
import { orphanetFetch } from "./http";
import { nativeError } from "./native-error";

/**
 * Create an ApiFetchFn that routes through orphanetFetch.
 * No auth needed — Orphanet RD API is public.
 */
export function createOrphanetApiFetch(): ApiFetchFn {
    return async (request) => {
        if (request.method.toUpperCase() !== "GET" || request.body !== undefined) throw Object.assign(new Error("Orphadata supports GET without a body"), { status: 405 });
        const path = request.path.replace(/^(\/rd-associated-genes\/genes\/symbols\/)([^/?]+)(.*)$/, (_match, prefix: string, symbol: string, suffix: string) => `${prefix}${symbol.toLowerCase()}${suffix}`);

        const response = await orphanetFetch(path, request.params);
        if (!response.ok) throw await nativeError(response, response.url || `https://api.orphadata.com${path}`);

        const contentType = response.headers.get("content-type") || "";
        if (!contentType.includes("json")) {
            const text = await response.text();
            return { status: response.status, data: text };
        }

        const data = await response.json();
        return { status: response.status, data };
    };
}
