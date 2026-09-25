# UX review — September 9, 2026

The app’s compact typography and restrained palette already suit a personal career workspace. The biggest problems were missing recovery paths, mobile navigation that assumed desktop width, hidden or immediate destructive actions, and limited ways to find an application.

## Changes made

- `src/app/login/page.tsx` — replaced the shared sign-in/setup interaction with distinct modes, meaningful loading states, accessible feedback, and password visibility controls. Added an obvious password recovery link.
- `src/app/forgot-password/page.tsx` — added the reset email request and generic inbox confirmation that does not disclose whether an account exists.
- `src/app/auth/callback/route.ts` — exchanges the PKCE code and uses a fixed relative destination so the browser retains its host and session cookies. Invalid, expired, or reused links lead back to recovery.
- `src/app/reset-password/page.tsx` — checks authentication before showing the password form; the server action independently verifies the user. Successful saves end the local recovery session and return to sign-in with confirmation.
- `src/app/(app)/layout.tsx` — moved navigation to a second row on narrow screens, increased header action targets, and added a skip link.
- `src/app/(app)/nav.tsx` — exposes the current page to assistive technology and gives links comfortable touch targets.
- `src/app/globals.css` — connected Tailwind dark variants to the theme class, added visible keyboard focus, native color schemes, and reduced-motion support.
- `src/lib/theme.tsx` — synchronizes theme state with storage without a cascading initialization effect; gracefully handles unavailable storage.
- `src/app/(app)/page.tsx` — added a page title, an applications shortcut, and a useful first-run path. Failed queries now show feedback instead of silently appearing empty.
- `src/app/(app)/applications/page.tsx` — added URL-based search/status filters, clickable pipeline counts, a clear-filters action, and a distinct no-results state. Pipeline totals still describe the entire collection.
- `src/lib/delete-button.tsx` — added confirmation and pending feedback for destructive form actions across jobs, documents, profile entries, and timeline events.
- `src/app/(app)/notes-editor.tsx` — made note deletion discoverable on touchscreens, added confirmation, labeled editor controls and task toggles, and supplied keyboard-operable title/preview/edit controls.
- `src/lib/disclosure.tsx` — added expanded-state semantics and a keyboard-operable preview.

The pre-existing edit in `src/lib/ui.tsx` was preserved.

## Design approach

Retain the existing Geist typeface and stone/indigo palette: background #fafaf9, surface #ffffff, text #1c1917, muted text #57534e, primary #4f46e5, focus #6366f1. Use a two-column login composition on desktop and a single focused form on mobile. Give career content and next actions visual priority; avoid adding decorative dashboard metrics.

## Sources installed

- [Vercel web-design-guidelines](https://github.com/vercel-labs/agent-skills/tree/main/skills/web-design-guidelines)
- [Anthropic frontend-design](https://github.com/anthropics/skills/tree/main/skills/frontend-design)

Both were installed in `~/.codex/skills`. The review used the [current Web Interface Guidelines](https://github.com/vercel-labs/web-interface-guidelines/blob/main/command.md).

## Verification scope

Authentication unit tests cover invalid inputs, enumeration-safe responses, rate limits, missing sessions, policy errors, successful saves, and invalid or malicious callback parameters. Browser checks use an isolated local Supabase fixture for recovery and signed-in screens, so they cannot send email or alter the real account. Production email delivery and changing the real account password are deliberately left to the account owner.

## Application-wide implementation

The follow-up pass implements the approved balanced career workspace plan while retaining
Geist, the stone/indigo palette, and the external-assistant workflow.

- Dashboard: current/overdue actions, the five earliest saved-job deadlines, five newest
  documents, and onboarding based on missing profile information.
- Applications: separate URL-backed tracked-job and recruiting-timeline views; independent
  filters; overdue applications separate from upcoming deadlines; filtered return context.
- Documents: a new newest-first library with title/type/job filters and standalone briefings.
  Existing document URLs remain valid. Version numbers are explicit metadata; unrelated
  documents are not grouped into inferred version histories.
- Job details: missing descriptions open the editor, copyable assistant-neutral prompts,
  responsive document rows, clearer errors, and preserved original application dates.
- Profile: section links, contextual labels, readable summaries, move-up/down controls,
  explicit save/cancel, and mounted collapsed editors that retain unfinished drafts.
- Notes and skills: visible saving/saved/error states, retry using the latest local draft,
  serialized writes, and deletion failures that keep the affected content visible.
- Guide and document reader: collapsed mobile guide navigation, copy feedback, keyboard-accessible
  code blocks, mobile reading padding, contextual return links, and light print styling.
- Server actions authenticate each mutation, return recoverable errors, and revalidate affected
  workspace views. No database migrations or MCP interface changes were needed.

### Follow-up verification

- 22 automated tests cover authentication recovery, mutation authentication, save/deletion
  failures, required fields, first-applied date preservation, ordered saves/retry, calendar
  deadlines, and safe filter-preserving navigation.
- Browser checks used a local Supabase fixture with jobs, timeline events, profile entries,
  notes, skill categories, linked documents, and a standalone briefing. No real account
  records were mutated by these checks.
- Exercised note and skill failure/retry, failed note deletion, contact cancel, profile draft
  retention through collapse/reorder, application return filters, standalone document
  filtering, copy feedback, and automatically opened description editing.
- Checked 390px mobile and 1440px desktop layouts in light/dark themes; no horizontal page
  overflow or runtime errors on the reviewed screens. Accessibility scans passed after
  correcting contrast, duplicate form landmarks, and keyboard scrolling. Automated contrast
  review of decorative chevrons/clipped off-screen navigation still needs visual judgment.
- Generated and inspected a one-page briefing PDF: document content only, readable light
  styling, no workspace navigation or action controls in print output.

Browser-back navigation is not intercepted by the unsaved-change prompt; internal links and
full-page unloads are guarded. Save or cancel explicit forms before using browser history.
