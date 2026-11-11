/**
 * Orphanet RD API catalog — hand-built from https://api.orphadata.com OpenAPI spec.
 *
 * Covers the documented GET operations across 7 categories: gene, classification, cross-reference,
 * phenotype, epidemiology, natural-history, and specialty.
 *
 * Orphanet is the European reference portal for rare diseases and orphan drugs.
 * The Orphadata API provides programmatic access to gene-disease associations,
 * classifications, cross-references (ICD-10, ICD-11, OMIM), HPO phenotypes,
 * epidemiology, natural history, and medical specialties.
 */

import type { ApiCatalog } from "@bio-mcp/shared/codemode/catalog";
import { geneEndpoints, geneNotes, geneWorkflows } from "./genes";
import { discoveryEndpoints, languageParameter } from "./discovery";
import { geneHandoffWorkflow } from "./gene-handoff";

export const orphanetCatalog: ApiCatalog = {
    name: "Orphanet RD API",
    baseUrl: "https://api.orphadata.com",
    version: "1.0",
    auth: "none",
    endpointCount: 32,
    notes: geneNotes +
        "- ORPHAcodes are numeric identifiers unique to Orphanet (e.g., 558 for Marfan syndrome, 730 for Ehlers-Danlos syndrome)\n" +
        "- Prevalence types: Point prevalence, Birth prevalence, Lifetime prevalence, Incidence, Annual incidence\n" +
        "- Prevalence classes: <1/1000000, 1-9/1000000, 1-9/100000, 1/100000-1/10000, 6-9/10000, Unknown\n" +
        "- Inheritance patterns: Autosomal dominant, Autosomal recessive, X-linked dominant, X-linked recessive, Mitochondrial, Multigenic/multifactorial, Not applicable\n" +
        "- Age of onset categories: Antenatal, Neonatal, Infancy, Childhood, Adolescent, Adult, Elderly, All ages, No data available\n" +
        "- HPO (Human Phenotype Ontology) IDs follow the format HP:NNNNNNN (e.g., HP:0001382)\n" +
        "- hchid = classification hierarchy ID; each classification groups rare diseases by medical domain\n" +
        "- Cross-references link ORPHAcodes to ICD-10, ICD-11, OMIM, and other coding systems\n" +
        "- `lang` is documented for cross-reference, phenotype, epidemiology and natural-history routes only; gene, classification and medical-specialty routes report English. Language enums differ by route: cross-reference supports 12, epidemiology/natural history nine, phenotype seven; consult the selected endpoint. Preserve datasetCategory.lang; echoed query parameters do not prove translation.\n" +
        "- Responses are JSON; most return objects with nested arrays or direct objects\n" +
        "- No authentication required\n" +
        "- No provider rate-limit guarantee is asserted; respect returned statuses and avoid repeated bulk downloads.",
    endpoints: [
        ...geneEndpoints,
        ...discoveryEndpoints,
        // =====================================================================
        // === Classifications ===
        // =====================================================================
        {
            method: "GET",
            path: "/rd-classification/hchids",
            summary:
                "List all rare disease classification hierarchies (e.g., Rare neurological disease, Rare cardiac disease). Returns hchid identifiers and names.",
            category: "classification",

        },
        {
            method: "GET",
            path: "/rd-classification/hchids/{hchid}/orphacodes",
            summary:
                "Get the disease membership list for one classification. Use /rd-classification/hchids/{hchid} for the native parent/child hierarchy.",
            category: "classification",
            pathParams: [
                {
                    name: "hchid",
                    type: "number",
                    required: true,
                    description:
                        "Classification hierarchy ID (numeric identifier from /rd-classification/hchids)",
                },
            ],

        },
        {
            method: "GET",
            path: "/rd-classification/orphacodes/{orphacode}/hchids",
            summary:
                "Get all classification hierarchies that contain a specific disease. Shows which medical domains a disorder belongs to.",
            category: "classification",
            pathParams: [
                {
                    name: "orphacode",
                    type: "number",
                    required: true,
                    description: "ORPHAcode of the disorder",
                },
            ],

        },

        // =====================================================================
        // === Cross-Referencing (ICD-10, ICD-11, OMIM) ===
        // =====================================================================
        {
            method: "GET",
            path: "/rd-cross-referencing/icd-10s",
            summary:
                "List all ICD-10 codes that cross-reference to Orphanet rare diseases.",
            category: "cross-reference",
            queryParams: [languageParameter("cross-reference")],
        },
        {
            method: "GET",
            path: "/rd-cross-referencing/icd-10s/{icd}",
            summary:
                "Get rare disease(s) mapped to a specific ICD-10 code. Returns ORPHAcodes and disease names for the given ICD-10.",
            category: "cross-reference",
            pathParams: [
                {
                    name: "icd",
                    type: "string",
                    required: true,
                    description:
                        "ICD-10 code (e.g., 'Q87.4' for Marfan syndrome, 'E84' for cystic fibrosis)",
                },
            ],
            queryParams: [languageParameter("cross-reference")],
        },
        {
            method: "GET",
            path: "/rd-cross-referencing/omims",
            summary:
                "List all OMIM codes that cross-reference to Orphanet rare diseases.",
            category: "cross-reference",
            queryParams: [languageParameter("cross-reference")],
        },
        {
            method: "GET",
            path: "/rd-cross-referencing/omims/{omim}",
            summary:
                "Get rare disease(s) mapped to a specific OMIM number. Returns ORPHAcodes and disease names.",
            category: "cross-reference",
            pathParams: [
                {
                    name: "omim",
                    type: "string",
                    required: true,
                    description:
                        "OMIM number (e.g., '154700' for Marfan syndrome)",
                },
            ],
            queryParams: [languageParameter("cross-reference")],
        },
        {
            method: "GET",
            path: "/rd-cross-referencing/orphacodes",
            summary:
                "List all diseases (ORPHAcodes) that have cross-references to external coding systems.",
            category: "cross-reference",
            queryParams: [languageParameter("cross-reference")],
        },
        {
            method: "GET",
            path: "/rd-cross-referencing/orphacodes/names/{name}",
            summary:
                "Search diseases by name fragment and get their cross-references to ICD-10, ICD-11, OMIM, and other coding systems.",
            category: "cross-reference",
            pathParams: [
                {
                    name: "name",
                    type: "string",
                    required: true,
                    description:
                        "Disease name fragment to search for (e.g., 'Marfan', 'cystic fibrosis')",
                },
            ],
            queryParams: [languageParameter("cross-reference")],
        },
        {
            method: "GET",
            path: "/rd-cross-referencing/orphacodes/{orphacode}",
            summary:
                "Get full cross-reference detail for a disease: ICD-10, ICD-11, OMIM, MeSH, UMLS, and MedDRA mappings.",
            category: "cross-reference",
            pathParams: [
                {
                    name: "orphacode",
                    type: "number",
                    required: true,
                    description: "ORPHAcode of the disorder",
                },
            ],
            queryParams: [languageParameter("cross-reference")],
        },

        // =====================================================================
        // === Phenotypes (HPO) ===
        // =====================================================================
        {
            method: "GET",
            path: "/rd-phenotypes/hpoids",
            summary:
                "List all HPO (Human Phenotype Ontology) phenotype terms that are associated with rare diseases in Orphanet.",
            category: "phenotype",
            queryParams: [languageParameter("phenotype")],
        },
        {
            method: "GET",
            path: "/rd-phenotypes/hpoids/{hpoids}",
            summary:
                "Get all rare diseases associated with specific HPO phenotype ID(s). Useful for phenotype-driven diagnosis.",
            category: "phenotype",
            pathParams: [
                {
                    name: "hpoids",
                    type: "array",
                    required: true,
                    description:
                        "Nonempty unique HPO IDs, serialized as a comma-separated path segment (e.g., ['HP:0001382', 'HP:0001250'])",
                },
            ],
            queryParams: [languageParameter("phenotype")],
        },
        {
            method: "GET",
            path: "/rd-phenotypes/orphacodes/{orphacode}",
            summary:
                "Get all HPO phenotype annotations for a rare disease, including frequency data (obligate, very frequent, frequent, occasional, very rare, excluded).",
            category: "phenotype",
            pathParams: [
                {
                    name: "orphacode",
                    type: "number",
                    required: true,
                    description: "ORPHAcode of the disorder",
                },
            ],
            queryParams: [languageParameter("phenotype")],
        },

        // =====================================================================
        // === Epidemiology ===
        // =====================================================================
        {
            method: "GET",
            path: "/rd-epidemiology/orphacodes",
            summary:
                "List all diseases (ORPHAcodes) that have epidemiology data. Returns ORPHAcodes with disease names and prevalence information.",
            category: "epidemiology",
            queryParams: [languageParameter("epidemiology")],
        },
        {
            method: "GET",
            path: "/rd-epidemiology/orphacodes/{orphacode}",
            summary:
                "Get epidemiology data for a specific disease: prevalence type, class, geographic area, validation status, and source.",
            category: "epidemiology",
            pathParams: [
                {
                    name: "orphacode",
                    type: "number",
                    required: true,
                    description: "ORPHAcode of the disorder",
                },
            ],
            queryParams: [languageParameter("epidemiology")],
        },

        // =====================================================================
        // === Natural History ===
        // =====================================================================
        {
            method: "GET",
            path: "/rd-natural_history/orphacodes",
            summary:
                "List all diseases (ORPHAcodes) that have natural history data: age of onset, age of death, and inheritance patterns.",
            category: "natural-history",
            queryParams: [languageParameter("natural-history")],
        },
        {
            method: "GET",
            path: "/rd-natural_history/orphacodes/{orphacode}",
            summary:
                "Get natural history data for a specific disease: age of onset, age of death, inheritance pattern (autosomal dominant/recessive, X-linked, etc.).",
            category: "natural-history",
            pathParams: [
                {
                    name: "orphacode",
                    type: "number",
                    required: true,
                    description: "ORPHAcode of the disorder",
                },
            ],
            queryParams: [languageParameter("natural-history")],
        },

        // =====================================================================
        // === Medical Specialties ===
        // =====================================================================
        {
            method: "GET",
            path: "/rd-medical-specialties/orphacodes/{orphacode}",
            summary:
                "Get the preferential parent (medical specialty) for a rare disease by ORPHAcode. Shows which medical domain the disease belongs to.",
            category: "specialty",
            pathParams: [
                {
                    name: "orphacode",
                    type: "number",
                    required: true,
                    description: "ORPHAcode of the disorder",
                },
            ],

        },
    ],
    workflows: [...geneWorkflows, geneHandoffWorkflow],
};
