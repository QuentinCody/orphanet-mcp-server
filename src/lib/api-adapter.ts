/**
 * Orphanet API adapter — wraps orphanetFetch/orphanetPost into the ApiFetchFn
 * interface for use by the Code Mode __api_proxy tool.
 */

import type { ApiFetchFn } from "@bio-mcp/shared/codemode/catalog";
import { orphanetFetch, orphanetPost } from "./http";

/**
 * Create an ApiFetchFn that routes through orphanetFetch/orphanetPost.
 * No auth needed — Orphanet RD API is public.
 */
export function createOrphanetApiFetch(): ApiFetchFn {
    return async (request) => {
        let response: Response;

        if (request.method === "POST") {
            response = await orphanetPost(request.path, request.body as object);
        } else {
            response = await orphanetFetch(request.path, request.params);
        }

        if (!response.ok) {
            let errorBody: string;
            try {
                errorBody = await response.text();
            } catch {
                errorBody = response.statusText;
            }
            const error = new Error(`HTTP ${response.status}: ${errorBody.slice(0, 200)}`) as Error & {
                status: number;
                data: unknown;
            };
            error.status = response.status;
            error.data = errorBody;
            throw error;
        }

        const contentType = response.headers.get("content-type") || "";
        if (!contentType.includes("json")) {
            const text = await response.text();
            return { status: response.status, data: text };
        }

        const data = await response.json();
        return { status: response.status, data };
    };
}
