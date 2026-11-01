"use client";
import { useState } from "react";
import { SHARE_TEXT, type SharePlatform } from "@/lib/share";

const btn =
  "inline-flex min-h-[44px] items-center gap-2 rounded-full border border-line px-4 text-sm text-paper transition-colors duration-200 hover:border-glow/60 hover:bg-panel hover:text-glow-soft";

function XIcon() {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className="h-4 w-4 fill-current">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}
function LinkedInIcon() {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className="h-4 w-4 fill-current">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  );
}
function InstagramIcon() {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current" strokeWidth="2">
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="1" className="fill-current" stroke="none" />
    </svg>
  );
}

export function ShareBar() {
  const [note, setNote] = useState<string | null>(null);

  const siteUrl = () => (typeof window !== "undefined" ? window.location.origin : "");
  const flash = (m: string) => {
    setNote(m);
    window.setTimeout(() => setNote(null), 4500);
  };
  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      return false;
    }
  };
  const open = (url: string) => window.open(url, "_blank", "noopener,noreferrer");

  function shareX() {
    open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(SHARE_TEXT.x)}&url=${encodeURIComponent(siteUrl())}`);
  }
  function shareLinkedIn() {
    open(`https://www.linkedin.com/feed/?shareActive=true&text=${encodeURIComponent(`${SHARE_TEXT.linkedin}\n\n${siteUrl()}`)}`);
  }
  async function shareInstagram() {
    // Instagram has no web share link: copy the caption and download the card to post from your phone.
    const ok = await copy(SHARE_TEXT.instagram);
    const a = document.createElement("a");
    a.href = "/api/share/instagram";
    a.download = "cubits-instagram.png";
    document.body.appendChild(a);
    a.click();
    a.remove();
    flash(ok ? "Caption copied and card downloaded. Post both from the Instagram app." : "Card downloaded. Caption copy was blocked by your browser.");
  }

  return (
    <div>
      <div className="font-mono text-[11px] uppercase tracking-widest text-mute">Share Cubits</div>
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" onClick={shareX} className={btn}><XIcon /> Post on X</button>
        <button type="button" onClick={shareLinkedIn} className={btn}><LinkedInIcon /> Share on LinkedIn</button>
        <button type="button" onClick={shareInstagram} className={btn}><InstagramIcon /> Instagram card + caption</button>
      </div>
      <div className="mt-3 flex flex-wrap gap-x-4 text-xs text-mute">
        {(["x", "linkedin", "instagram"] as SharePlatform[]).map((p) => (
          <a key={p} href={`/api/share/${p}`} download={`cubits-${p}.png`} className="inline-flex min-h-[32px] items-center underline-offset-4 hover:text-glow-soft hover:underline">
            {p === "x" ? "X card" : p === "linkedin" ? "LinkedIn card" : "Instagram card"}
          </a>
        ))}
      </div>
      <p role="status" aria-live="polite" className={`mt-2 min-h-[1.25rem] text-xs text-glow transition-opacity duration-200 ${note ? "opacity-100" : "opacity-0"}`}>
        {note}
      </p>
    </div>
  );
}
