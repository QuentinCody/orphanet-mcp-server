/**
 * OrphanetDataDO — Durable Object for staging large Orphanet responses.
 *
 * Extends RestStagingDO with schema hints for disorders, genes, and prevalence data.
 */

import { RestStagingDO } from "@bio-mcp/shared/staging/rest-staging-do";
import type { SchemaHints } from "@bio-mcp/shared/staging/schema-inference";

export class OrphanetDataDO extends RestStagingDO {
	protected getSchemaHints(data: unknown): SchemaHints | undefined {
		if (!data || typeof data !== "object") return undefined;

		// Array of disorders (from search or classification listing)
		if (Array.isArray(data)) {
			const sample = data[0];
			if (sample && typeof sample === "object") {
				// Gene-disease associations array
				if ("gene_symbol" in sample && "association_type" in sample) {
					return {
						tableName: "genes",
						indexes: ["gene_symbol", "orphacode", "association_type"],
					};
				}
				// Prevalence data array
				if ("prevalence_type" in sample || "prevalence_class" in sample) {
					return {
						tableName: "prevalence",
						indexes: ["orphacode", "prevalence_type", "source"],
					};
				}
				// Disorder array (search results, classification disorders)
				if ("orphacode" in sample || "ORPHAcode" in sample) {
					return {
						tableName: "disorders",
						indexes: ["orphacode", "name", "classification"],
					};
				}
			}
		}

		// Wrapped object responses
		const obj = data as Record<string, unknown>;

		// Disorder detail with genes sub-array
		if (obj.genes && Array.isArray(obj.genes)) {
			return {
				tableName: "disorder_genes",
				indexes: ["gene_symbol", "association_type"],
				flatten: { genes: 1 },
			};
		}

		// Disorder with prevalence sub-array
		if (obj.prevalences && Array.isArray(obj.prevalences)) {
			return {
				tableName: "disorder_prevalence",
				indexes: ["prevalence_type", "source"],
				flatten: { prevalences: 1 },
			};
		}

		// Search results with data wrapper
		if (Array.isArray(obj.data)) {
			const sample = obj.data[0];
			if (sample && typeof sample === "object" && ("orphacode" in sample || "ORPHAcode" in sample)) {
				return {
					tableName: "disorders",
					indexes: ["orphacode", "name", "classification"],
				};
			}
		}

		// Classification hierarchy
		if (obj.disorders && Array.isArray(obj.disorders)) {
			return {
				tableName: "classification_disorders",
				indexes: ["orphacode", "name"],
				flatten: { disorders: 1 },
			};
		}

		return undefined;
	}
}
