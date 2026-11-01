"use client";
import { useState, useTransition } from "react";
import { createKey, revokeKey } from "./actions";
import { btnGhost, btnPrimary, inputCls } from "@/components/cubits/util";

type Key = { id: string; name: string; prefix: string; last_used_at: string | null };

export function KeyPanel({ keys, canManage }: { keys: Key[]; canManage: boolean }) {
  const [name, setName] = useState("");
  const [fresh, setFresh] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <div>
      {fresh && (
        <div className="mb-4 border border-line bg-ink p-3 text-sm">
          <p className="text-mute">Copy this key now. It will not be shown again.</p>
          <code className="mt-2 block break-all font-mono text-xs text-paper">{fresh}</code>
        </div>
      )}
      {err && <p className="mb-3 text-sm text-red-400">{err}</p>}
      <div className="divide-y divide-line border-y border-line">
        {keys.length === 0 && <p className="py-4 text-sm text-mute">No active keys.</p>}
        {keys.map((k) => (
          <div key={k.id} className="flex items-center justify-between gap-3 py-3">
            <div className="min-w-0">
              <div className="truncate text-sm">{k.name}</div>
              <div className="font-mono text-[11px] text-mute">{k.prefix}… · {k.last_used_at ? `used ${new Date(k.last_used_at).toLocaleDateString("en-GB")}` : "never used"}</div>
            </div>
            {canManage && (
              <button className={btnGhost} disabled={pending} onClick={() => start(async () => { await revokeKey(k.id); })}>Revoke</button>
            )}
          </div>
        ))}
      </div>
      {canManage && (
        <form
          className="mt-4 flex flex-col gap-2 sm:flex-row"
          onSubmit={(e) => {
            e.preventDefault();
            start(async () => {
              const r = await createKey(name);
              if (r.ok) { setFresh(r.key); setErr(null); setName(""); } else setErr(r.error);
            });
          }}
        >
          <input className={inputCls} placeholder="Key name (e.g. Production)" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} />
          <button className={btnPrimary} disabled={pending}>Create key</button>
        </form>
      )}
    </div>
  );
}
