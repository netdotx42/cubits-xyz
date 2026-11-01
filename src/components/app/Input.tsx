/**
 * Input props: label (string, required), plus all native input props (name, type, required...).
 * Renders a mono uppercase label above a 44px-high black input with a hairline border.
 */
import type { InputHTMLAttributes } from "react";

export function Input({ label, className = "", ...rest }: InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <label className="block">
      <span className="mb-2 block font-mono text-[11px] uppercase tracking-widest text-mute">{label}</span>
      <input
        {...rest}
        className={`min-h-[44px] w-full border border-line bg-ink px-3 text-base text-paper outline-none placeholder:text-mute focus:border-mute ${className}`}
      />
    </label>
  );
}
