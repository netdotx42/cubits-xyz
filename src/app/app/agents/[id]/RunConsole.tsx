"use client";
import { useState, useTransition } from "react";
import { runAgent, type RunResult } from "../actions";
import { btnPrimary, inputCls } from "@/components/cubits/util";

export function RunConsole({ agentId }: { agentId: string }) {
  const [input, setInput] = useState("");
  const [res, setRes] = useState<RunResult | null>(null);
  const [pending, start] = useTransition();

  return (
    <div>
      <textarea className={`${inputCls} min-h-[96px] py-2`} placeholder="Give the agent a task…" value={input} onChange={(e) => setInput(e.target.value)} maxLength={8000} />
      <button className={`${btnPrimary} mt-3`} disabled={pending || !input.trim()} onClick={() => start(async () => setRes(await runAgent(agentId, input)))}>
        {pending ? "Running…" : "Run"}
      </button>
      {res && (
        <div className="mt-4 border border-line bg-ink p-3 text-sm">
          {!res.ok && <p className="text-red-400">{res.error}</p>}
          {res.ok && (
            <>
              <p className="font-mono text-[11px] uppercase tracking-widest text-mute">{res.status.replace("_", " ")}</p>
              {res.status === "awaiting_approval" && <p className="mt-2">This run is waiting for your approval on the Agents page.</p>}
              {res.output && <p className="mt-2 whitespace-pre-wrap">{res.output}</p>}
              {res.error && <p className="mt-2 text-red-400">{res.error}</p>}
            </>
          )}
        </div>
      )}
    </div>
  );
}
