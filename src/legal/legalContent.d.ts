export interface LegalSection {
  heading: string;
  paras?: string[];
  bullets?: string[];
}

export interface LegalDocument {
  id: 'disclaimer' | 'risk' | 'terms' | 'privacy' | 'sources';
  title: string;
  short: string;
  summary: string;
  sections: LegalSection[];
}

export function getLegalDocuments(cfg: {
  ownerDisplayName: string;
  contactEmail: string;
  jurisdictionCity: string;
  legalEffectiveDate: string;
  siteName: string;
  legalVersion: string;
}): LegalDocument[];
