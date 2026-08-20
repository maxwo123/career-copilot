import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";
import type { JobStatus } from "@/lib/types";

export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

/* ---------- Status ---------- */

const STATUS_META: Record<JobStatus, { label: string; pill: string; dot: string }> = {
  saved: {
    label: "Saved",
    pill: "bg-stone-100 text-stone-600 border-stone-200 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-300 dark:border-stone-600",
    dot: "bg-stone-400",
  },
  applied: {
    label: "Applied",
    pill: "bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-900",
    dot: "bg-blue-500",
  },
  interviewing: {
    label: "Interviewing",
    pill: "bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-900",
    dot: "bg-amber-500",
  },
  offer: {
    label: "Offer",
    pill: "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900",
    dot: "bg-emerald-500",
  },
  rejected: {
    label: "Rejected",
    pill: "bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 border-red-200 dark:border-red-900",
    dot: "bg-red-400",
  },
  withdrawn: {
    label: "Withdrawn",
    pill: "bg-stone-50 dark:bg-stone-900 text-stone-400 border-stone-200 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-400 dark:border-stone-600",
    dot: "bg-stone-300",
  },
};

export const STATUS_LABELS: Record<JobStatus, string> = Object.fromEntries(
  Object.entries(STATUS_META).map(([k, v]) => [k, v.label])
) as Record<JobStatus, string>;

export function StatusPill({ status }: { status: JobStatus }) {
  const meta = STATUS_META[status];
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium",
        meta.pill
      )}
    >
      <span className={cn("size-1.5 rounded-full", meta.dot)} />
      {meta.label}
    </span>
  );
}

/* ---------- Buttons ---------- */

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "sm" | "md";

const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
  primary: "bg-indigo-600 font-semibold text-white shadow-xs hover:bg-indigo-500 active:bg-indigo-700",
  secondary:
    "border border-stone-300 bg-white font-medium text-stone-700 dark:text-stone-300 shadow-xs hover:border-stone-400 hover:text-stone-900 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-200 dark:hover:border-stone-500 dark:hover:text-stone-100",
  ghost: "font-medium text-stone-500 hover:bg-stone-100 hover:text-stone-800 dark:text-stone-400 dark:hover:bg-stone-800 dark:hover:text-stone-200",
  danger: "font-medium text-stone-400 hover:bg-red-50 hover:text-red-600 dark:text-stone-500 dark:hover:bg-red-950 dark:hover:text-red-400",
};

const BUTTON_SIZES: Record<ButtonSize, string> = {
  sm: "h-7 rounded-md px-2.5 text-xs",
  md: "h-9 rounded-lg px-3.5 text-sm",
};

export function buttonCls(
  variant: ButtonVariant = "primary",
  size: ButtonSize = "md",
  className?: string
) {
  return cn(
    "inline-flex items-center justify-center gap-1.5 whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:pointer-events-none disabled:opacity-50",
    BUTTON_VARIANTS[variant],
    BUTTON_SIZES[size],
    className
  );
}

export function Button({
  variant = "primary",
  size = "md",
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
}) {
  return <button className={buttonCls(variant, size, className)} {...props} />;
}

/* ---------- Form controls (fixed heights keep control rows aligned) ---------- */

const controlCls =
  "w-full rounded-lg border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-800 px-3 text-sm text-stone-900 shadow-xs transition-colors placeholder:text-stone-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/15 focus:outline-none dark:border-stone-600 dark:bg-stone-800 dark:text-stone-100 dark:placeholder:text-stone-500";

export function Input({
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn("h-9", controlCls, className)} {...props} />;
}

export function Textarea({
  className,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn("py-2 leading-relaxed", controlCls, className)}
      {...props}
    />
  );
}

export function Select({
  className,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={cn("h-9", controlCls, className)} {...props} />;
}

export function Field({
  label,
  hint,
  className,
  children,
}: {
  label: ReactNode;
  hint?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <label className={cn("block", className)}>
      <span className="mb-1.5 flex items-baseline justify-between gap-2 text-[13px] font-medium text-stone-700 dark:text-stone-300">
        <span>{label}</span>
        {hint && <span className="text-xs font-normal text-stone-400">{hint}</span>}
      </span>
      {children}
    </label>
  );
}

/* ---------- Layout ---------- */

export function Card({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn("rounded-xl border border-stone-200 bg-white shadow-xs dark:border-stone-700 dark:bg-stone-800", className)}>
      {children}
    </div>
  );
}

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div className="max-w-2xl">
        <h1 className="text-2xl font-semibold tracking-tight text-stone-900 dark:text-stone-100">
          {title}
        </h1>
        {description && (
          <p className="mt-1.5 text-sm leading-relaxed text-stone-500 dark:text-stone-400">
            {description}
          </p>
        )}
      </div>
      {actions}
    </div>
  );
}

export function SectionTitle({
  children,
  count,
  action,
  className,
}: {
  children: ReactNode;
  count?: number;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <h2 className="text-xs font-semibold tracking-wider text-stone-500 dark:text-stone-400 uppercase">
        {children}
      </h2>
      {typeof count === "number" && (
        <span className="rounded-full bg-stone-200/70 dark:bg-stone-700 px-1.5 py-px text-[11px] font-medium text-stone-500 dark:text-stone-400 tabular-nums">
          {count}
        </span>
      )}
      {action && <div className="ml-auto">{action}</div>}
    </div>
  );
}

export function Badge({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-full border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-950/50 px-2 py-0.5 text-[11px] font-medium text-indigo-700 dark:text-indigo-300",
        className
      )}
    >
      {children}
    </span>
  );
}

/* ---------- Dates ---------- */

export function formatDate(value: string | null | undefined): string {
  if (!value) return "";
  const d = new Date(value.includes("T") ? value : `${value}T00:00:00`);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function daysUntil(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const d = new Date(`${dateStr}T23:59:59`);
  if (Number.isNaN(d.getTime())) return null;
  return Math.ceil((d.getTime() - Date.now()) / 86_400_000);
}
