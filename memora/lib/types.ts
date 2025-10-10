export type QueryPlan = {
  time_intent: 'last' | 'first' | 'range';
  entities: string[];
  filters?: { type_any_of?: string[]; date_range?: { from?: string; to?: string } };
  must_text?: string;
  sort: 'desc' | 'asc';
  size: number;
};

export type Artifact = {
  kind: 'photo' | 'file' | 'audio' | 'link';
  name?: string;
  gcs_path: string;
  thumb?: string;
  mime?: string;
};

export type MomentDoc = {
  moment_id: string;
  user_id: string;
  timestamp: string;
  type: string;
  language?: string;
  title?: string;
  text?: string;
  text_en?: string;
  entities?: string[];
  geo?: { city?: string; country?: string };
  tags?: string[];
  artifacts?: Artifact[];
  vector?: number[];
};

export type EvidenceItem = {
  kind: Artifact['kind'];
  name: string;
  signedUrl: string;
  thumbUrl?: string;
  mime?: string;
  highlight?: string;  // Highlighted excerpt from document/PDF
};

export type GroundedAnswer = {
  question: string;
  answerText: string;   // max 2 sentences
  when?: string;
  location?: { city?: string; country?: string };
  evidence: EvidenceItem[];
  highlights?: string[];
  debug?: any;
};
