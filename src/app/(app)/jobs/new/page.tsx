import { createJob } from "@/app/actions";

const inputCls =
  "w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500";

export default function NewJobPage() {
  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-xl font-bold">Add a job</h1>
      <p className="mt-1 text-sm text-stone-500">
        Paste the posting link and, importantly, the full job description —
        Handshake and most boards are behind a login, so the description must
        travel with the link for Claude to work with it.
      </p>

      <form action={createJob} className="mt-6 space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="font-medium">Company *</span>
            <input name="company" required className={`mt-1 ${inputCls}`} />
          </label>
          <label className="block text-sm">
            <span className="font-medium">Job title *</span>
            <input name="title" required className={`mt-1 ${inputCls}`} />
          </label>
        </div>

        <label className="block text-sm">
          <span className="font-medium">Posting URL</span>
          <input
            name="url"
            type="url"
            placeholder="https://app.joinhandshake.com/jobs/..."
            className={`mt-1 ${inputCls}`}
          />
        </label>

        <div className="grid gap-4 sm:grid-cols-3">
          <label className="block text-sm">
            <span className="font-medium">Source</span>
            <input
              name="source"
              placeholder="Handshake, LinkedIn..."
              className={`mt-1 ${inputCls}`}
            />
          </label>
          <label className="block text-sm">
            <span className="font-medium">Location</span>
            <input name="location" className={`mt-1 ${inputCls}`} />
          </label>
          <label className="block text-sm">
            <span className="font-medium">Application deadline</span>
            <input name="deadline" type="date" className={`mt-1 ${inputCls}`} />
          </label>
        </div>

        <label className="block text-sm">
          <span className="font-medium">Job description (paste the full text)</span>
          <textarea
            name="jd_text"
            rows={12}
            placeholder="Select-all + copy from the posting page and paste here."
            className={`mt-1 ${inputCls} font-mono text-xs`}
          />
        </label>

        <label className="block text-sm">
          <span className="font-medium">Notes</span>
          <textarea name="notes" rows={2} className={`mt-1 ${inputCls}`} />
        </label>

        <button
          type="submit"
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
        >
          Save job
        </button>
      </form>
    </div>
  );
}
