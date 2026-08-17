import { createJob } from "@/app/actions";
import { Button, Card, Field, Input, PageHeader, Textarea } from "@/lib/ui";

export default function NewJobPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader
        title="Add a job"
        description="Paste the posting link and, importantly, the full job description — Handshake and most boards are behind a login, so the description must travel with the link for Claude to work with it."
      />

      <Card className="p-6">
        <form action={createJob} className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Company" hint="required">
              <Input name="company" required />
            </Field>
            <Field label="Job title" hint="required">
              <Input name="title" required />
            </Field>
          </div>

          <Field label="Posting URL">
            <Input
              name="url"
              type="url"
              placeholder="https://app.joinhandshake.com/jobs/..."
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Source">
              <Input name="source" placeholder="Handshake, LinkedIn..." />
            </Field>
            <Field label="Location">
              <Input name="location" />
            </Field>
            <Field label="Application deadline">
              <Input name="deadline" type="date" />
            </Field>
          </div>

          <Field label="Job description" hint="paste the full text">
            <Textarea
              name="jd_text"
              rows={12}
              placeholder="Select-all + copy from the posting page and paste here."
              className="font-mono text-xs"
            />
          </Field>

          <Field label="Notes">
            <Textarea name="notes" rows={2} />
          </Field>

          <div className="pt-1">
            <Button type="submit">Save job</Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
