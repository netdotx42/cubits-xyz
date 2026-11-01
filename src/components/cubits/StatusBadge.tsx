export default function StatusBadge({ status }: { status: string }) {
  const tone =
    status === "paid"
      ? "border-emerald-700 text-emerald-400"
      : status === "sent"
      ? "border-sky-700 text-sky-400"
      : "border-line text-mute";
  return (
    <span className={`inline-block rounded-full border px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-widest ${tone}`}>
      {status}
    </span>
  );
}
