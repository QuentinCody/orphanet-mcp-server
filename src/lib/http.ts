/**
 * Orphanet RD API HTTP client.
 *
 * Base URL: https://api.orphadata.com
 * No authentication required. Responses are JSON.
 */

import { restFetch } from "@bio-mcp/shared/http/rest-fetch";
import type { RestFetchOptions } from "@bio-mcp/shared/http/rest-fetch";

const ORPHANET_BASE = "https://api.orphadata.com";

export interface OrphanetFetchOptions extends Omit<RestFetchOptions, "retryOn"> {
    /** Override base URL */
    baseUrl?: string;
}

/**
 * Fetch from the Orphanet RD API with built-in retry handling.
 */
export async function orphanetFetch(
    path: string,
    params?: Record<string, unknown>,
    opts?: OrphanetFetchOptions,
): Promise<Response> {
    const baseUrl = opts?.baseUrl ?? ORPHANET_BASE;
    const headers: Record<string, string> = {
        Accept: "application/json",
        ...(opts?.headers ?? {}),
    };

    return restFetch(baseUrl, path, params, {
        ...opts,
        headers,
        retryOn: [429, 500, 502, 503],
        retries: opts?.retries ?? 3,
        timeout: opts?.timeout ?? 30_000,
        userAgent:
            "orphanet-mcp-server/1.0 (bio-mcp; https://github.com/QuentinCody/orphanet-mcp-server)",
    });
}

/**
 * POST to Orphanet RD API.
 */
export async function orphanetPost(
    path: string,
    body: object,
    opts?: OrphanetFetchOptions,
): Promise<Response> {
    const baseUrl = opts?.baseUrl ?? ORPHANET_BASE;
    const headers: Record<string, string> = {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...(opts?.headers ?? {}),
    };

    return restFetch(baseUrl, path, undefined, {
        ...opts,
        method: "POST",
        headers,
        body,
        retryOn: [429, 500, 502, 503],
        retries: opts?.retries ?? 3,
        timeout: opts?.timeout ?? 30_000,
        userAgent: "orphanet-mcp-server/1.0",
    });
}
