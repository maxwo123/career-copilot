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

export type OpportunityType =
  | "full_time"
  | "part_time"
  | "contract"
  | "apprenticeship"
  | "internship"
  | "co_op"
  | "undergraduate_research"
  | "graduate_assistantship"
  | "fellowship"
  | "volunteer"
  | "post_baccalaureate"
  | "masters_program"
  | "doctoral_program"
  | "professional_school"
  | "certificate_program"
  | "other";

export const OPPORTUNITY_TYPE_GROUPS: ReadonlyArray<{
  label: string;
  types: readonly OpportunityType[];
}> = [
  {
    label: "Employment",
    types: ["full_time", "part_time", "contract", "apprenticeship"],
  },
  {
    label: "Experience & research",
    types: [
      "internship",
      "co_op",
      "undergraduate_research",
      "graduate_assistantship",
      "fellowship",
      "volunteer",
    ],
  },
  {
    label: "Further education",
    types: [
      "post_baccalaureate",
      "masters_program",
      "doctoral_program",
      "professional_school",
      "certificate_program",
    ],
  },
  { label: "Other", types: ["other"] },
];

export const OPPORTUNITY_TYPES: OpportunityType[] = OPPORTUNITY_TYPE_GROUPS.flatMap(
  (group) => [...group.types]
);

export const OPPORTUNITY_TYPE_LABELS: Record<OpportunityType, string> = {
  full_time: "Full-time job",
  part_time: "Part-time job",
  contract: "Contract / freelance",
  apprenticeship: "Apprenticeship",
  internship: "Internship",
  co_op: "Co-op",
  undergraduate_research: "Undergraduate research",
  graduate_assistantship: "Graduate assistantship",
  fellowship: "Fellowship",
  volunteer: "Volunteer / service",
  post_baccalaureate: "Post-baccalaureate program",
  masters_program: "Master’s program",
  doctoral_program: "Doctoral / PhD program",
  professional_school: "Professional degree (MD, JD, etc.)",
  certificate_program: "Certificate / bootcamp",
  other: "Other opportunity",
};

export function isOpportunityType(value: string): value is OpportunityType {
  return OPPORTUNITY_TYPES.includes(value as OpportunityType);
}

// Keep the database/API vocabulary stable while the product uses the broader
// "opportunity" language in the UI.
export type JobType = OpportunityType;
export const JOB_TYPES = OPPORTUNITY_TYPES;
export const JOB_TYPE_LABELS = OPPORTUNITY_TYPE_LABELS;
export const isJobType = isOpportunityType;

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
  gpa: number | null;
  us_work_authorized: boolean | null;
  requires_sponsorship: boolean | null;
  general_availability: string | null;
  preferred_application_email: string | null;
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
  job_type: JobType | null;
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
  scheduled_for: string | null; // target month (first of month); null = "Someday"
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
