/**
 * Orphanet RD API catalog — hand-built from https://api.orphadata.com docs.
 *
 * Covers ~15 endpoints across 5 categories: disorder, gene, prevalence,
 * classification, and natural-history.
 *
 * Orphanet is the European reference portal for rare diseases and orphan drugs.
 */

import type { ApiCatalog } from "@bio-mcp/shared/codemode/catalog";

export const orphanetCatalog: ApiCatalog = {
    name: "Orphanet RD API",
    baseUrl: "https://api.orphadata.com",
    version: "1.0",
    auth: "none",
    endpointCount: 15,
    notes:
        "- ORPHAcodes are numeric identifiers unique to Orphanet (e.g., 558 for Marfan syndrome, 730 for Ehlers-Danlos syndrome)\n" +
        "- Gene-disease association types: Disease-causing germline mutation, Modifying germline mutation, Major susceptibility factor, Candidate gene, Biomarker, Role in the phenotype of\n" +
        "- Prevalence types: Point prevalence, Birth prevalence, Lifetime prevalence, Incidence, Annual incidence\n" +
        "- Prevalence classes: <1/1000000, 1-9/1000000, 1-9/100000, 1/100000-1/10000, 6-9/10000, Unknown\n" +
        "- Inheritance patterns: Autosomal dominant, Autosomal recessive, X-linked dominant, X-linked recessive, Mitochondrial, Multigenic/multifactorial, Not applicable\n" +
        "- Age of onset categories: Antenatal, Neonatal, Infancy, Childhood, Adolescent, Adult, Elderly, All ages, No data available\n" +
        "- Responses are JSON; most return objects with data arrays or direct objects\n" +
        "- No authentication required\n" +
        "- Rate limiting is lenient; no specific headers returned",
    endpoints: [
        // === Disorder ===
        {
            method: "GET",
            path: "/rd-api/disorder/{orphacode}",
            summary: "Get detailed information about a rare disease by its ORPHAcode",
            category: "disorder",
            pathParams: [
                {
                    name: "orphacode",
                    type: "number",
                    required: true,
                    description: "Orphanet numeric identifier (e.g., 558 for Marfan syndrome)",
                },
            ],
            queryParams: [],
        },
        {
            method: "GET",
            path: "/rd-api/disorder/search",
            summary:
                "Search for rare diseases by name. Returns matching disorders with ORPHAcodes, names, and synonyms.",
            category: "disorder",
            queryParams: [
                {
                    name: "query",
                    type: "string",
                    required: true,
                    description:
                        "Search term for disorder name or synonym (e.g., 'Marfan', 'cystic fibrosis')",
                },
                {
                    name: "lang",
                    type: "string",
                    required: false,
                    description: "Language code (e.g., 'en', 'fr', 'de')",
                    default: "en",
                },
            ],
        },
        {
            method: "GET",
            path: "/rd-api/disorder/{orphacode}/synonyms",
            summary: "Get all synonyms and alternative names for a rare disease",
            category: "disorder",
            pathParams: [
                {
                    name: "orphacode",
                    type: "number",
                    required: true,
                    description: "ORPHAcode of the disorder",
                },
            ],
            queryParams: [],
        },
        {
            method: "GET",
            path: "/rd-api/disorder/{orphacode}/references",
            summary:
                "Get external references (OMIM, ICD-10, ICD-11, MeSH, UMLS, MedDRA) for a disorder",
            category: "disorder",
            pathParams: [
                {
                    name: "orphacode",
                    type: "number",
                    required: true,
                    description: "ORPHAcode of the disorder",
                },
            ],
            queryParams: [],
        },

        // === Gene ===
        {
            method: "GET",
            path: "/rd-api/disorder/{orphacode}/genes",
            summary:
                "Get genes associated with a rare disease, including association type (disease-causing, susceptibility, modifier, etc.)",
            category: "gene",
            pathParams: [
                {
                    name: "orphacode",
                    type: "number",
                    required: true,
                    description: "ORPHAcode of the disorder",
                },
            ],
            queryParams: [],
        },
        {
            method: "GET",
            path: "/rd-api/gene/{gene_symbol}/disorders",
            summary:
                "Get all rare diseases associated with a gene symbol. Returns disorder list with ORPHAcodes and association types.",
            category: "gene",
            pathParams: [
                {
                    name: "gene_symbol",
                    type: "string",
                    required: true,
                    description: "HGNC gene symbol (e.g., FBN1, BRCA1, CFTR)",
                },
            ],
            queryParams: [],
        },
        {
            method: "GET",
            path: "/rd-api/gene/search",
            summary: "Search for genes by name or symbol in the Orphanet database",
            category: "gene",
            queryParams: [
                {
                    name: "query",
                    type: "string",
                    required: true,
                    description: "Gene name or symbol to search for",
                },
            ],
        },

        // === Prevalence ===
        {
            method: "GET",
            path: "/rd-api/disorder/{orphacode}/prevalence",
            summary:
                "Get epidemiological/prevalence data for a rare disease. Returns prevalence type, class, geographic area, and source.",
            category: "prevalence",
            pathParams: [
                {
                    name: "orphacode",
                    type: "number",
                    required: true,
                    description: "ORPHAcode of the disorder",
                },
            ],
            queryParams: [],
        },
        {
            method: "GET",
            path: "/rd-api/disorder/{orphacode}/epidemiology",
            summary:
                "Get full epidemiological profile including prevalence, incidence, and case counts",
            category: "prevalence",
            pathParams: [
                {
                    name: "orphacode",
                    type: "number",
                    required: true,
                    description: "ORPHAcode of the disorder",
                },
            ],
            queryParams: [],
        },

        // === Natural History ===
        {
            method: "GET",
            path: "/rd-api/disorder/{orphacode}/natural-history",
            summary:
                "Get natural history data: age of onset, age of death, inheritance pattern for a rare disease",
            category: "natural-history",
            pathParams: [
                {
                    name: "orphacode",
                    type: "number",
                    required: true,
                    description: "ORPHAcode of the disorder",
                },
            ],
            queryParams: [],
        },
        {
            method: "GET",
            path: "/rd-api/disorder/{orphacode}/phenotypes",
            summary:
                "Get HPO (Human Phenotype Ontology) phenotype annotations for a rare disease with frequency data",
            category: "natural-history",
            pathParams: [
                {
                    name: "orphacode",
                    type: "number",
                    required: true,
                    description: "ORPHAcode of the disorder",
                },
            ],
            queryParams: [],
        },

        // === Classification ===
        {
            method: "GET",
            path: "/rd-api/classification",
            summary:
                "List all rare disease classification hierarchies (e.g., Rare neurological disease, Rare cardiac disease)",
            category: "classification",
            queryParams: [],
        },
        {
            method: "GET",
            path: "/rd-api/classification/{id}/disorders",
            summary: "Get all disorders within a specific classification hierarchy",
            category: "classification",
            pathParams: [
                {
                    name: "id",
                    type: "number",
                    required: true,
                    description:
                        "Classification ID (numeric identifier for the classification hierarchy)",
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
            path: "/rd-api/disorder/{orphacode}/classifications",
            summary: "Get all classification hierarchies that contain a specific disorder",
            category: "classification",
            pathParams: [
                {
                    name: "orphacode",
                    type: "number",
                    required: true,
                    description: "ORPHAcode of the disorder",
                },
            ],
            queryParams: [],
        },
        {
            method: "GET",
            path: "/rd-api/disorder/{orphacode}/children",
            summary:
                "Get child disorders (subtypes) of a disorder in the Orphanet classification hierarchy",
            category: "classification",
            pathParams: [
                {
                    name: "orphacode",
                    type: "number",
                    required: true,
                    description: "ORPHAcode of the parent disorder",
                },
            ],
            queryParams: [],
        },
    ],
};
