export type JobStatus =
  | "saved"
  | "applied"
  | "interviewing"
  | "offer"
  | "rejected"
  | "withdrawn";

export const JOB_STATUSES: JobStatus[] = [
  "saved",
  "applied",
  "interviewing",
  "offer",
  "rejected",
  "withdrawn",
];

export type Section =
  | "education"
  | "experience"
  | "projects"
  | "leadership"
  | "skills"
  | "certifications"
  | "other";

export const SECTIONS: Section[] = [
  "education",
  "experience",
  "projects",
  "leadership",
  "skills",
  "certifications",
  "other",
];

export const SECTION_LABELS: Record<Section, string> = {
  education: "Education",
  experience: "Relevant Experience",
  projects: "Projects",
  leadership: "Leadership Experience",
  skills: "Skills",
  certifications: "Certifications",
  other: "Other",
};

export type DocType =
  | "resume"
  | "cover_letter"
  | "interview_prep"
  | "match_analysis"
  | "briefing"
  | "other";

export const DOC_TYPE_LABELS: Record<DocType, string> = {
  resume: "Resume",
  cover_letter: "Cover letter",
  interview_prep: "Interview prep",
  match_analysis: "Match analysis",
  briefing: "Industry briefing",
  other: "Document",
};

export interface Profile {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  location: string;
  linkedin_url: string;
  github_url: string;
  website_url: string;
  summary: string;
  updated_at: string;
}

export interface ProfileEntry {
  id: string;
  section: Section;
  title: string;
  organization: string;
  location: string;
  date_range: string;
  description: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface Job {
  id: string;
  company: string;
  title: string;
  url: string;
  source: string;
  location: string;
  jd_text: string;
  status: JobStatus;
  deadline: string | null;
  applied_at: string | null;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface DocumentRow {
  id: string;
  job_id: string | null;
  doc_type: DocType;
  title: string;
  content_md: string;
  version: number;
  created_at: string;
  updated_at: string;
}

export interface CareerNarrative {
  id: string;
  starting_point: string;
  current_state: string;
  goals: string;
  interests: string;
  constraints_text: string;
  gap_analysis: string;
  coach_notes: string;
  updated_at: string;
}

export interface CoachNote {
  id: string;
  title: string;
  body: string; // multiline; "[ ] task" / "[x] done" lines render as checkboxes
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface TimelineEvent {
  id: string;
  company: string;
  program: string;
  window_label: string;
  starts_on: string | null;
  ends_on: string | null;
  url: string;
  notes: string;
  job_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Activity {
  id: string;
  actor: "user" | "claude";
  action: string;
  detail: string;
  job_id: string | null;
  created_at: string;
}
