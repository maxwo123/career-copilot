"use client";

import { useFormStatus } from "react-dom";
import { Button } from "@/lib/ui";

export function DeleteButton({ label = "Delete", message }: { label?: string; message: string }) {
  const { pending } = useFormStatus();
  return <Button type="submit" variant="danger" size="sm" className="min-h-9 whitespace-normal text-left" disabled={pending}
    onClick={(event) => { if (!window.confirm(message)) event.preventDefault(); }}>
    {pending ? "Deleting…" : label}
  </Button>;
}
