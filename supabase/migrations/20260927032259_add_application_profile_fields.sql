alter table public.profile
  add column gpa numeric(5, 3) constraint profile_gpa_range check (gpa between 0 and 10),
  add column us_work_authorized boolean,
  add column requires_sponsorship boolean,
  add column general_availability text constraint profile_general_availability_length check (char_length(general_availability) <= 500),
  add column preferred_application_email text constraint profile_preferred_application_email_length check (char_length(preferred_application_email) <= 254);
