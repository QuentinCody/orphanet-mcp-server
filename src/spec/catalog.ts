/**
 * Orphanet RD API catalog — hand-built from https://api.orphadata.com OpenAPI spec.
 *
 * Covers ~23 endpoints across 7 categories: gene, classification, cross-reference,
 * phenotype, epidemiology, natural-history, and specialty.
 *
 * Orphanet is the European reference portal for rare diseases and orphan drugs.
 * The Orphadata API provides programmatic access to gene-disease associations,
 * classifications, cross-references (ICD-10, ICD-11, OMIM), HPO phenotypes,
 * epidemiology, natural history, and medical specialties.
 */

import type { ApiCatalog } from "@bio-mcp/shared/codemode/catalog";

export const orphanetCatalog: ApiCatalog = {
    name: "Orphanet RD API",
    baseUrl: "https://api.orphadata.com",
    version: "1.0",
    auth: "none",
    endpointCount: 18,
    notes:
        "- ORPHAcodes are numeric identifiers unique to Orphanet (e.g., 558 for Marfan syndrome, 730 for Ehlers-Danlos syndrome)\n" +
        "- NOTE: The /rd-associated-genes/* endpoints are currently returning 404 on Orphanet's side (as of 2026-03).\n" +
        "  WORKAROUND for gene associations: Use /rd-cross-referencing/orphacodes/{orphacode} to get the OMIM number,\n" +
        "  then look up the gene via DECIPHER (decipher_gene_lookup) or OMIM. Or use /rd-phenotypes to get HPO terms\n" +
        "  and search for associated genes via ontology-hub or Ensembl.\n" +
        "- Prevalence types: Point prevalence, Birth prevalence, Lifetime prevalence, Incidence, Annual incidence\n" +
        "- Prevalence classes: <1/1000000, 1-9/1000000, 1-9/100000, 1/100000-1/10000, 6-9/10000, Unknown\n" +
        "- Inheritance patterns: Autosomal dominant, Autosomal recessive, X-linked dominant, X-linked recessive, Mitochondrial, Multigenic/multifactorial, Not applicable\n" +
        "- Age of onset categories: Antenatal, Neonatal, Infancy, Childhood, Adolescent, Adult, Elderly, All ages, No data available\n" +
        "- HPO (Human Phenotype Ontology) IDs follow the format HP:NNNNNNN (e.g., HP:0001382)\n" +
        "- hchid = classification hierarchy ID; each classification groups rare diseases by medical domain\n" +
        "- Cross-references link ORPHAcodes to ICD-10, ICD-11, OMIM, and other coding systems\n" +
        "- The `lang` query parameter controls response language (en, fr, de, es, it, pt, nl, pl, cs); defaults to en\n" +
        "- Responses are JSON; most return objects with nested arrays or direct objects\n" +
        "- No authentication required\n" +
        "- Rate limiting is lenient; no specific headers returned",
    endpoints: [
        // =====================================================================
        // === Classifications ===
        // =====================================================================
        {
            method: "GET",
            path: "/rd-classification/hchids",
            summary:
                "List all rare disease classification hierarchies (e.g., Rare neurological disease, Rare cardiac disease). Returns hchid identifiers and names.",
            category: "classification",
            queryParams: [
                {
                    name: "lang",
                    type: "string",
                    required: false,
                    description: "Language code",
                    default: "en",
                },
            ],
        },
        {
            method: "GET",
            path: "/rd-classification/hchids/{hchid}/orphacodes",
            summary:
                "Get all diseases (ORPHAcodes) within a specific classification hierarchy. Returns the hierarchy tree of disorders.",
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
            queryParams: [
                {
                    name: "lang",
                    type: "string",
                    required: false,
                    description: "Language code",
                    default: "en",
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
            queryParams: [
                {
                    name: "lang",
                    type: "string",
                    required: false,
                    description: "Language code",
                    default: "en",
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
            queryParams: [
                {
                    name: "lang",
                    type: "string",
                    required: false,
                    description: "Language code",
                    default: "en",
                },
            ],
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
            queryParams: [
                {
                    name: "lang",
                    type: "string",
                    required: false,
                    description: "Language code",
                    default: "en",
                },
            ],
        },
        {
            method: "GET",
            path: "/rd-cross-referencing/omims",
            summary:
                "List all OMIM codes that cross-reference to Orphanet rare diseases.",
            category: "cross-reference",
            queryParams: [
                {
                    name: "lang",
                    type: "string",
                    required: false,
                    description: "Language code",
                    default: "en",
                },
            ],
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
            queryParams: [
                {
                    name: "lang",
                    type: "string",
                    required: false,
                    description: "Language code",
                    default: "en",
                },
            ],
        },
        {
            method: "GET",
            path: "/rd-cross-referencing/orphacodes",
            summary:
                "List all diseases (ORPHAcodes) that have cross-references to external coding systems.",
            category: "cross-reference",
            queryParams: [
                {
                    name: "lang",
                    type: "string",
                    required: false,
                    description: "Language code",
                    default: "en",
                },
            ],
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
            queryParams: [
                {
                    name: "lang",
                    type: "string",
                    required: false,
                    description: "Language code",
                    default: "en",
                },
            ],
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
            queryParams: [
                {
                    name: "lang",
                    type: "string",
                    required: false,
                    description: "Language code",
                    default: "en",
                },
            ],
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
            queryParams: [
                {
                    name: "lang",
                    type: "string",
                    required: false,
                    description: "Language code",
                    default: "en",
                },
            ],
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
                    type: "string",
                    required: true,
                    description:
                        "HPO ID(s) — single ID like 'HP:0001382' or comma-separated for multiple",
                },
            ],
            queryParams: [
                {
                    name: "lang",
                    type: "string",
                    required: false,
                    description: "Language code",
                    default: "en",
                },
            ],
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
            queryParams: [
                {
                    name: "lang",
                    type: "string",
                    required: false,
                    description: "Language code",
                    default: "en",
                },
            ],
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
            queryParams: [
                {
                    name: "lang",
                    type: "string",
                    required: false,
                    description: "Language code",
                    default: "en",
                },
            ],
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
            queryParams: [
                {
                    name: "lang",
                    type: "string",
                    required: false,
                    description: "Language code",
                    default: "en",
                },
            ],
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
            queryParams: [
                {
                    name: "lang",
                    type: "string",
                    required: false,
                    description: "Language code",
                    default: "en",
                },
            ],
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
            queryParams: [
                {
                    name: "lang",
                    type: "string",
                    required: false,
                    description: "Language code",
                    default: "en",
                },
            ],
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
            queryParams: [
                {
                    name: "lang",
                    type: "string",
                    required: false,
                    description: "Language code",
                    default: "en",
                },
            ],
        },
    ],
};
