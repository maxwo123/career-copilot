alter table public.jobs
  drop constraint if exists jobs_job_type_check;

alter table public.jobs
  add constraint jobs_job_type_check check (job_type in (
    'full_time',
    'part_time',
    'contract',
    'apprenticeship',
    'internship',
    'co_op',
    'undergraduate_research',
    'graduate_assistantship',
    'fellowship',
    'volunteer',
    'post_baccalaureate',
    'masters_program',
    'doctoral_program',
    'professional_school',
    'certificate_program',
    'other'
  ));
