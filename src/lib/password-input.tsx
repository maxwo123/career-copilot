"use client";

import { useId, useState, type InputHTMLAttributes } from "react";
import { Input } from "@/lib/ui";

export function PasswordInput({ label, ...props }: Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & { label: string }) {
  const id = useId();
  const [visible, setVisible] = useState(false);
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-[13px] font-medium text-stone-700 dark:text-stone-300">{label}</label>
      <div className="relative">
      <Input {...props} id={id} type={visible ? "text" : "password"} className="h-11 pr-16" />
      <button type="button" aria-label={visible ? "Hide password" : "Show password"} aria-pressed={visible}
        onClick={() => setVisible(!visible)}
        className="absolute inset-y-0 right-0 rounded-r-lg px-3 text-xs font-medium text-stone-600 hover:text-indigo-600 dark:text-stone-300 dark:hover:text-indigo-300">
        {visible ? "Hide" : "Show"}
      </button>
      </div>
    </div>
  );
}
