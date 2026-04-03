"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import type { AnalysisResult } from "@/lib/types";

// --- Scroll-based brightness for secondary sections ---

function useScrollFocus() {
  const ref = useRef<HTMLDivElement>(null);
  const [brightness, setBrightness] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    function update() {
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const viewH = window.innerHeight;

      // Center of the element relative to viewport center (0 = perfectly centered, 1 = fully off)
      const elCenter = rect.top + rect.height / 2;
      const viewCenter = viewH / 2;
      const distance = Math.abs(elCenter - viewCenter) / (viewH / 2);

      // Curve: 1.0 at center, tapering to 0 at edges. Clamp to [0, 1].
      const t = Math.max(0, Math.min(1, 1 - distance * 0.8));
      // Ease: smooth cosine curve for natural feel
      const eased = (1 - Math.cos(t * Math.PI)) / 2;
      setBrightness(eased);
    }

    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update, { passive: true });
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  return { ref, brightness };
}

function FocusCard({ children, className = "", secondary = false }: { children: React.ReactNode; className?: string; secondary?: boolean }) {
  const { ref, brightness } = useScrollFocus();
  // Resting opacity for secondary text, boosted toward 1.0 as it enters focus
  const baseOpacity = 0.55;
  const opacity = baseOpacity + brightness * (1 - baseOpacity);

  return (
    <div ref={ref} style={{ opacity, transition: "opacity 0.15s ease-out" }}>
      <Card secondary={secondary} className={className}>
        {children}
      </Card>
    </div>
  );
}

// --- Reusable components ---

function Card({ children, className = "", secondary = false }: { children: React.ReactNode; className?: string; secondary?: boolean }) {
  return (
    <div className={`rounded-xl border bg-white dark:bg-zinc-800/80 shadow-sm shadow-zinc-100 dark:shadow-black/10 transition-all duration-200 hover:shadow-md hover:shadow-zinc-100/80 dark:hover:shadow-black/15 ${secondary ? "card-secondary border-zinc-200/60 dark:border-zinc-700/50" : "border-zinc-200 dark:border-zinc-700"} p-6 ${className}`}>
      {children}
    </div>
  );
}

function SectionLabel({ children, primary = false }: { children: React.ReactNode; primary?: boolean }) {
  return (
    <h2 className={`text-[11px] font-semibold uppercase tracking-[0.15em] mb-4 ${primary ? "text-zinc-500 dark:text-zinc-400" : "text-zinc-400/70 dark:text-zinc-500/70"}`}>
      {children}
    </h2>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[10px] font-semibold uppercase tracking-[0.15em] text-zinc-400/70 dark:text-zinc-500/70 mb-1">
      {children}
    </div>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard API may fail in some contexts
    }
  }, [text]);

  return (
    <button
      onClick={handleCopy}
      className="inline-flex items-center gap-1 text-[11px] font-medium text-zinc-400 dark:text-zinc-500 hover:text-accent dark:hover:text-accent-muted cursor-pointer transition-colors duration-150"
      aria-label="Copy to clipboard"
    >
      {copied ? (
        <>
          <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M13.25 4.75 6 12 2.75 8.75"/></svg>
          Copied
        </>
      ) : (
        <>
          <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="5.5" y="5.5" width="8" height="8" rx="1.5"/><path d="M10.5 5.5V3a1.5 1.5 0 0 0-1.5-1.5H3A1.5 1.5 0 0 0 1.5 3v6A1.5 1.5 0 0 0 3 10.5h2.5"/></svg>
          Copy
        </>
      )}
    </button>
  );
}

const EXAMPLES = [
  "Remote work improves employee productivity",
  "AI will replace most entry-level jobs",
  "Social media is bad for society",
];

export default function Home() {
  const [claim, setClaim] = useState("");
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const insightRef = useRef<HTMLDivElement>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!claim.trim()) {
      setError("Please enter a claim to analyze.");
      return;
    }

    setLoading(true);
    setError("");
    setAnalysis(null);

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ claim: claim.trim() }),
      });

      if (!res.ok) {
        throw new Error("Failed to analyze claim");
      }

      const data = await res.json();
      setAnalysis(data);

      setTimeout(() => {
        insightRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 120);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-[900px] mx-auto px-4 py-12 sm:px-6">

      {/* Header — brand anchor */}
      <div className="mb-6">
        <h1 className="text-4xl tracking-tight text-zinc-900 dark:text-zinc-50 flex items-center gap-3">
          <span className="inline-block w-3 h-3 rounded-full bg-accent dark:bg-accent-muted" aria-hidden="true" />
          <span>
            <span className="font-normal text-zinc-400 dark:text-zinc-500">Lens</span>
            <span className="font-normal text-zinc-300 dark:text-zinc-600">{" & "}</span>
            <span className="font-bold">Logic</span>
          </span>
        </h1>
        <p className="mt-1.5 text-[15px] text-zinc-400 dark:text-zinc-500">
          Structured thinking for unstructured claims.
        </p>
      </div>

      {/* Input */}
      <Card className="p-5 border-transparent dark:border-zinc-700">
        <form onSubmit={handleSubmit}>
          <textarea
            value={claim}
            onChange={(e) => setClaim(e.target.value)}
            placeholder="Paste a claim or argument here..."
            rows={3}
            className="w-full rounded-lg border-none bg-transparent p-3 text-base leading-relaxed text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 resize-vertical focus:outline-none transition-all"
          />
          <div className="mt-3 pt-3 border-t border-zinc-100 dark:border-zinc-700">
            <button
              type="submit"
              disabled={loading || !claim.trim()}
              className="rounded-lg px-6 py-2.5 text-sm font-semibold bg-zinc-900 text-white hover:bg-zinc-800 hover:scale-[1.01] active:scale-[0.98] dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white cursor-pointer disabled:opacity-25 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:active:scale-100 transition-all duration-150"
            >
              {loading ? "Analyzing..." : "Analyze"}
            </button>
          </div>
        </form>
      </Card>

      {/* Example claims */}
      {!analysis && !loading && (
        <div className="mt-4 flex flex-wrap gap-2">
          {EXAMPLES.map((ex) => (
            <button
              key={ex}
              onClick={() => setClaim(ex)}
              className="text-xs px-3 py-1.5 rounded-full border border-zinc-200/60 dark:border-zinc-700/40 text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300 hover:border-zinc-300 dark:hover:border-zinc-600 cursor-pointer transition-all duration-150"
            >
              {ex}
            </button>
          ))}
        </div>
      )}

      {error && (
        <p className="mt-4 text-sm text-red-500 dark:text-red-400">{error}</p>
      )}

      {/* Results — progressive spacing */}
      {analysis && (
        <div className="mt-6 stagger-children" style={{ display: "flex", flexDirection: "column", gap: 0 }}>

          {/* Insight — hero, first card, tight to input */}
          <div ref={insightRef} className="scroll-mt-8 mt-4">
            <Card className="insight-card border-l-4 border-l-accent dark:border-l-accent-muted border-zinc-200 dark:border-zinc-600 bg-white dark:bg-[#252530] p-8">
              {/* Claim context */}
              <div className="mb-6 pb-5 border-b border-zinc-100 dark:border-zinc-700/50">
                <p className="text-base leading-relaxed text-zinc-700 dark:text-zinc-300">{analysis.claim || ""}</p>
                {analysis.classification && (
                  <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1.5">{analysis.classification}</p>
                )}
              </div>

              {/* Insight items */}
              <div className="flex items-center justify-between mb-5">
                <SectionLabel primary>Insight</SectionLabel>
                <CopyButton text={[analysis.hingesOn, analysis.breaksIf, analysis.holdsWhen].filter(Boolean).join("\n\n")} />
              </div>
              <div className="space-y-6">
                {analysis.hingesOn && (
                  <div>
                    <FieldLabel>What this hinges on</FieldLabel>
                    <p className="text-[15px] leading-relaxed text-zinc-800 dark:text-zinc-200">{analysis.hingesOn}</p>
                  </div>
                )}
                {analysis.breaksIf && (
                  <div>
                    <FieldLabel>Where this breaks</FieldLabel>
                    <p className="text-[15px] leading-relaxed text-zinc-800 dark:text-zinc-200">{analysis.breaksIf}</p>
                  </div>
                )}
                {analysis.holdsWhen && (
                  <div>
                    <FieldLabel>When this holds</FieldLabel>
                    <p className="text-[15px] leading-relaxed text-zinc-800 dark:text-zinc-200">{analysis.holdsWhen}</p>
                  </div>
                )}
              </div>
            </Card>
          </div>

          {/* Counterargument */}
          {analysis.counterargument && (
            <div className="mt-5">
              <Card>
                <SectionLabel primary>Counterargument</SectionLabel>
                <p className="text-[15px] leading-relaxed text-zinc-700 dark:text-zinc-300 mt-2">{analysis.counterargument}</p>
              </Card>
            </div>
          )}

          {/* Refinements — medium spacing from Insight */}
          {(analysis.stronger || analysis.weaker || analysis.coreQuestion) && (
            <div className="mt-5">
              <Card>
                <SectionLabel primary>Refinements</SectionLabel>
                <div className="space-y-5 mt-3">
                  {analysis.stronger && (
                    <div>
                      <div className="flex items-center justify-between">
                        <FieldLabel>Stronger version</FieldLabel>
                        <CopyButton text={analysis.stronger} />
                      </div>
                      <p className="text-base leading-relaxed text-zinc-700 dark:text-zinc-300">{analysis.stronger}</p>
                    </div>
                  )}
                  {analysis.weaker && (
                    <div>
                      <FieldLabel>Weaker version</FieldLabel>
                      <p className="text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">{analysis.weaker}</p>
                    </div>
                  )}
                  {analysis.coreQuestion && (
                    <div>
                      <div className="flex items-center justify-between">
                        <FieldLabel>Core question</FieldLabel>
                        <CopyButton text={analysis.coreQuestion} />
                      </div>
                      <p className="text-base leading-relaxed text-zinc-700 dark:text-zinc-300">{analysis.coreQuestion}</p>
                    </div>
                  )}
                </div>
              </Card>
            </div>
          )}

          {/* Supporting analysis — more spacing, visually receded, scroll-focus */}
          <div className="mt-6">
            <FocusCard secondary>
              <div className="space-y-6">
                <div>
                  <SectionLabel>Assumptions</SectionLabel>
                  <div className="space-y-2">
                    {(analysis.assumptions || []).map((a, i) => (
                      <p key={i} className="text-sm leading-relaxed text-zinc-500 dark:text-zinc-400/80 pl-4 border-l-2 border-zinc-200/70 dark:border-zinc-600/50">
                        {a}
                      </p>
                    ))}
                  </div>
                </div>

                <div>
                  <SectionLabel>Variables</SectionLabel>
                  <div className="space-y-2">
                    {(analysis.variables || []).map((v, i) => (
                      <p key={i} className="text-sm leading-relaxed text-zinc-500 dark:text-zinc-400/80 pl-4 border-l-2 border-zinc-200/70 dark:border-zinc-600/50">
                        {v}
                      </p>
                    ))}
                  </div>
                </div>

                <div>
                  <SectionLabel>Perspectives</SectionLabel>
                  <div className="space-y-2">
                    {(analysis.perspectives || []).map((p, i) => (
                      <p key={i} className="text-sm leading-relaxed text-zinc-500 dark:text-zinc-400/80 pl-4 border-l-2 border-zinc-200/70 dark:border-zinc-600/50">
                        {p}
                      </p>
                    ))}
                  </div>
                </div>

                <div>
                  <SectionLabel>Conclusion</SectionLabel>
                  <p className="text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">{analysis.conclusion}</p>
                </div>
              </div>
            </FocusCard>
          </div>

          {/* Article — most spacing, most receded, scroll-focus */}
          {analysis.article && (
            <div className="mt-8">
              <FocusCard secondary className="border-zinc-100 dark:border-zinc-700/40">
                <SectionLabel>Article</SectionLabel>
                <div className="space-y-4 mt-2">
                  {analysis.article.split("\n\n").map((paragraph, i) => (
                    <p key={i} className="text-[13px] leading-7 text-zinc-400 dark:text-zinc-500">
                      {paragraph}
                    </p>
                  ))}
                </div>
              </FocusCard>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
