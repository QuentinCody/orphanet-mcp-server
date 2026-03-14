/**
 * OrphanetDataDO — Durable Object for staging large Orphanet responses.
 *
 * Extends RestStagingDO with data unwrapping and schema hints for Orphanet
 * RD API responses.
 *
 * ## Problem solved
 *
 * Orphanet API responses are wrapped in `{ data: { __count, __licence, results } }`.
 * The base class pipeline calls `detectArrays(data)` which cannot navigate this
 * three-level nesting reliably:
 *
 * - Array results: `detectArrays` can find `results` via single-key + known-key
 *   recursion, but only when `data` is the sole top-level key.
 * - Single-object results (cross-ref, epi, natural history): `detectArrays` sees
 *   `{ __count, __licence, results: {object} }` as a 3-key object with no arrays
 *   → falls through to the JSON blob fallback (`payloads` table).
 *
 * ## Fix
 *
 * Override `fetch()` to intercept `/process` requests and unwrap `data.results`
 * from the Orphanet envelope BEFORE delegating to the base class. This way:
 *
 * 1. For array results: `detectArrays` gets the array directly
 * 2. For single-object results: `detectArrays` finds the array properties
 *    (ExternalReference, Prevalence, HPODisorderAssociation, etc.) directly
 * 3. `getSchemaHints()` operates on the same unwrapped data, so hints align
 *    with what `detectArrays` discovers
 *
 * This is the same pattern used by entrez-mcp-server/src/do.ts.
 */

import { RestStagingDO } from "@bio-mcp/shared/staging/rest-staging-do";
import type { SchemaHints } from "@bio-mcp/shared/staging/schema-inference";

export class OrphanetDataDO extends RestStagingDO {
	/**
	 * Intercept /process to unwrap the Orphanet API envelope before staging.
	 *
	 * The staging caller sends: { data: <orphanet_api_response>, context?: {...} }
	 * where orphanet_api_response = { data: { __count, __licence, results: ... } }
	 *
	 * We unwrap to: { data: <results>, context?: {...} }
	 * so the base class pipeline sees the actual data.
	 */
	async fetch(request: Request): Promise<Response> {
		const url = new URL(request.url);

		if (url.pathname === "/process" && request.method === "POST") {
			const json = (await request.json()) as Record<string, unknown>;
			const apiResponse = json?.data ?? json;

			// Unwrap Orphanet envelope: { data: { __count, __licence, results } } → results
			const unwrapped = this.unwrapOrphanetResponse(apiResponse);

			const newRequest = new Request(request.url, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					data: unwrapped,
					...(json?.context ? { context: json.context } : {}),
				}),
			});
			return super.fetch(newRequest);
		}

		return super.fetch(request);
	}

	/**
	 * Unwrap the Orphanet API envelope to extract the actual data.
	 *
	 * Input shapes:
	 *   { data: { __count, __licence, results: [...] } }  → returns the array
	 *   { data: { __count, __licence, results: {...} } }   → returns the object
	 *   anything else                                       → returns as-is
	 */
	private unwrapOrphanetResponse(apiResponse: unknown): unknown {
		if (!apiResponse || typeof apiResponse !== "object" || Array.isArray(apiResponse)) {
			return apiResponse;
		}

		const obj = apiResponse as Record<string, unknown>;
		const innerData = obj.data;

		if (innerData && typeof innerData === "object" && !Array.isArray(innerData)) {
			const inner = innerData as Record<string, unknown>;
			if ("results" in inner) {
				return inner.results;
			}
		}

		return apiResponse;
	}

	/**
	 * Schema hints for the UNWRAPPED Orphanet data.
	 *
	 * After fetch() unwrapping, `data` is one of:
	 *   - An array (list/search results like HPO phenotype search)
	 *   - A single object with array properties (cross-ref, epi, natural history)
	 *   - A single object without arrays (rare — disorder detail)
	 */
	protected getSchemaHints(data: unknown): SchemaHints | undefined {
		if (!data || typeof data !== "object") return undefined;

		// === Array results (list/search endpoints) ===
		if (Array.isArray(data)) {
			return this.hintsForResultsArray(data);
		}

		const obj = data as Record<string, unknown>;

		// === Single-object results (detail endpoints) ===
		return this.hintsForSingleResult(obj);
	}

	// -----------------------------------------------------------------
	// Helpers — array results
	// -----------------------------------------------------------------

	/**
	 * Hints for array results (list/search endpoints).
	 *
	 * Most list endpoints return items shaped as:
	 *   { Date, Disorder: { ORPHAcode, DisorderGroup, "Preferred term", <nested_arrays> } }
	 *
	 * flattenObject with `flatten: { Disorder: 2 }` produces:
	 *   Date, Disorder_ORPHAcode, Disorder_DisorderGroup, Disorder_Preferred_term
	 *   and nested arrays (HPODisorderAssociation, ExternalReference, etc.)
	 *   become child tables automatically.
	 */
	private hintsForResultsArray(results: unknown[]): SchemaHints | undefined {
		if (results.length === 0) return undefined;
		const sample = results[0];
		if (!sample || typeof sample !== "object") return undefined;
		const s = sample as Record<string, unknown>;

		// Items with { Disorder: {...} } wrapper (most list endpoints)
		if (s.Disorder && typeof s.Disorder === "object") {
			const disorder = s.Disorder as Record<string, unknown>;

			// HPO phenotype search: Disorder contains HPODisorderAssociation array
			if (Array.isArray(disorder.HPODisorderAssociation)) {
				return {
					tableName: "hpo_disorders",
					indexes: [
						"Disorder_ORPHAcode",
						"Disorder_DisorderGroup",
					],
					flatten: { Disorder: 2 },
				};
			}

			// Cross-reference search: Disorder contains ExternalReference array
			if (Array.isArray(disorder.ExternalReference)) {
				return {
					tableName: "cross_ref_disorders",
					indexes: [
						"Disorder_ORPHAcode",
						"Disorder_DisorderGroup",
					],
					flatten: { Disorder: 2 },
				};
			}

			// Epidemiology list: Disorder contains Prevalence array
			if (Array.isArray(disorder.Prevalence)) {
				return {
					tableName: "epidemiology_disorders",
					indexes: [
						"Disorder_ORPHAcode",
						"Disorder_DisorderGroup",
					],
					flatten: { Disorder: 2 },
				};
			}

			// Natural history list: Disorder contains AverageAgeOfOnset/TypeOfInheritance
			if (
				Array.isArray(disorder.AverageAgeOfOnset) ||
				Array.isArray(disorder.TypeOfInheritance)
			) {
				return {
					tableName: "natural_history_disorders",
					indexes: [
						"Disorder_ORPHAcode",
						"Disorder_DisorderGroup",
					],
					flatten: { Disorder: 2 },
				};
			}

			// Classification hierarchy: Disorder contains ClassificationNodeChildList
			if (Array.isArray(disorder.ClassificationNodeChildList)) {
				return {
					tableName: "classification_disorders",
					indexes: [
						"Disorder_ORPHAcode",
						"Disorder_DisorderGroup",
					],
					flatten: { Disorder: 2 },
				};
			}

			// Gene association list: Disorder contains DisorderGeneAssociationList
			if (Array.isArray(disorder.DisorderGeneAssociationList)) {
				return {
					tableName: "gene_association_disorders",
					indexes: [
						"Disorder_ORPHAcode",
						"Disorder_DisorderGroup",
					],
					flatten: { Disorder: 2 },
				};
			}

			// Generic disorder list (catch-all for Disorder wrapper)
			return {
				tableName: "disorders",
				indexes: [
					"Disorder_ORPHAcode",
					"Disorder_DisorderGroup",
				],
				flatten: { Disorder: 2 },
			};
		}

		// Items without Disorder wrapper — direct entity arrays
		return this.hintsForDirectArray(results);
	}

	// -----------------------------------------------------------------
	// Helpers — single-object results
	// -----------------------------------------------------------------

	/**
	 * Hints for single-object results (detail endpoints).
	 *
	 * detectArrays() will find array properties in the object directly:
	 *   { ORPHAcode, ExternalReference: [...] } → key="ExternalReference"
	 *   { ORPHAcode, Prevalence: [...] }        → key="Prevalence"
	 *   { ORPHAcode, HPODisorderAssociation: [...] } → key="HPODisorderAssociation"
	 */
	private hintsForSingleResult(obj: Record<string, unknown>): SchemaHints | undefined {
		// Cross-reference detail: { ORPHAcode, ExternalReference: [...] }
		if (Array.isArray(obj.ExternalReference)) {
			return {
				tableName: "cross_references",
				indexes: ["Source", "Reference"],
			};
		}

		// Epidemiology detail: { ORPHAcode, Prevalence: [...] }
		if (Array.isArray(obj.Prevalence)) {
			return {
				tableName: "prevalence",
				indexes: ["PrevalenceType", "PrevalenceClass", "PrevalenceGeographic"],
			};
		}

		// Phenotype detail: { ORPHAcode, HPODisorderAssociation: [{HPO: {...}, HPOFrequency}] }
		if (Array.isArray(obj.HPODisorderAssociation)) {
			return {
				tableName: "hpo_associations",
				indexes: ["HPO_HPOId", "HPO_HPOTerm", "HPOFrequency"],
				flatten: { HPO: 1 },
			};
		}

		// Natural history: { ORPHAcode, AverageAgeOfOnset: [...], TypeOfInheritance: [...] }
		if (Array.isArray(obj.AverageAgeOfOnset) || Array.isArray(obj.TypeOfInheritance)) {
			return {
				tableName: "natural_history",
				indexes: ["AverageAgeOfOnset", "TypeOfInheritance"],
			};
		}

		// Gene association: { ORPHAcode, DisorderGeneAssociationList: [...] }
		if (Array.isArray(obj.DisorderGeneAssociationList)) {
			return {
				tableName: "gene_associations",
				indexes: ["Symbol", "DisorderGeneAssociationType"],
			};
		}

		// Classification list: { ORPHAcode, ClassificationList: [...] }
		if (Array.isArray(obj.ClassificationList)) {
			return {
				tableName: "classifications",
				indexes: ["hchid", "Name"],
			};
		}

		// Classification hierarchy: { hchid, ClassificationNodeChildList: [...] }
		if (Array.isArray(obj.ClassificationNodeChildList)) {
			return {
				tableName: "classification_disorders",
				indexes: ["ORPHAcode", "Name"],
			};
		}

		// Single disorder detail with no arrays — wrap as 1-row table
		if ("ORPHAcode" in obj) {
			return {
				tableName: "disorder_detail",
				indexes: ["ORPHAcode"],
			};
		}

		return undefined;
	}

	// -----------------------------------------------------------------
	// Helpers — direct array items (no Disorder wrapper)
	// -----------------------------------------------------------------

	/**
	 * Hints for direct top-level arrays without a Disorder wrapper.
	 */
	private hintsForDirectArray(arr: unknown[]): SchemaHints | undefined {
		if (arr.length === 0) return undefined;
		const sample = arr[0];
		if (!sample || typeof sample !== "object") return undefined;
		const s = sample as Record<string, unknown>;

		// Gene list
		if ("Symbol" in s || "symbol" in s) {
			return {
				tableName: "genes",
				indexes: ["Symbol", "Name", "DisorderGeneAssociationType"],
			};
		}

		// Classification hierarchy list
		if ("hchid" in s || "ClassificationId" in s) {
			return {
				tableName: "classifications",
				indexes: ["hchid", "Name"],
			};
		}

		// HPO phenotype term list
		if ("HPOId" in s || "hpoid" in s) {
			return {
				tableName: "phenotypes",
				indexes: ["HPOId", "HPOTerm"],
			};
		}

		// Cross-reference items
		if ("Source" in s && "Reference" in s) {
			return {
				tableName: "cross_references",
				indexes: ["Source", "Reference"],
			};
		}

		// ICD-10 reference list
		if ("ICD10" in s || "icd10" in s || "Code" in s) {
			return {
				tableName: "icd10_references",
				indexes: ["Code", "ORPHAcode"],
			};
		}

		// OMIM reference list
		if ("OMIM" in s || "omim" in s) {
			return {
				tableName: "omim_references",
				indexes: ["OMIM", "ORPHAcode"],
			};
		}

		// Prevalence items
		if ("PrevalenceType" in s || "prevalence_type" in s) {
			return {
				tableName: "prevalence",
				indexes: ["PrevalenceType", "PrevalenceClass", "PrevalenceGeographic"],
			};
		}

		// Disorder list (catch-all for items with ORPHAcode)
		if ("ORPHAcode" in s || "orphacode" in s) {
			return {
				tableName: "disorders",
				indexes: ["ORPHAcode", "Name", "DisorderType"],
			};
		}

		return undefined;
	}
}
