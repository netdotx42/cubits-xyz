function Frame({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-xl border border-glow/20 bg-panel shadow-[0_0_48px_-20px_rgba(125,211,252,0.45)] transition-shadow duration-300 hover:shadow-[0_0_56px_-14px_rgba(125,211,252,0.6)]">
      <div className="flex items-center gap-1.5 border-b border-line px-4 py-2.5">
        <span className="h-2 w-2 rounded-full bg-glow/70" />
        <span className="h-2 w-2 rounded-full bg-line" />
        <span className="h-2 w-2 rounded-full bg-line" />
        <span className="ml-3 font-mono text-[10px] uppercase tracking-widest text-mute">{title}</span>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

export function InvoiceMock() {
  const rows = [
    ["Brand identity", "1", "$2,400"],
    ["Landing page build", "1", "$3,200"],
    ["Revisions", "6h", "$720"],
  ];
  return (
    <Frame title="Invoice INV-0042">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-sm font-semibold tracking-tight">Northwind Studio</div>
          <div className="mt-1 font-mono text-[10px] uppercase tracking-widest text-mute">Due Nov 15</div>
        </div>
        <span className="rounded-full border border-line px-2.5 py-1 font-mono text-[10px] uppercase tracking-widest text-mute">Sent</span>
      </div>
      <div className="mt-5 divide-y divide-line border-y border-line text-xs">
        {rows.map(([a, b, c]) => (
          <div key={a} className="flex items-center justify-between py-2.5">
            <span>{a}</span>
            <span className="flex gap-6 text-mute"><span>{b}</span><span className="w-14 text-right text-paper">{c}</span></span>
          </div>
        ))}
      </div>
      <div className="mt-4 flex items-center justify-between">
        <span className="font-mono text-[10px] uppercase tracking-widest text-mute">Total</span>
        <span className="text-xl font-semibold tracking-tight">$6,320</span>
      </div>
    </Frame>
  );
}

export function FormMock() {
  return (
    <Frame title="Form: Project enquiry">
      <div className="space-y-3">
        {["Name", "Work email"].map((l) => (
          <div key={l}>
            <div className="mb-1.5 font-mono text-[10px] uppercase tracking-widest text-mute">{l}</div>
            <div className="h-9 rounded-md border border-line bg-black" />
          </div>
        ))}
        <div>
          <div className="mb-1.5 font-mono text-[10px] uppercase tracking-widest text-mute">Budget</div>
          <div className="flex gap-2">
            {["< $5k", "$5-20k", "$20k+"].map((b, i) => (
              <span key={b} className={`rounded-full border px-3 py-1 text-xs ${i === 1 ? "border-paper text-paper" : "border-line text-mute"}`}>{b}</span>
            ))}
          </div>
        </div>
        <div className="flex h-10 items-center justify-center rounded-full bg-paper text-xs font-medium text-black">Send enquiry</div>
        <div className="font-mono text-[10px] uppercase tracking-widest text-mute">Delivers to inbox + #leads</div>
      </div>
    </Frame>
  );
}

export function AutomationMock() {
  return (
    <Frame title="Automation rule">
      <div className="space-y-2">
        <div className="rounded-lg border border-line bg-black p-3">
          <div className="font-mono text-[10px] uppercase tracking-widest text-mute">When</div>
          <div className="mt-1 text-sm">Form submitted: Project enquiry</div>
        </div>
        <div className="ml-4 h-4 w-px bg-line" />
        <div className="rounded-lg border border-line bg-black p-3">
          <div className="font-mono text-[10px] uppercase tracking-widest text-mute">Then</div>
          <div className="mt-1 text-sm">Post to Slack #leads</div>
        </div>
        <div className="ml-4 h-4 w-px bg-line" />
        <div className="rounded-lg border border-line bg-black p-3">
          <div className="font-mono text-[10px] uppercase tracking-widest text-mute">Then</div>
          <div className="mt-1 text-sm">Email reply from you@studio.com</div>
        </div>
      </div>
    </Frame>
  );
}
