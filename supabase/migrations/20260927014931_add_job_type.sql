alter table public.jobs
  add column job_type text
  constraint jobs_job_type_check check (job_type in ('full_time', 'part_time', 'internship'));
