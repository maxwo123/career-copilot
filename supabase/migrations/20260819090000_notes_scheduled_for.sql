-- Dashboard rebuild: notes become a month-grouped timeline (same rail UI as
-- the application timeline). Each note gets a target month; undated notes
-- group under "Someday".
alter table coach_notes add column if not exists scheduled_for date;

-- Existing notes: September-due items to Sep 2026, the rest to Aug 2026.
update coach_notes set scheduled_for = date '2026-09-01'
  where scheduled_for is null and (title ilike '%due sep%' or title ilike '%september%');
update coach_notes set scheduled_for = date '2026-08-01'
  where scheduled_for is null;
