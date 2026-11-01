/**
 * Button props: variant "primary" | "ghost" (default primary), plus all native button props.
 * ButtonLink: same look for <a>/Link; props: href, variant, children.
 * 44px min tap height.
 */
import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";

const base =
  "inline-flex min-h-[44px] items-center justify-center px-5 font-mono text-xs uppercase tracking-widest transition disabled:opacity-50";
const variants = {
  primary: "bg-paper text-ink hover:bg-white",
  ghost: "border border-line text-paper hover:border-mute",
};

export function Button({
  variant = "primary",
  className = "",
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: keyof typeof variants }) {
  return <button {...rest} className={`${base} ${variants[variant]} ${className}`} />;
}

export function ButtonLink({
  href,
  variant = "primary",
  children,
  className = "",
}: {
  href: string;
  variant?: keyof typeof variants;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Link href={href} className={`${base} ${variants[variant]} ${className}`}>
      {children}
    </Link>
  );
}
