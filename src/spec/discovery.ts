import type { ApiEndpoint, ParamDef } from "@bio-mcp/shared/codemode/catalog";

export function languageParameter(category: "cross-reference" | "phenotype" | "epidemiology" | "natural-history"): ParamDef {
  const languages = category === "cross-reference" ? ["cs", "de", "en", "es", "fr", "it", "nl", "pl", "pt", "tr", "uk", "zh"]
    : category === "phenotype" ? ["de", "en", "es", "fr", "it", "nl", "pt"] : ["cs", "de", "en", "es", "fr", "it", "nl", "pl", "pt"];
  return { name: "lang", type: "string", required: false, default: "en", enum: languages,
    description: "Provider language on this route; retain datasetCategory.lang and native names." };
}
const code = (name: string, description: string): ParamDef => ({ name, type: "number", required: true, description });

/** Additional GETs in the observed public Orphadata OpenAPI, without a new-release claim. */
export const discoveryEndpoints: ApiEndpoint[] = [
  { method: "GET", path: "/rd-classification/hchids/{hchid}", category: "classification",
    summary: "Read the complete native hierarchy for a classification. Preserve repeated occurrences and parent/child structure.",
    pathParams: [code("hchid", "Hierarchy ID from /rd-classification/hchids")] },
  { method: "GET", path: "/rd-classification/orphacodes", category: "classification",
    summary: "Discover ORPHAcodes and preferred terms in classifications. The list can repeat an ORPHAcode; rows are not unique diseases." },
  { method: "GET", path: "/rd-classification/orphacodes/{orphacode}/hchids/{hchid}", category: "classification",
    summary: "Read one disease's parent/child placement in one selected classification; preserve hierarchy context.",
    pathParams: [code("orphacode", "Disease code from the classification index"), code("hchid", "Selected hierarchy ID")] },
  { method: "GET", path: "/rd-cross-referencing/icd-11s", category: "cross-reference",
    summary: "Discover native ICD-11 references used by Orphadata.", queryParams: [languageParameter("cross-reference")] },
  { method: "GET", path: "/rd-cross-referencing/icd-11s/{icd}", category: "cross-reference",
    summary: "Look up diseases mapped to an ICD-11 reference; retain each mapping's relation and validation, without assuming equivalence.",
    pathParams: [{ name: "icd", type: "string", required: true, description: "Reference from /rd-cross-referencing/icd-11s" }], queryParams: [languageParameter("cross-reference")] },
  { method: "GET", path: "/rd-medical-specialties/orphacodes", category: "specialty",
    summary: "Discover disease entities assigned a preferential medical-specialty parent." },
  { method: "GET", path: "/rd-medical-specialties/parents", category: "specialty",
    summary: "Documented preferential-parent index. A native HTTP 500 was observed October 5; preserve the provider error rather than infer an empty index." },
  { method: "GET", path: "/rd-medical-specialties/parents/{parentcode}", category: "specialty",
    summary: "Read diseases assigned to a selected preferential parent, retaining source dates and identities.",
    pathParams: [code("parentcode", "Preferential parent ORPHAcode from a disease specialty response")] },
  { method: "GET", path: "/rd-phenotypes/orphacodes", category: "phenotype",
    summary: "Discover diseases with phenotype annotations before selecting a detail request.", queryParams: [languageParameter("phenotype")] },
];
