"use client";

import { Button } from "@/lib/ui";

export function PrintButton() {
  return (
    <Button size="md" onClick={() => window.print()}>
      Print / Save as PDF
    </Button>
  );
}
