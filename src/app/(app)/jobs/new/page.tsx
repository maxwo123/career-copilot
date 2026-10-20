import { ActionForm } from "@/lib/action-form";
import { createJob } from "@/app/actions";
import { OPPORTUNITY_TYPE_GROUPS, OPPORTUNITY_TYPE_LABELS } from "@/lib/types";
import { Button, Card, Field, Input, PageHeader, Select, Textarea } from "@/lib/ui";

export default function NewJobPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader
        title="Add an opportunity"
        description="Track a job, research role, fellowship, or graduate program. Paste the full description so your connected AI can evaluate it and prepare the right application materials."
      />

      <Card className="p-6">
        <ActionForm cancel action={createJob} className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Organization" hint="required">
              <Input name="company" required />
            </Field>
            <Field label="Opportunity name" hint="required">
              <Input name="title" required />
            </Field>
          </div>

          <Field label="Opportunity URL">
            <Input
              name="url"
              type="url"
              placeholder="https://app.joinhandshake.com/jobs/..."
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Opportunity type">
              <Select name="job_type" defaultValue="">
                <option value="">Not specified</option>
                {OPPORTUNITY_TYPE_GROUPS.map((group) => (
                  <optgroup key={group.label} label={group.label}>
                    {group.types.map((type) => <option key={type} value={type}>{OPPORTUNITY_TYPE_LABELS[type]}</option>)}
                  </optgroup>
                ))}
              </Select>
            </Field>
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

          <Field label="Opportunity description" hint="paste the full text">
            <Textarea
              name="jd_text"
              rows={12}
              placeholder="Paste the job posting, research description, or program overview here."
              className="font-mono text-xs"
            />
          </Field>

          <Field label="Notes">
            <Textarea name="notes" rows={2} />
          </Field>

          <div className="pt-1">
            <Button type="submit">Save opportunity</Button>
          </div>
        </ActionForm>
      </Card>
    </div>
  );
}
