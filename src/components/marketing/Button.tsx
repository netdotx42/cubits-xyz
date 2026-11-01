import Link from "next/link";

type Props = {
  href: string;
  variant?: "primary" | "ghost";
  className?: string;
  children: React.ReactNode;
};

const base =
  "inline-flex min-h-[44px] items-center justify-center rounded-full px-6 text-sm font-medium transition-colors duration-200";
const variants = {
  primary: "bg-glow text-black shadow-[0_0_36px_-8px_rgba(125,211,252,0.7)] hover:bg-glow-soft hover:shadow-[0_0_44px_-6px_rgba(125,211,252,0.85)]",
  ghost: "border border-line text-paper hover:border-glow/60 hover:bg-panel hover:text-glow-soft",
};

export function Button({ href, variant = "primary", className = "", children }: Props) {
  return (
    <Link href={href} className={`${base} ${variants[variant]} ${className}`}>
      {children}
    </Link>
  );
}
