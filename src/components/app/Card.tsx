/**
 * Card props: children, className (optional). A panel with a hairline border.
 */
import type { ReactNode } from "react";

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`border border-line bg-panel p-5 ${className}`}>{children}</div>;
}
