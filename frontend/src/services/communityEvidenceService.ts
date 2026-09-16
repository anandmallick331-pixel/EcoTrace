/**
 * Community Evidence Submission Service
 *
 * Facilitates public evidence contribution (PDF, CSV, XLSX, public URLs, bulletins)
 * for non-official users (tourists, residents, researchers) while strictly preserving
 * data integrity and preventing unauthorized modification of verified observations.
 */

import { authService } from './authService';

export interface CommunityEvidenceSubmission {
  id: number | string;
  submission_id: string;
  title?: string;
  submission_type: 'pdf' | 'csv' | 'xlsx' | 'url' | 'text' | 'bulletin' | string;
  description?: string;
  destination_id?: number | null;
  destination_name?: string | null;
  metric_code?: string | null;
  contributor_name?: string | null;
  contributor_email?: string | null;
  contributor_contact?: string | null;
  source_url?: string | null;
  file_name?: string | null;
  file_content_type?: string | null;
  file_size_bytes?: number | null;
  raw_text?: string | null;
  status: 'SUBMITTED' | 'UNDER_REVIEW' | 'VERIFIED' | 'ACCEPTED' | 'NEEDS_CLARIFICATION' | 'REJECTED';
  submitted_at: string;
  last_updated_at?: string | null;
  reviewed_at?: string | null;
  reviewed_by?: string | null;
  reviewer_role?: string | null;
  decision_reason?: string | null;
  review_notes?: string | null;
  clarification_request?: string | null;
  message?: string;
  notice?: string;
}

export interface CommunityEvidenceSubmissionInput {
  submission_type: 'pdf' | 'csv' | 'xlsx' | 'url' | 'text';
  description: string;
  destination_id?: number | string;
  destination_name?: string;
  metric_code?: string;
  contributor_name?: string;
  contributor_email?: string;
  contributor_contact?: string;
  source_url?: string;
  raw_text?: string;
  file?: File | null;
}

const STORAGE_KEY = 'ecotrace_community_evidence_submissions';

export const communityEvidenceService = {
  /**
   * Submit new public community evidence to FastAPI backend (/api/v1/community-evidence/submit)
   * with local storage persistence fallback.
   */
  submitEvidence: async (
    input: CommunityEvidenceSubmissionInput
  ): Promise<CommunityEvidenceSubmission> => {
    try {
      let responseData: CommunityEvidenceSubmission | null = null;

      if (input.file) {
        // Multipart form-data for files
        const formData = new FormData();
        formData.append('file', input.file);
        formData.append('submission_type', input.submission_type);
        formData.append('description', input.description);
        
        if (input.destination_id !== undefined && input.destination_id !== null && input.destination_id !== '') {
          formData.append('destination_id', String(input.destination_id));
        }
        if (input.destination_name) {
          formData.append('destination_name', input.destination_name);
        }
        if (input.metric_code) {
          formData.append('metric_code', input.metric_code);
        }
        if (input.contributor_name) {
          formData.append('contributor_name', input.contributor_name);
        }
        if (input.contributor_email) {
          formData.append('contributor_email', input.contributor_email);
        }
        if (input.contributor_contact) {
          formData.append('contributor_contact', input.contributor_contact);
        }
        if (input.source_url) {
          formData.append('source_url', input.source_url);
        }
        if (input.raw_text) {
          formData.append('raw_text', input.raw_text);
        }

        const res = await fetch('/api/v1/community-evidence/submit', {
          method: 'POST',
          body: formData,
        });

        if (res.ok) {
          responseData = await res.json();
        } else {
          const errBody = await res.json().catch(() => ({}));
          throw new Error(errBody.detail || `Server returned ${res.status}`);
        }
      } else {
        // JSON payload for URL / Bulletin / Text
        let destIdNum: number | undefined = undefined;
        if (input.destination_id !== undefined && input.destination_id !== null && input.destination_id !== '') {
          const parsed = Number(input.destination_id);
          if (!isNaN(parsed)) destIdNum = parsed;
        }

        const bodyPayload = {
          submission_type: input.submission_type,
          description: input.description,
          destination_id: destIdNum,
          destination_name: input.destination_name || null,
          metric_code: input.metric_code || null,
          contributor_name: input.contributor_name || null,
          contributor_email: input.contributor_email || null,
          contributor_contact: input.contributor_contact || null,
          source_url: input.source_url || null,
          raw_text: input.raw_text || null,
          file_name: null,
        };

        const res = await fetch('/api/v1/community-evidence/submit', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(bodyPayload),
        });

        if (res.ok) {
          responseData = await res.json();
        } else {
          const errBody = await res.json().catch(() => ({}));
          throw new Error(errBody.detail || `Server returned ${res.status}`);
        }
      }

      if (responseData) {
        communityEvidenceService._saveToLocal(responseData);
        return responseData;
      }
    } catch (networkOrServerError) {
      console.warn('Backend submission error or offline, saving to local fallback storage:', networkOrServerError);
    }

    // Fallback ID generator if backend offline
    const randNum = Math.floor(1000 + Math.random() * 9000);
    const fallbackId = `ECO-SUB-${randNum}`;
    const fallbackSubmission: CommunityEvidenceSubmission = {
      id: randNum,
      submission_id: fallbackId,
      title: input.description.split('\n')[0].substring(0, 100),
      submission_type: input.submission_type,
      description: input.description,
      destination_id: input.destination_id ? Number(input.destination_id) || null : null,
      destination_name: input.destination_name || null,
      metric_code: input.metric_code || null,
      contributor_name: input.contributor_name || null,
      contributor_email: input.contributor_email || null,
      contributor_contact: input.contributor_contact || null,
      source_url: input.source_url || null,
      file_name: input.file ? input.file.name : null,
      file_content_type: input.file ? input.file.type : null,
      file_size_bytes: input.file ? input.file.size : null,
      raw_text: input.raw_text || null,
      status: 'SUBMITTED',
      submitted_at: new Date().toISOString(),
      message: 'Evidence submitted successfully.',
      notice: 'Your evidence will be reviewed by an authorized EcoTrace official before becoming verified data.',
    };

    communityEvidenceService._saveToLocal(fallbackSubmission);
    return fallbackSubmission;
  },

  /**
   * Fetch all submissions with optional destination & status filter
   */
  getSubmissions: async (destinationId?: string | number, status?: string): Promise<CommunityEvidenceSubmission[]> => {
    try {
      const params = new URLSearchParams();
      if (destinationId && destinationId !== 'all') {
        const dNum = Number(destinationId);
        if (!isNaN(dNum)) params.append('destination_id', String(dNum));
      }
      if (status && status !== 'all') {
        params.append('status', status);
      }

      const authHeaders = authService.getAuthHeaders();
      const res = await fetch(`/api/v1/community-evidence?${params.toString()}`, {
        headers: {
          ...authHeaders,
        },
      });

      if (res.ok) {
        const data = await res.json();
        const items: CommunityEvidenceSubmission[] = data.items || [];
        // When logged in as official, merge with any pending local fallback items if relevant
        const isOfficial = authService.isAuthenticated();
        if (isOfficial) {
          const localItems = communityEvidenceService.getLocalSubmissions();
          const remoteIds = new Set(items.map((i) => i.submission_id));
          const merged = [...items, ...localItems.filter((li) => !remoteIds.has(li.submission_id))];
          return merged;
        }
        return items;
      }
    } catch (e) {
      console.warn('Could not fetch remote submissions, returning local cached list:', e);
    }
    return communityEvidenceService.getLocalSubmissions();
  },

  /**
   * Get single submission by database ID or submission_id (ECO-SUB-xxxx)
   */
  getSubmissionById: async (idOrCode: string): Promise<CommunityEvidenceSubmission | null> => {
    try {
      const authHeaders = authService.getAuthHeaders();
      const res = await fetch(`/api/v1/community-evidence/${encodeURIComponent(idOrCode)}`, {
        headers: {
          ...authHeaders,
        },
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (e) {
      console.warn('Failed to fetch submission by ID remotely:', e);
    }
    const local = communityEvidenceService.getLocalSubmissions();
    return local.find((s) => s.submission_id.toLowerCase() === idOrCode.toLowerCase() || String(s.id) === idOrCode) || null;
  },

  /**
   * Official Action: Accept and Verify submission into live EcoTrace database
   */
  acceptAndVerify: async (
    idOrCode: string,
    reason: string,
    reviewerName?: string,
    overrideDestId?: number,
    overrideMetricCode?: string
  ): Promise<{ submission: CommunityEvidenceSubmission; ingestion_success: boolean; observation_id?: number }> => {
    const authHeaders = authService.getAuthHeaders();
    const payload = {
      reviewer_name: reviewerName || authService.getUser()?.name || 'EcoTrace Statutory Reviewer',
      reason,
      override_destination_id: overrideDestId,
      override_metric_code: overrideMetricCode,
    };

    const res = await fetch(`/api/v1/community-evidence/${encodeURIComponent(idOrCode)}/accept-and-verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders,
      },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      const data = await res.json();
      communityEvidenceService._updateLocalStatus(idOrCode, 'VERIFIED', `Accepted & Verified: ${reason}`, reviewerName);
      return data;
    } else {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Accept and verify action failed');
    }
  },

  /**
   * Official Action: Request clarification from contributor
   */
  requestClarification: async (
    idOrCode: string,
    reason: string,
    instructions: string,
    reviewerName?: string
  ): Promise<CommunityEvidenceSubmission> => {
    const authHeaders = authService.getAuthHeaders();
    const payload = {
      reviewer_name: reviewerName || authService.getUser()?.name || 'EcoTrace Statutory Reviewer',
      reason,
      clarification_instructions: instructions,
    };

    const res = await fetch(`/api/v1/community-evidence/${encodeURIComponent(idOrCode)}/request-clarification`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders,
      },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      const data = await res.json();
      communityEvidenceService._updateLocalStatus(
        idOrCode,
        'NEEDS_CLARIFICATION',
        `Clarification Requested: ${reason}\nAction Required: ${instructions}`,
        reviewerName
      );
      return data;
    } else {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Clarification request failed');
    }
  },

  /**
   * Official Action: Reject submission
   */
  reject: async (idOrCode: string, reason: string, reviewerName?: string): Promise<CommunityEvidenceSubmission> => {
    const authHeaders = authService.getAuthHeaders();
    const payload = {
      reviewer_name: reviewerName || authService.getUser()?.name || 'EcoTrace Statutory Reviewer',
      reason,
    };

    const res = await fetch(`/api/v1/community-evidence/${encodeURIComponent(idOrCode)}/reject`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders,
      },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      const data = await res.json();
      communityEvidenceService._updateLocalStatus(idOrCode, 'REJECTED', `Rejected: ${reason}`, reviewerName);
      return data;
    } else {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Reject action failed');
    }
  },

  /**
   * Retrieve cached local submissions
   */
  getLocalSubmissions: (): CommunityEvidenceSubmission[] => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  },

  _saveToLocal: (sub: CommunityEvidenceSubmission) => {
    try {
      const existing = communityEvidenceService.getLocalSubmissions();
      const updated = [sub, ...existing.filter((s) => s.submission_id !== sub.submission_id)];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.warn('Failed to save submission to localStorage:', e);
    }
  },

  _updateLocalStatus: (
    idOrCode: string,
    newStatus: CommunityEvidenceSubmission['status'],
    notes?: string,
    reviewer?: string
  ) => {
    try {
      const existing = communityEvidenceService.getLocalSubmissions();
      const targetStr = idOrCode.toLowerCase();
      const updated = existing.map((item) => {
        if (item.submission_id.toLowerCase() === targetStr || String(item.id) === targetStr) {
          return {
            ...item,
            status: newStatus,
            review_notes: notes || item.review_notes,
            reviewed_by: reviewer || item.reviewed_by,
            reviewed_at: new Date().toISOString(),
          };
        }
        return item;
      });
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.warn('Failed to update local status:', e);
    }
  },
};
