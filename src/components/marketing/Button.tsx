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
  primary: "bg-paper text-black hover:bg-white",
  ghost: "border border-line text-paper hover:border-mute hover:bg-panel",
};

export function Button({ href, variant = "primary", className = "", children }: Props) {
  return (
    <Link href={href} className={`${base} ${variants[variant]} ${className}`}>
      {children}
    </Link>
  );
}
