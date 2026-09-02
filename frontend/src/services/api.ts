/**
 * EcoTrace REST API Client
 *
 * Interfaces directly with the EcoTrace FastAPI backend at /api/v1.
 * Provides typed methods for destinations, locations, observations,
 * metrics, sources, datasets, provenance, scoring, and scenarios.
 */

const API_BASE_URL = '/api/v1';
// ── Backend Contract Interfaces ──────────────────────────────────────────────

export interface BackendDestination {
  id: number;
  name: string;
  country_code: string;
  region: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface BackendLocation {
  id: number;
  destination_id: number;
  label: string;
  latitude: number;
  longitude: number;
  geojson: Record<string, unknown> | null;
}

export interface BackendMetricDefinition {
  id: number;
  code: string;
  version: string;
  name: string;
  category: string;
  unit: string;
  direction: 'lower_is_better' | 'higher_is_better' | 'neutral';
  description: string | null;
  created_at: string;
}

export interface BackendSource {
  id: number;
  name: string;
  organisation: string;
  description: string | null;
  url: string | null;
  created_at: string;
  updated_at: string;
}

export interface BackendDataset {
  id: number;
  source_id: number;
  name: string;
  version: string;
  publication_date: string | null;
  url: string | null;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface BackendEvidence {
  id: number;
  observation_id: number;
  source_id: number;
  dataset_id: number;
  evidence_type: string;
  reference_url: string | null;
  raw_excerpt: string | null;
  notes: string | null;
  created_at: string;
}

export interface BackendObservation {
  id: number;
  destination_id: number;
  location_id: number | null;
  metric_definition_id: number;
  dataset_id: number;
  period_start: string;
  period_end: string;
  original_value: number | null;
  normalized_value: number | null;
  status: 'raw' | 'processed' | 'verified';
  confidence: 'low' | 'medium' | 'high';
  destination_specificity: string;
  methodology: string | null;
  assumptions: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  location?: BackendLocation | null;
  metric_definition?: BackendMetricDefinition | null;
  dataset?: BackendDataset | null;
  evidence_items?: BackendEvidence[];
}

export interface BackendObservationProvenance {
  observation_id: number;
  destination_id: number;
  location_id: number | null;
  period_start: string;
  period_end: string;
  original_value: number | null;
  normalized_value: number | null;
  status: string;
  confidence: string;
  destination_specificity: string;
  methodology: string | null;
  assumptions: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  location?: BackendLocation | null;
  metric_definition: BackendMetricDefinition;
  dataset: BackendDataset;
  source: BackendSource;
  evidence: BackendEvidence[];
}

export interface BackendScoreComponent {
  metric_code: string;
  metric_name: string;
  category: string;
  normalized_value: number | null;
  weight: number | null;
  score_contribution: number | null;
  confidence: 'low' | 'medium' | 'high' | null;
  evidence_coverage: number | null;
  waste_intensity?: number | null;
  destination_load?: number | null;
  waste_density?: number | null;
  destination_area_sqkm?: number | null;
  density_basis?: string | null;
  raw_waste?: number | null;
  normalization_basis?: string | null;
  unit?: string | null;
}

export interface BackendCategoryScore {
  category: string;
  score: number | null;
  lower_bound: number | null;
  upper_bound: number | null;
  weight: number | null;
  confidence: 'low' | 'medium' | 'high' | null;
  evidence_coverage: number | null;
  components: BackendScoreComponent[];
}

export interface BackendOverallScore {
  destination_id: number;
  score: number | null;
  lower_bound: number | null;
  upper_bound: number | null;
  confidence: 'low' | 'medium' | 'high' | null;
  evidence_coverage: number | null;
  scoring_version: string | null;
  calculation_timestamp: string | null;
  categories: BackendCategoryScore[];
}

export interface BackendScoreOverview {
  destination_id: number;
  score: number | null;
  lower_bound: number | null;
  upper_bound: number | null;
  confidence: 'low' | 'medium' | 'high' | null;
  evidence_coverage: number | null;
  scoring_version: string | null;
  calculation_timestamp: string | null;
  category_scores: Record<string, number | null>;
}

export interface BackendScenarioMetricImpact {
  metric_code: string;
  metric_name: string | null;
  baseline_value: number | null;
  projected_value: number | null;
  delta: number | null;
  unit: string | null;
}

export interface BackendScenarioCreate {
  intervention_type: string;
  parameter: string;
  value: number;
  description?: string | null;
}

export interface BackendScenarioResponse {
  scenario_id: string;
  destination_id: number;
  intervention_type: string;
  parameter: string;
  value: number;
  description: string | null;
  baseline_score: number | null;
  projected_score: number | null;
  score_change: number | null;
  affected_metrics: BackendScenarioMetricImpact[];
  confidence: 'low' | 'medium' | 'high' | null;
  assumptions: string[];
  projection_status: string;
  created_at: string | null;
}

// ── Generic Fetch Wrapper with Error Handling ───────────────────────────────

class ApiError extends Error {
  constructor(
    public status: number,
    public statusText: string,
    public data: unknown
  ) {
    super(`API Error ${status} (${statusText}): ${JSON.stringify(data)}`);
    this.name = 'ApiError';
  }
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  const defaultHeaders = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };

  const response = await fetch(url, {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
  });

  if (!response.ok) {
    let errorData: unknown;
    try {
      errorData = await response.json();
    } catch {
      errorData = await response.text();
    }
    throw new ApiError(response.status, response.statusText, errorData);
  }

  if (response.status === 204) {
    return null as T;
  }

  return response.json() as Promise<T>;
}

// ── Service Endpoints ────────────────────────────────────────────────────────

export const api = {
  // ── Destinations ───────────────────────────────────────────────────────────
  async getDestinations(skip = 0, limit = 100): Promise<BackendDestination[]> {
    return request<BackendDestination[]>(`/destinations?skip=${skip}&limit=${limit}`);
  },

  async getDestination(id: number): Promise<BackendDestination> {
    return request<BackendDestination>(`/destinations/${id}`);
  },

  async getDestinationByName(name: string): Promise<BackendDestination | null> {
    const all = await this.getDestinations(0, 100);
    return all.find((d) => d.name.toLowerCase() === name.toLowerCase()) || null;
  },

  // ── Locations ──────────────────────────────────────────────────────────────
  async getLocations(destinationId?: number): Promise<BackendLocation[]> {
    const query = destinationId ? `?destination_id=${destinationId}&limit=100` : '?limit=100';
    return request<BackendLocation[]>(`/locations${query}`);
  },

  async getDestinationLocations(destinationId: number): Promise<BackendLocation[]> {
    return this.getLocations(destinationId);
  },

  // ── Metrics ────────────────────────────────────────────────────────────────
  async getMetrics(code?: string, skip = 0, limit = 100): Promise<BackendMetricDefinition[]> {
    const query = code ? `?code=${encodeURIComponent(code)}&skip=${skip}&limit=${Math.min(limit, 100)}` : `?skip=${skip}&limit=${Math.min(limit, 100)}`;
    return request<BackendMetricDefinition[]>(`/metrics${query}`);
  },

  async getAllMetrics(): Promise<BackendMetricDefinition[]> {
    const all: BackendMetricDefinition[] = [];
    const limit = 100;
    for (let skip = 0; skip <= 1000; skip += limit) {
      try {
        const chunk = await this.getMetrics(undefined, skip, limit);
        all.push(...chunk);
        if (chunk.length < limit) break;
      } catch (err) {
        console.warn(`Metrics page skip=${skip} notice:`, err);
        break;
      }
    }
    return all;
  },

  async getAllSources(): Promise<BackendSource[]> {
    const all: BackendSource[] = [];
    const limit = 100;
    for (let skip = 0; skip <= 500; skip += limit) {
      try {
        const chunk = await this.getSources(skip, limit);
        all.push(...chunk);
        if (chunk.length < limit) break;
      } catch (err) {
        console.warn(`Sources page skip=${skip} notice:`, err);
        break;
      }
    }
    return all;
  },

  async getAllDatasets(): Promise<BackendDataset[]> {
    const all: BackendDataset[] = [];
    const limit = 100;
    for (let skip = 0; skip <= 500; skip += limit) {
      try {
        const chunk = await this.getDatasets(undefined, skip, limit);
        all.push(...chunk);
        if (chunk.length < limit) break;
      } catch (err) {
        console.warn(`Datasets page skip=${skip} notice:`, err);
        break;
      }
    }
    return all;
  },

  async getMetric(metricId: number): Promise<BackendMetricDefinition> {
    return request<BackendMetricDefinition>(`/metrics/${metricId}`);
  },

  async getMetricByCodeVersion(code: string, version = '1.0'): Promise<BackendMetricDefinition> {
    return request<BackendMetricDefinition>(`/metrics/code/${encodeURIComponent(code)}/version/${encodeURIComponent(version)}`);
  },

  // ── Observations ───────────────────────────────────────────────────────────
  async getObservations(params: {
    destinationId?: number;
    locationId?: number;
    metricDefinitionId?: number;
    datasetId?: number;
    skip?: number;
    limit?: number;
  } = {}): Promise<BackendObservation[]> {
    const limit = Math.min(params.limit ?? 100, 100);
    const queryParts: string[] = [];
    if (params.destinationId !== undefined) queryParts.push(`destination_id=${params.destinationId}`);
    if (params.locationId !== undefined) queryParts.push(`location_id=${params.locationId}`);
    if (params.metricDefinitionId !== undefined) queryParts.push(`metric_definition_id=${params.metricDefinitionId}`);
    if (params.datasetId !== undefined) queryParts.push(`dataset_id=${params.datasetId}`);
    queryParts.push(`skip=${params.skip ?? 0}`);
    queryParts.push(`limit=${limit}`);

    const qs = queryParts.length ? `?${queryParts.join('&')}` : '';
    return request<BackendObservation[]>(`/observations${qs}`);
  },

  async getAllObservations(destinationId: number): Promise<BackendObservation[]> {
    const all: BackendObservation[] = [];
    const limit = 100;
    for (let skip = 0; skip <= 600; skip += limit) {
      try {
        const chunk = await this.getObservations({ destinationId, skip, limit });
        all.push(...chunk);
        if (chunk.length < limit) break;
      } catch (err) {
        console.warn(`Observation page skip=${skip} notice:`, err);
      }
    }
    return all;
  },

  async getObservation(observationId: number): Promise<BackendObservation> {
    return request<BackendObservation>(`/observations/${observationId}`);
  },

  async getObservationProvenance(observationId: number): Promise<BackendObservationProvenance> {
    return request<BackendObservationProvenance>(`/observations/${observationId}/provenance`);
  },

  // ── Sources & Datasets ─────────────────────────────────────────────────────
  async getSources(skip = 0, limit = 100): Promise<BackendSource[]> {
    return request<BackendSource[]>(`/sources?skip=${skip}&limit=${limit}`);
  },

  async getSource(sourceId: number): Promise<BackendSource> {
    return request<BackendSource>(`/sources/${sourceId}`);
  },

  async getDatasets(sourceId?: number, skip = 0, limit = 100): Promise<BackendDataset[]> {
    const query = sourceId ? `?source_id=${sourceId}&skip=${skip}&limit=${limit}` : `?skip=${skip}&limit=${limit}`;
    return request<BackendDataset[]>(`/datasets${query}`);
  },

  async getDataset(datasetId: number): Promise<BackendDataset> {
    return request<BackendDataset>(`/datasets/${datasetId}`);
  },

  // ── Evidence ───────────────────────────────────────────────────────────────
  async getEvidence(params: {
    observationId?: number;
    sourceId?: number;
    datasetId?: number;
    skip?: number;
    limit?: number;
  } = {}): Promise<BackendEvidence[]> {
    const queryParts: string[] = [];
    if (params.observationId !== undefined) queryParts.push(`observation_id=${params.observationId}`);
    if (params.sourceId !== undefined) queryParts.push(`source_id=${params.sourceId}`);
    if (params.datasetId !== undefined) queryParts.push(`dataset_id=${params.datasetId}`);
    queryParts.push(`skip=${params.skip ?? 0}`);
    queryParts.push(`limit=${params.limit ?? 100}`);

    const qs = queryParts.length ? `?${queryParts.join('&')}` : '';
    return request<BackendEvidence[]>(`/evidence${qs}`);
  },

  // ── Scoring ────────────────────────────────────────────────────────────────
  async getDestinationScores(destinationId: number): Promise<BackendOverallScore> {
    return request<BackendOverallScore>(`/destinations/${destinationId}/scores`);
  },

  async getDestinationScoreOverview(destinationId: number): Promise<BackendScoreOverview> {
    return request<BackendScoreOverview>(`/destinations/${destinationId}/scores/overview`);
  },

  // ── Scenarios ──────────────────────────────────────────────────────────────
  async simulateScenario(destinationId: number, payload: BackendScenarioCreate): Promise<BackendScenarioResponse> {
    return request<BackendScenarioResponse>(`/destinations/${destinationId}/scenarios`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async createScenario(destinationId: number, payload: BackendScenarioCreate): Promise<BackendScenarioResponse> {
    return this.simulateScenario(destinationId, payload);
  },

  async getScenario(destinationId: number, scenarioId: string): Promise<BackendScenarioResponse> {
    return request<BackendScenarioResponse>(`/destinations/${destinationId}/scenarios/${encodeURIComponent(scenarioId)}`);
  },

  // ── Business Registrations ──────────────────────────────────────────────────
  async createBusinessRegistration(payload: BusinessRegistrationPayload): Promise<BackendBusinessRegistration> {
    return request<BackendBusinessRegistration>('/business-registrations', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async getBusinessRegistrations(params: {
    destinationId?: number;
    status?: string;
    limit?: number;
    offset?: number;
  } = {}): Promise<{ total: number; items: BackendBusinessRegistration[] }> {
    const queryParts: string[] = [];
    if (params.destinationId !== undefined) queryParts.push(`destination_id=${params.destinationId}`);
    if (params.status !== undefined && params.status !== 'all') queryParts.push(`status=${encodeURIComponent(params.status)}`);
    if (params.limit !== undefined) queryParts.push(`limit=${params.limit}`);
    if (params.offset !== undefined) queryParts.push(`offset=${params.offset}`);

    const qs = queryParts.length ? `?${queryParts.join('&')}` : '';
    return request<{ total: number; items: BackendBusinessRegistration[] }>(`/business-registrations${qs}`);
  },

  async getBusinessRegistrationById(idOrTracking: string | number): Promise<BackendBusinessRegistration> {
    return request<BackendBusinessRegistration>(`/business-registrations/${encodeURIComponent(String(idOrTracking))}`);
  },

  async updateBusinessRegistrationStatus(
    idOrTracking: string | number,
    payload: BusinessRegistrationStatusUpdatePayload
  ): Promise<BackendBusinessRegistration> {
    return request<BackendBusinessRegistration>(`/business-registrations/${encodeURIComponent(String(idOrTracking))}/status`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },

  async deleteBusinessRegistration(
    idOrTracking: string | number
  ): Promise<{ status: string; id: number; tracking_id: string }> {
    return request<{ status: string; id: number; tracking_id: string }>(
      `/business-registrations/${encodeURIComponent(String(idOrTracking))}`,
      {
        method: 'DELETE',
      }
    );
  },

  // ── EcoTrace AI Assistant ──────────────────────────────────────────────────
  async askEcoTraceAI(payload: AIAskRequest): Promise<AIAskResponse> {
    return request<AIAskResponse>('/ai/ask', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async getEcoTraceAIStatus(): Promise<AIAssistantStatus> {
    return request<AIAssistantStatus>('/ai/status');
  },

  // ── Source Conflict Resolution Layer ──────────────────────────────────────
  async getConflicts(destinationId?: number, status?: string): Promise<BackendSourceConflict[]> {
    const params = new URLSearchParams();
    if (destinationId !== undefined) params.append('destination_id', String(destinationId));
    if (status) params.append('status', status);
    const qs = params.toString() ? `?${params.toString()}` : '';
    return request<BackendSourceConflict[]>(`/conflicts${qs}`);
  },

  async getObservationConflicts(observationId: number): Promise<BackendSourceConflict[]> {
    return request<BackendSourceConflict[]>(`/observations/${observationId}/conflicts`);
  },

  async getConflictSummary(destinationId?: number): Promise<BackendConflictSummary> {
    const qs = destinationId !== undefined ? `?destination_id=${destinationId}` : '';
    return request<BackendConflictSummary>(`/conflicts/summary${qs}`);
  },

  async getConflictById(id: number): Promise<BackendSourceConflict> {
    return request<BackendSourceConflict>(`/conflicts/${id}`);
  },

  async scanDestinationConflicts(destinationId: number): Promise<BackendSourceConflict[]> {
    return request<BackendSourceConflict[]>(`/conflicts/scan/${destinationId}`, {
      method: 'POST',
    });
  },

  async getReconciliations(destinationId?: number): Promise<BackendObservationReconciliation[]> {
    const qs = destinationId !== undefined ? `?destination_id=${destinationId}` : '';
    return request<BackendObservationReconciliation[]>(`/conflicts/reconciliations${qs}`);
  },

  async getReconciliationById(id: number): Promise<BackendObservationReconciliation> {
    return request<BackendObservationReconciliation>(`/conflicts/reconciliations/${id}`);
  },
};

export interface BackendBusinessRegistration {
  id: number;
  tracking_id: string;
  business_name: string;
  business_type: string;
  destination_id: number;
  destination_name?: string | null;
  location: string;
  contact: string;
  website?: string | null;
  price_range: string;
  local_employees: number;
  local_procurement_percent: number;
  community_ownership: string;
  environmental_practices: string[];
  evidence_details: string;
  status: 'PENDING_VERIFICATION' | 'UNDER_AUDIT' | 'VERIFIED' | 'REJECTED';
  submitted_at: string;
  reviewed_at?: string | null;
  reviewed_by?: string | null;
  review_notes?: string | null;
}

export interface BusinessRegistrationPayload {
  business_name: string;
  business_type: string;
  destination_id: number;
  location: string;
  contact: string;
  website?: string;
  price_range: string;
  local_employees: number;
  local_procurement_percent: number;
  community_ownership: string;
  environmental_practices: string[];
  evidence_details: string;
}

export interface BusinessRegistrationStatusUpdatePayload {
  status: 'PENDING_VERIFICATION' | 'UNDER_AUDIT' | 'VERIFIED' | 'REJECTED';
  reviewed_by: string;
  review_notes?: string;
}

// ── EcoTrace AI Interfaces ───────────────────────────────────────────────────

export interface AIAskRequest {
  destination_id: number;
  query: string;
  comparison_destination_id?: number | null;
  context?: Record<string, unknown> | null;
}

export interface AISupportingMetric {
  metric_code: string;
  metric_name: string;
  value: number | string | null;
  unit: string | null;
  period: string | null;
  category: string | null;
  status: 'VERIFIED' | 'DERIVED' | 'ESTIMATED / PROXY' | 'DATA GAP' | string;
  confidence: string;
  source: string | null;
}

export interface AIEvidenceCitation {
  source: string;
  organisation?: string | null;
  dataset?: string | null;
  period?: string | null;
  verification_status: string;
  reference_url?: string | null;
  excerpt?: string | null;
}

export interface AIRecommendationItem {
  title: string;
  category: string;
  priority: number;
  action_type: 'tourist_choice' | 'government_policy' | 'community_action' | string;
  supported_by_metrics: string[];
  expected_impact: string;
  evidence_source?: string | null;
}

export interface AIScenarioProjection {
  intervention_type: string;
  parameter: string;
  value: number;
  description?: string | null;
  baseline_score: number | null;
  projected_score: number | null;
  score_change: number | null;
  affected_metrics: string[];
  assumptions: string[];
  label: string;
}

export interface AIAskResponse {
  answer: string;
  destination_id: number;
  destination_name: string;
  comparison_destination_id?: number | null;
  comparison_destination_name?: string | null;
  recommendations: AIRecommendationItem[];
  supporting_metrics: AISupportingMetric[];
  evidence: AIEvidenceCitation[];
  scenario_projection?: AIScenarioProjection | null;
  data_quality: string;
  grounding_summary: string;
  data_gaps: string[];
  model: string;
  is_ai_available: boolean;
}

export interface AIAssistantStatus {
  enabled: boolean;
  provider: string;
  model: string;
  has_api_key: boolean;
  supported_destinations_count: number;
  grounding_source: string;
}

// ── Source Conflict Resolution Interfaces ───────────────────────────────────

export interface BackendConflictObservationDetail {
  observation_id: number;
  original_value: number | null;
  normalized_value: number | null;
  unit?: string | null;
  period_start: string;
  period_end: string;
  status: 'raw' | 'verified' | 'flagged' | 'rejected' | string;
  confidence: 'high' | 'medium' | 'low' | 'unknown' | string;
  destination_specificity: 'direct' | 'regional' | 'national' | 'modelled' | string;
  methodology?: string | null;
  source_name?: string | null;
  source_organisation?: string | null;
  dataset_name?: string | null;
  document_title?: string | null;
  evidence_count: number;
}

export interface BackendCategoricalFactors {
  verification_comparison: string;
  specificity_comparison: string;
  confidence_comparison: string;
  evidence_backing_comparison: string;
  authority_tier_comparison: string;
}

export interface BackendSourceConflict {
  id: number;
  destination_id: number;
  destination_name?: string | null;
  metric_definition_id: number;
  metric_code: string;
  metric_name: string;
  primary_observation: BackendConflictObservationDetail;
  competing_observation: BackendConflictObservationDetail;
  comparability_status: 'comparable' | 'disparate_scope' | 'incomparable_scope' | 'incomparable_period' | 'incomparable_unit' | 'incomparable_methodology';
  resolution_status: 'resolved_canonical' | 'reconciled' | 'disparate_scope' | 'compatibility_mismatch' | 'unresolved_conflict';
  canonical_observation_id?: number | null;
  reconciled_value?: number | null;
  resolution_method?: string | null;
  resolution_reason?: string | null;
  resolver_version?: string | null;
  observed_range?: string | null;
  disparate_dimensions?: string[];
  missing_evidence?: string[];
  categorical_factors: BackendCategoricalFactors | Record<string, unknown>;
  resolution_rationale: string;
  created_at: string;
  updated_at: string;
}

export interface BackendConflictSummary {
  destination_id?: number | null;
  total_conflicts: number;
  resolved_canonical: number;
  reconciled: number;
  disparate_scope?: number;
  compatibility_mismatch: number;
  unresolved_conflict: number;
}

export interface BackendReconciliationMember {
  id: number;
  reconciliation_id: number;
  observation_id: number;
  role: 'CANONICAL' | 'ALTERNATIVE' | 'CONTRIBUTING';
  observation?: BackendConflictObservationDetail | null;
}

export interface BackendObservationReconciliation {
  id: number;
  metric_id: number;
  metric_code: string;
  metric_name: string;
  destination_id: number;
  destination_name?: string | null;
  location_id?: number | null;
  status: 'selected' | 'resolved_canonical' | 'reconciled' | 'disparate_scope' | 'compatibility_mismatch' | 'unresolved_conflict';
  canonical_observation_id?: number | null;
  reconciled_value?: number | null;
  reconciled_unit?: string | null;
  resolution_method: 'EVIDENCE_PRECEDENCE' | 'UNRESOLVED' | 'SCOPE_MISMATCH' | 'STATISTICAL_AGGREGATION' | 'INSUFFICIENT_EVIDENCE';
  resolution_reason: string;
  comparability_reason?: string | null;
  resolver_version: string;
  members: BackendReconciliationMember[];
  created_at: string;
  updated_at: string;
}



