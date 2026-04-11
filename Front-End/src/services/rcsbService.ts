/**
 * RCSB PDB API Service
 * Provides protein structure metadata from the RCSB Protein Data Bank.
 * All calls hit RCSB's public REST API (CORS-open).
 */

const RCSB_SEARCH_URL = 'https://search.rcsb.org/rcsbsearch/v2/query';
const RCSB_DATA_URL   = 'https://data.rcsb.org/rest/v1/core';

export interface RCSBMetadata {
  pdbId:        string;
  title:        string;
  resolution:   number | null;
  organism:     string;
  method:       string;
  ligands:      string[];
  doi:          string | null;
  releaseDate:  string;
  depositionDate: string;
  authors:      string[];
  similarityScore?: number;
}

/**
 * Searches RCSB by sequence similarity and returns the best-matching PDB entry.
 * Uses the RCSB Sequence Search API (BLAST-like alignment).
 */
export async function searchBySequence(fastaOrSequence: string): Promise<string | null> {
  // Extract raw sequence if FASTA format
  let sequence = fastaOrSequence;
  if (fastaOrSequence.startsWith('>')) {
    sequence = fastaOrSequence
      .split('\n')
      .filter(line => !line.startsWith('>'))
      .join('')
      .replace(/\s+/g, '');
  }
  if (sequence.length < 10) return null;

  const queryPayload = {
    query: {
      type: 'terminal',
      service: 'sequence',
      parameters: {
        evalue_cutoff: 1,
        identity_cutoff: 0.5,
        sequence_type: 'protein',
        value: sequence,
      },
    },
    return_type: 'entry',
    request_options: {
      paginate: { start: 0, rows: 1 },
      sort: [{ sort_by: 'score', direction: 'desc' }],
    },
  };

  try {
    const resp = await fetch(RCSB_SEARCH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(queryPayload),
    });
    if (!resp.ok) return null;
    const data = await resp.json();
    if (data?.result_set?.length > 0) {
      return data.result_set[0].identifier as string;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Searches RCSB by a given protein name/keyword and returns the best PDB ID.
 */
export async function searchByName(query: string): Promise<string | null> {
  const queryPayload = {
    query: {
      type: 'terminal',
      service: 'full_text',
      parameters: { value: query },
    },
    return_type: 'entry',
    request_options: {
      paginate: { start: 0, rows: 1 },
    },
  };
  try {
    const resp = await fetch(RCSB_SEARCH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(queryPayload),
    });
    if (!resp.ok) return null;
    const data = await resp.json();
    if (data?.result_set?.length > 0) {
      return data.result_set[0].identifier as string;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Fetches full metadata for a given PDB entry ID.
 */
export async function getEntryMetadata(pdbId: string): Promise<RCSBMetadata | null> {
  const id = pdbId.toUpperCase();
  try {
    const [entryResp, polymersResp, ligandResp] = await Promise.all([
      fetch(`${RCSB_DATA_URL}/entry/${id}`),
      fetch(`${RCSB_DATA_URL}/entry/${id}/polymer_entities`).catch(() => null),
      fetch(`${RCSB_DATA_URL}/entry/${id}/nonpolymer_entities`).catch(() => null),
    ]);

    if (!entryResp.ok) return null;
    const entry = await entryResp.json();

    // Resolution
    const resolution =
      entry?.rcsb_entry_info?.resolution_combined?.[0] ??
      entry?.refine?.[0]?.ls_d_res_high ??
      null;

    // Organism
    let organism = 'N/A';
    try {
      if (polymersResp && polymersResp.ok) {
        const polymers: any[] = await polymersResp.json();
        if (polymers?.length > 0) {
          organism =
            polymers[0]?.rcsb_entity_source_organism?.[0]?.organism_scientific_name ??
            polymers[0]?.rcsb_entity_source_organism?.[0]?.ncbi_scientific_name ??
            'N/A';
        }
      }
    } catch { /* organism stays N/A */ }

    // Experimental method
    const method =
      entry?.rcsb_entry_info?.experimental_method ??
      entry?.exptl?.[0]?.method ??
      'N/A';

    // Ligands
    const ligands: string[] = [];
    try {
      if (ligandResp && ligandResp.ok) {
        const ligandArr: any[] = await ligandResp.json();
        for (const lig of (ligandArr || [])) {
          const compId = lig?.pdbx_entity_nonpoly?.comp_id;
          if (compId) ligands.push(compId);
        }
      }
    } catch { /* ligands stays empty */ }

    // Primary citation DOI
    const doi =
      entry?.rcsb_primary_citation?.pdbx_database_id_doi ??
      entry?.citation?.[0]?.pdbx_database_id_doi ??
      null;

    // Authors
    const authors: string[] = [];
    try {
      const auths = entry?.rcsb_primary_citation?.rcsb_authors ?? entry?.audit_author ?? [];
      for (const a of auths) {
        if (typeof a === 'string') authors.push(a);
        else if (a?.name) authors.push(a.name);
      }
    } catch { /* */ }

    return {
      pdbId: id,
      title: entry?.struct?.title ?? entry?.rcsb_entry_info?.ndb_IdCode_NDB ?? id,
      resolution: resolution ? parseFloat(Number(resolution).toFixed(2)) : null,
      organism,
      method,
      ligands,
      doi,
      releaseDate:    entry?.rcsb_accession_info?.initial_release_date?.substring(0, 10) ?? 'N/A',
      depositionDate: entry?.rcsb_accession_info?.deposit_date?.substring(0, 10) ?? 'N/A',
      authors,
    };
  } catch {
    return null;
  }
}
