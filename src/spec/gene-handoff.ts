import type { WorkflowRecipe } from "@bio-mcp/shared/codemode/catalog";

export const geneHandoffWorkflow: WorkflowRecipe = {
  title: "Orphadata gene evidence handoff to ClinGen and G2P",
  keywords: ["ClinGen", "G2P", "HGNC", "gene", "disease", "association", "handoff"],
  description: "Select an explicit disease subtype, symbol and HGNC ID. Preserve every matching association and the complete native disease/cross-reference observations, including qualification, dates, licence and mapping relations. Duplicate matches remain separate. Use the handoff in ClinGen's comparison recipe; ORPHAcode, MONDO and OMIM concepts are not automatically equivalent.",
  code: `const selection = {orphacode: 284963, symbol: "FBN1", hgnc_id: "HGNC:3603"};
if (!Number.isSafeInteger(selection.orphacode) || selection.orphacode < 1 || !/^[A-Za-z0-9_.-]+$/.test(selection.symbol) || !/^HGNC:[1-9][0-9]*$/.test(selection.hgnc_id)) throw new Error("Invalid disease or gene selection");
const evidence = {selection, coverage_complete: false, disease_equivalence_verified: false};
const read = async path => {try {return await api.get(path);} catch (error) {return {__api_error: true, message: error.message, status: error.status, data: error.data};}};
const failure = (step, cause) => ({...evidence, step, __api_error: true, status: cause?.status || 502, cause});
evidence.associations = await read("/rd-associated-genes/orphacodes/" + selection.orphacode);
if (!evidence.associations || evidence.associations.__api_error || evidence.associations.__stage_error) return failure("associations_unavailable", evidence.associations);
let disorder;
if (evidence.associations.__staged) {
  let query;
  try {query = await api.query(evidence.associations.data_access_id, "SELECT native_json FROM disorders WHERE ORPHAcode = " + selection.orphacode + " LIMIT 2");}
  catch (error) {return failure("association_query_failed", {message: error.message});}
  evidence.selected_record_query = query;
  if (query?.__api_error || query?.__stage_error) return failure("association_query_failed", query);
  if (query?.__staged) return {...evidence, step: "inspect_selected_record"};
  if (!Array.isArray(query?.results) || query.results.length !== 1) return failure("disease_record_not_unique", query);
  try {disorder = JSON.parse(query.results[0].native_json);} catch {return failure("invalid_disease_record", query);}
} else disorder = evidence.associations.data?.results;
if (!disorder || Array.isArray(disorder) || disorder.ORPHAcode !== selection.orphacode || !Array.isArray(disorder.DisorderGeneAssociation)) return failure("disease_identity_or_shape_mismatch");
const selected = disorder.DisorderGeneAssociation.flatMap((association, association_index) => {
  const gene = association?.Gene;
  if (gene?.Symbol !== selection.symbol || !Array.isArray(gene.ExternalReference)) return [];
  const references = gene.ExternalReference.filter(ref => ref?.Source === "HGNC");
  const expected = selection.hgnc_id.slice(5);
  if (!references.length || references.some(ref => ref.Reference !== expected && ref.Reference !== selection.hgnc_id)) return [];
  return [{association_index, native: association}];
});
evidence.selected_associations = selected;
if (!selected.length) return {...evidence, step: "selected_gene_identity_not_observed"};
evidence.cross_references = await read("/rd-cross-referencing/orphacodes/" + selection.orphacode);
if (!evidence.cross_references || evidence.cross_references.__api_error || evidence.cross_references.__stage_error) return failure("cross_references_unavailable", evidence.cross_references);
if (evidence.cross_references.__staged) return {...evidence, step: "inspect_cross_references"};
const cross = evidence.cross_references.data?.results;
if (!cross || Array.isArray(cross) || cross.ORPHAcode !== selection.orphacode) return failure("cross_reference_identity_mismatch");
return {...evidence, step: "gene_handoff", handoff: {
  ...selection, provider_record_date: disorder.Date, association_indexes: selected.map(row => row.association_index),
  interpretation: "Compare exact HGNC identity in ClinGen. Keep every disease, inheritance, classification and panel separate; inspect G2P summary IDs and full records before asserting gene/disease equivalence. Retain Orphadata licence and both source handles."
}};`,
};
