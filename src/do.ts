/** OrphanetDataDO retains native envelopes and projects source-linked SQL tables. */
import { RestStagingDO } from "@bio-mcp/shared/staging/rest-staging-do";
import type { SchemaHints } from "@bio-mcp/shared/staging/schema-inference";
import { geneSchemaHints, geneTables, orphanetResults } from "./lib/gene-staging";

export class OrphanetDataDO extends RestStagingDO {
  protected getTabularData(data: unknown): unknown { return geneTables(data) ?? orphanetResults(data); }

	/**
	 * Schema hints for the UNWRAPPED Orphanet data.
	 *
	 * The SQL projection unwraps results while canonical payloads retain the envelope:
	 *   - An array (list/search results like HPO phenotype search)
	 *   - A single object with array properties (cross-ref, epi, natural history)
	 *   - A single object without arrays (rare — disorder detail)
	 */
	protected getSchemaHints(value: unknown): SchemaHints | undefined {
		if (geneTables(value)) return geneSchemaHints;
		const data = orphanetResults(value);
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
