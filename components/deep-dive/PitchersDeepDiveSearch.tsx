"use client";
import React, { useMemo, useState } from "react";

/* =========================================================
   Types & constants
   ====================================================== */
type Summary = any;
const YEARS = [2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025];

/* =========================================================
   Utils
   ====================================================== */
function splitName(input: string) {
  const cleaned = input.trim().replace(/\s+/g, " ");
  const parts = cleaned.split(" ");
  const toTitle = (s: string) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
  return { first: toTitle(parts[0] || ""), last: toTitle(parts.slice(1).join(" ") || "") };
}
function getFgRows(summary: Summary) {
  const arr = Array.isArray(summary?.fangraphs) ? summary.fangraphs : [];
  return arr.map((r: any) => ({ season: r?.season ?? r?.data?.Season ?? "", data: r?.data ?? {} }));
}
function normKey(k: string) { return String(k).toLowerCase().replace(/[^a-z0-9]/g, ""); }
function parseNumber(v: any) {
  if (v == null) return undefined;
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const cleaned = v
      .replace(/[, ]+/g, "")
      .replace(/[–—−]/g, "-")
      .replace(/\$/g, "")
      .replace(/m(illions)?$/i, "")
      .replace(/^N\/?A$/i, "")
      .replace(/^NA$/i, "")
      .replace(/^null$/i, "")
      .replace(/%$/, "")
      .trim();
    if (cleaned === "" || cleaned === "-") return undefined;
    const num = Number(cleaned);
    return Number.isFinite(num) ? num : undefined;
  }
  return undefined;
}
function pick(obj: any, candidates: string[]) {
  if (!obj || typeof obj !== "object") return undefined;
  for (const c of candidates) if (Object.prototype.hasOwnProperty.call(obj, c)) return obj[c];
  for (const c of candidates) {
    const key = Object.keys(obj).find((k) => k.toLowerCase() === c.toLowerCase());
    if (key) return obj[key];
  }
  return undefined;
}
function n(obj: any, keys: string[]) { return parseNumber(pick(obj, keys)); }
function nFuzzy(obj: any, patterns: RegExp[]) {
  if (!obj || typeof obj !== "object") return undefined;
  const keys = Object.keys(obj);
  for (const p of patterns) {
    const k = keys.find((key) => p.test(normKey(key)));
    if (k) {
      const val = parseNumber((obj as any)[k]);
      if (val != null) return val;
    }
  }
  return undefined;
}
function fmt(n: any, d = 1) { if (n == null || Number.isNaN(Number(n))) return ""; return Number(n).toFixed(d); }
function fmt3(n: any) { return fmt(n, 3); }
function pctSmart(v: any) {
  if (v == null || v === "") return "";
  const num = Number(v);
  if (!Number.isFinite(num)) return "";
  return `${(Math.abs(num) <= 1 ? num * 100 : num).toFixed(1)}%`;
}
const sum = (a: number[]) => a.reduce((s, x) => s + x, 0);
const mean = (a: number[]) => (a.length ? sum(a) / a.length : undefined);
const pushIf = (arr: number[], v: any) => { const p = parseNumber(v); if (p != null) arr.push(p); };
type Col = { key: string; label: string; kind?: "pct" | "dec3" | "num" | "int" };
function isEmptyValue(v: any) { return v == null || v === "" || (typeof v === "number" && !Number.isFinite(v)); }
function sortValue(_key: string, v: any, kind?: Col["kind"]) {
  if (v == null) return -Infinity;
  if (kind === "pct") return Math.abs(Number(v)) <= 1 ? Number(v) * 100 : Number(v);
  return Number(v);
}
function cellFormat(key: string, v: any, kind?: Col["kind"]) {
  if (v == null) return "";
  if (kind === "pct") return pctSmart(v);
  if (kind === "dec3") return fmt3(v);
  if (kind === "int") return fmt(v, 0);
  if (/%/.test(key) || /(Pct|Rate)$/i.test(key)) return pctSmart(v);
  if (["ERA", "FIP", "xFIP", "SIERA", "WHIP"].includes(key)) return fmt(v, 2);
  if (["AVG", "OBP", "SLG", "wOBA", "xwOBA"].includes(key)) return fmt3(v);
  return fmt(v, 1);
}
const alias = new Map<string, string>([
  ["BB%", "BBp"], ["K%", "Kp"], ["K-BB%", "KMinusBB"],
  ["CSW%", "CSWp"], ["SwStr%", "SwStrPct"], ["Zone%", "ZonePct"],
]);

/* =========================================================
   Sorting hook
   ====================================================== */
function useSorted(rows: any[], cols: Col[]) {
  const [sortKey, setSortKey] = useState<string | undefined>();
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const sorted = useMemo(() => {
    if (!sortKey) return rows;
    const col = cols.find((c) => c.key === sortKey);
    return [...rows].sort((a, b) => {
      const av = sortValue(sortKey, a[sortKey], col?.kind);
      const bv = sortValue(sortKey, b[sortKey], col?.kind);
      return sortDir === "asc" ? av - bv : bv - av;
    });
  }, [rows, sortKey, sortDir, cols]);
  function onSort(k: string) {
    if (sortKey === k) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else { setSortKey(k); setSortDir("desc"); }
  }
  return { sorted, sortKey, sortDir, onSort };
}

/* =========================================================
   Spinner / Skeleton / Empty states
   ====================================================== */
function Spinner({ className = "" }: { className?: string }) {
  return (
    <svg className={`animate-spin ${className}`} viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" opacity="0.2" />
      <path d="M22 12a10 10 0 0 0-10-10" stroke="currentColor" strokeWidth="4" fill="none" />
    </svg>
  );
}
function SectionSkeleton({ height = 220 }: { height?: number }) {
  return (
    <section className="space-y-2" aria-hidden>
      <div className="h-4 w-40 bg-neutral-800/70 rounded animate-pulse" />
      <div className="rounded border border-neutral-800 overflow-hidden">
        <div className="h-9 w-full bg-neutral-900/70 border-b border-neutral-800 animate-pulse" />
        <div className="w-full" style={{ height }} >
          <div className="h-full w-full bg-neutral-900/40 animate-pulse" />
        </div>
      </div>
    </section>
  );
}
function EmptyState({
  hasSeasons,
  onQuickSearch,
}: {
  hasSeasons: boolean;
  onQuickSearch: (name: string) => void;
}) {
  return (
    <div className="mt-10 rounded-xl border border-neutral-800 bg-neutral-950/40 p-10 text-center">
      <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-full border border-neutral-700">
        <svg viewBox="0 0 24 24" width="20" height="20" className="opacity-80">
          <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="1.5" />
          <path d="M7 8c2 2 2 6 0 8M17 8c-2 2-2 6 0 8" stroke="currentColor" strokeWidth="1.5" fill="none"/>
        </svg>
      </div>
      <h3 className="text-lg font-medium mb-1">Search a player to get started</h3>
      <p className="text-sm opacity-70">
        Type the full name and {hasSeasons ? "press Search" : "pick seasons, then press Search"}.
      </p>
      <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
        {["Gerrit Cole", "Corbin Burnes", "Tarik Skubal"].map((n) => (
          <button
            key={n}
            onClick={() => onQuickSearch(n)}
            className="px-3 py-1 rounded-full border border-orange-500/60 text-orange-400 hover:bg-orange-500/10"
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  );
}
function NoResultsState() {
  return (
    <div className="mt-10 rounded-xl border border-neutral-800 bg-neutral-950/40 p-10 text-center">
      <h3 className="text-lg font-medium mb-1">No stats for these seasons</h3>
      <p className="text-sm opacity-70">Try different seasons or another player.</p>
    </div>
  );
}

/* =========================================================
   Table
   ====================================================== */
function Table({
  title, rows, cols, sumKeys = [], avgKeys = [], footAlias = alias,
  autoPrune = true, minNonEmptyPerCol = 1, minDataCols = 2
}: {
  title: string;
  rows: any[];
  cols: Col[];
  sumKeys?: string[];
  avgKeys?: string[];
  footAlias?: Map<string, string>;
  autoPrune?: boolean;
  minNonEmptyPerCol?: number;
  minDataCols?: number;
}): JSX.Element | null {
  const baseRows = rows ?? [];

  // column pruning
  const visibleCols: Col[] = useMemo(() => {
    if (!autoPrune) return cols;
    const counts = new Map<string, number>();
    for (const c of cols) if (c.key !== "season") counts.set(c.key, 0);
    for (const r of baseRows) {
      for (const c of cols) {
        if (c.key === "season") continue;
        const v = (r as any)[c.key];
        if (!isEmptyValue(v)) counts.set(c.key, (counts.get(c.key) ?? 0) + 1);
      }
    }
    return cols.filter((c) => c.key === "season" || (counts.get(c.key) ?? 0) >= minNonEmptyPerCol);
  }, [cols, baseRows, autoPrune, minNonEmptyPerCol]);

  // row pruning
  const prunedRows = useMemo(() => {
    if (!autoPrune) return baseRows;
    const dataKeys = visibleCols.filter((c) => c.key !== "season").map((c) => c.key);
    return baseRows.filter((r) => dataKeys.some((k) => !isEmptyValue((r as any)[k])));
  }, [baseRows, visibleCols, autoPrune]);

  // sort
  const { sorted, sortKey, sortDir, onSort } = useSorted(prunedRows, visibleCols);

  // hide decision
  const dataColCount = visibleCols.filter((c) => c.key !== "season").length;
  const hide = prunedRows.length === 0 || dataColCount < minDataCols;
  if (hide) return null;

  // totals / averages
  const totals: Record<string, number | undefined> = {};
  for (const k of sumKeys) { const vals: number[] = []; for (const r of prunedRows) pushIf(vals, (r as any)[k]); totals[k] = vals.length ? sum(vals) : undefined; }
  for (const k of avgKeys) { const vals: number[] = []; for (const r of prunedRows) pushIf(vals, (r as any)[k]); totals[k] = mean(vals); }

  const tableClass = "min-w-full text-sm";
  const theadClass = "text-left sticky top-0 z-10 bg-neutral-1000/70 backdrop-blur border-b border-neutral-800";
  const thBase = "px-3 py-2 select-none";
  const trClass = "odd:bg-neutral-1000/15 hover:bg-neutral-900/30";
  const numCell = "px-3 py-2 text-right tabular-nums";
  const headBtn = (c: Col) => (
    <th key={c.key} className={thBase}>
      <button
        onClick={() => onSort(c.key)}
        className={`flex items-center gap-1 ${c.key === "season" ? "font-medium" : "opacity-90 hover:opacity-100"} ${sortKey === c.key ? "text-orange-400" : ""}`}
      >
        <span>{c.label}</span>
        {sortKey === c.key ? <span className="text-xs">{sortDir === "asc" ? "▲" : "▼"}</span> : <span className="text-xs opacity-30">↕</span>}
      </button>
    </th>
  );

  return (
    <section className="space-y-2">
      <div className="text-sm opacity-80">{title}</div>
      <div className="rounded border border-neutral-800 overflow-auto">
        <table className={tableClass}>
          <thead className={theadClass}>
            <tr>{visibleCols.map(headBtn)}</tr>
          </thead>
          <tbody>
            {sorted.map((r, i) => (
              <tr key={(r as any).season ?? i} className={trClass}>
                {visibleCols.map((c) => (
                  <td key={c.key} className={c.key === "season" ? "px-3 py-2 text-left font-medium" : numCell}>
                    {c.key === "season" ? (r as any)[c.key] : cellFormat(c.label, (r as any)[c.key], c.kind)}
                  </td>
                ))}
              </tr>
            ))}
            <tr className="border-t border-neutral-800 bg-neutral-900/40 font-semibold">
              {visibleCols.map((c, idx) => {
                if (idx === 0) return <td key={c.key} className="px-3 py-2">Totals</td>;
                const key = totals[c.key] !== undefined ? c.key : (footAlias.get(c.label) ?? c.key);
                return <td key={c.key} className={numCell}>{cellFormat(c.label, totals[key], c.kind)}</td>;
              })}
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  );
}

/* =========================================================
   Page
   ====================================================== */
export default function PitchersDeepDiveSearch() {
  const [name, setName] = useState("");
  const [years, setYears] = useState<number[]>([2025]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string>("");
  const [data, setData] = useState<Summary | null>(null);

  function toggle(y: number) {
    setYears((prev) => {
      const s = new Set(prev); s.has(y) ? s.delete(y) : s.add(y);
      return Array.from(s).sort((a, b) => a - b);
    });
  }
  function setAllYears() { setYears([...YEARS]); }
  function clearYears() { setYears([]); }

  async function doSearch(overrideName?: string, overrideYears?: number[]) {
    setErr("");
    const targetName = (overrideName ?? name).trim();
    const targetYears = overrideYears ?? years;
    if (!targetName) {
      setErr("Enter a player name");
      return;
    }
    setLoading(true);
    setData(null);
    try {
      const { first, last } = splitName(targetName);
      const qs = targetYears.length ? targetYears.map((y) => `seasons=${y}`).join("&") : `seasons=2025`;
      const res = await fetch(
        `/api/pitchers/${encodeURIComponent(first)}/${encodeURIComponent(last)}/summary?${qs}`,
        { cache: "no-store" }
      );
      const json = await res.json();
      setData(json);
    } catch (e: any) {
      setErr(e?.message || "Error");
    } finally {
      setLoading(false);
    }
  }

  const fg = useMemo(() => getFgRows(data), [data]);

  const production = useMemo(() => fg.map((r) => {
    const d = r.data;
    return {
      season: r.season,
      IP: n(d, ["IP"]),
      G: n(d, ["G"]),
      GS: n(d, ["GS"]),
      W: n(d, ["W"]),
      L: n(d, ["L"]),
      SV: n(d, ["SV"]),
      HLD: n(d, ["HLD", "Holds"]),
      CG: n(d, ["CG"]),
      SHO: n(d, ["SHO"]),
      TBF: n(d, ["TBF", "BF"]),
      Pitches: n(d, ["Pitches", "Pit"]),
      ERA: n(d, ["ERA"]),
      WHIP: n(d, ["WHIP"]),
    };
  }), [fg]);

  const strikeApproach = useMemo(() => fg.map((r) => {
    const d = r.data;
    const Kper9 = n(d, ["K/9", "K9", "SO/9"]);
    const BBper9 = n(d, ["BB/9", "BB9", "Walks/9"]);
    const Kp = n(d, ["K%", "SO%", "K %", "SO %"]);
    const BBp = n(d, ["BB%", "BB %"]);
    let KMinusBB = n(d, ["K-BB%", "K-BB %"]);
    if (KMinusBB == null && Kp != null && BBp != null) KMinusBB = (Kp - BBp);
    return {
      season: r.season,
      Kper9,
      BBper9,
      Kp,
      BBp,
      KMinusBB,
      CSWp: n(d, ["CSW%", "CSW %"]),
      SwStrPct: n(d, ["SwStr%", "SwStr %", "Whiff%", "Whiff %"]),
      ZonePct: n(d, ["Zone%", "Zone %"]),
      ContactPct: n(d, ["Contact%", "Contact %"]),
      O_SwingPct: n(d, ["O-Swing%", "O-Swing %", "Chase%", "Chase %"]),
    };
  }), [fg]);

  const runPrevention = useMemo(() => fg.map((r) => {
    const d = r.data;
    return {
      season: r.season,
      ERA: n(d, ["ERA"]),
      FIP: n(d, ["FIP"]),
      xFIP: n(d, ["xFIP"]),
      SIERA: n(d, ["SIERA"]),
      ERAminus: n(d, ["ERA-", "ERAminus"]),
      FIPminus: n(d, ["FIP-", "FIPminus"]),
      xFIPminus: n(d, ["xFIP-", "xFIPminus"]),
      HRper9: n(d, ["HR/9", "HR9"]),
      HRperFB: n(d, ["HR/FB", "HRperFB"]),
      LOBPct: n(d, ["LOB%", "LOB %", "Strand%"]),
      GBpct: n(d, ["GB%", "GB %"]),
      HardHitPct: n(d, ["HardHit%", "HardHit %", "Hard%"]),
    };
  }), [fg]);

  const contactQuality = useMemo(() => fg.map((r) => {
    const d = r.data;
    return {
      season: r.season,
      BABIP: n(d, ["BABIP"]),
      LDpct: n(d, ["LD%", "LD %"]),
      GBpct: n(d, ["GB%", "GB %"]),
      FBpct: n(d, ["FB%", "FB %"]),
      IFFBpct: n(d, ["IFFB%", "IFFB %"]),
      PullPct: n(d, ["Pull%", "Pull %"]),
      CentPct: n(d, ["Cent%", "Cent %", "Center%"]),
      OppoPct: n(d, ["Oppo%", "Oppo %", "Opp%"]),
    };
  }), [fg]);

  const pitchMix = useMemo(() => fg.map((r) => {
    const d = r.data;
    const fuzzy = (pattern: RegExp) => nFuzzy(d, [pattern]);
    return {
      season: r.season,
      FFpct: n(d, ["FF%", "FF %", "FourSeam%", "Four-seam%", "Four Seam%"] ) ?? fuzzy(/ff(pct)?$/),
      FSpct: n(d, ["FS%", "FS %", "Splitter%", "Split%" ]) ?? fuzzy(/fs(pct)?$/),
      FTpct: n(d, ["FT%", "FT %", "TwoSeam%", "Two Seam%"] ) ?? fuzzy(/ft(pct)?$/),
      SIpct: n(d, ["SI%", "SI %", "Sinker%"] ) ?? fuzzy(/si(pct)?$/),
      SLpct: n(d, ["SL%", "SL %", "Slider%", "Sl%"] ) ?? fuzzy(/sl(pct)?$/),
      CUpct: n(d, ["CU%", "CU %", "Curve%", "CB%", "Curveball%"] ) ?? fuzzy(/(cu|cb)(pct)?$/),
      CHpct: n(d, ["CH%", "CH %", "Change%", "CHG%"] ) ?? fuzzy(/ch(pct)?$/),
      KCpct: n(d, ["KC%", "KC %", "Knuckle%", "KnuckleCurve%"] ) ?? fuzzy(/kc(pct)?$/),
      CSpct: n(d, ["CS%", "CS %", "Circle%"] ) ?? fuzzy(/cs(pct)?$/),
    };
  }), [fg]);

  const value = useMemo(() => fg.map((r) => {
    const d = r.data;
    const RA9_WAR = n(d, ["RA9-WAR", "RA9 WAR", "RA9_WAR"]);
    return {
      season: r.season,
      WAR: n(d, ["WAR"]),
      RA9_WAR,
      RAR: n(d, ["RAR"]),
      WPA: n(d, ["WPA"]),
      RE24: n(d, ["RE24"]),
      Shutdowns: n(d, ["SD", "Shutdowns"]),
      Meltdowns: n(d, ["MD", "Meltdowns"]),
      Dollars: n(d, ["Dollars", "Dollars (millions)"]) ?? nFuzzy(d, [/^dollars?$/]),
    };
  }), [fg]);

  function hasAnyData(rows: any[]): boolean {
    return rows.some((r: any) => Object.keys(r).some((k) => k !== "season" && !isEmptyValue(r[k])));
  }

  const anyData =
    hasAnyData(production) || hasAnyData(strikeApproach) || hasAnyData(runPrevention) ||
    hasAnyData(contactQuality) || hasAnyData(pitchMix) || hasAnyData(value);

  const yearChip = (y: number, active: boolean, onClick: () => void) => (
    <button
      key={y}
      onClick={onClick}
      disabled={loading}
      className={`px-3 py-1 rounded-full border text-sm transition
      ${active ? "bg-orange-500 border-orange-600 text-black shadow-[0_0_0_1px_rgba(0,0,0,0.4)]"
               : "border-orange-500/60 text-orange-400 hover:bg-orange-500/10 disabled:opacity-60"}`}
    >{y}</button>
  );
  const primaryBtn = "px-3 py-2 rounded-md bg-orange-500 hover:bg-orange-600 text-black border border-orange-600 disabled:opacity-60";
  const ghostBtn = "px-3 py-1 rounded-md border border-orange-500/60 text-orange-400 hover:bg-orange-500/10 disabled:opacity-60";

  return (
    <div className="px-6 py-6 space-y-8">
      <div className="flex flex-wrap gap-3 items-center">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !loading && name.trim()) doSearch(name); }}
          placeholder="First Last"
          disabled={loading}
          className="px-3 py-2 rounded-md border border-neutral-700 bg-transparent w-[320px] disabled:opacity-60"
        />
        <button onClick={() => doSearch(name)} disabled={loading || !name.trim()} className={primaryBtn}>
          {loading ? <span className="inline-flex items-center gap-2"><Spinner className="text-black" /> Loading…</span> : "Search"}
        </button>
        <div className="text-sm opacity-70">{years.length ? `${years.length} seasons` : "No seasons selected"}</div>
        <span className="sr-only" aria-live="polite">{loading ? "Loading player data" : ""}</span>
      </div>

      <div className="flex gap-2 flex-wrap">
        {YEARS.map((y) => yearChip(y, years.includes(y), () => toggle(y)))}
        <button onClick={setAllYears} className={ghostBtn} disabled={loading}>All</button>
        <button onClick={clearYears} className={ghostBtn} disabled={loading}>Clear</button>
      </div>

      {err ? <div className="text-red-400 text-sm">{err}</div> : null}

      {!data && !loading ? (
        <EmptyState hasSeasons={years.length > 0} onQuickSearch={(n) => { setName(n); doSearch(n); }} />
      ) : null}

      {loading ? (
        <div className="grid gap-6 lg:grid-cols-2">
          {Array.from({ length: 6 }).map((_, idx) => (
            <SectionSkeleton key={idx} height={220} />
          ))}
        </div>
      ) : null}

      {!loading && data && !anyData ? <NoResultsState /> : null}

      {!loading && data && anyData ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <Table
            title="Production"
            rows={production}
            cols={[
              { key: "season", label: "season" },
              { key: "IP", label: "IP" },
              { key: "G", label: "G", kind: "int" },
              { key: "GS", label: "GS", kind: "int" },
              { key: "W", label: "W", kind: "int" },
              { key: "L", label: "L", kind: "int" },
              { key: "SV", label: "SV", kind: "int" },
              { key: "HLD", label: "HLD", kind: "int" },
              { key: "CG", label: "CG", kind: "int" },
              { key: "SHO", label: "SHO", kind: "int" },
              { key: "TBF", label: "TBF", kind: "int" },
              { key: "Pitches", label: "Pitches", kind: "int" },
              { key: "ERA", label: "ERA" },
              { key: "WHIP", label: "WHIP" },
            ]}
            sumKeys={["IP", "G", "GS", "W", "L", "SV", "HLD", "CG", "SHO", "TBF", "Pitches"]}
            avgKeys={["ERA", "WHIP"]}
          />

          <Table
            title="Strike Throwing"
            rows={strikeApproach}
            cols={[
              { key: "season", label: "season" },
              { key: "Kper9", label: "K/9" },
              { key: "BBper9", label: "BB/9" },
              { key: "Kp", label: "K%", kind: "pct" },
              { key: "BBp", label: "BB%", kind: "pct" },
              { key: "KMinusBB", label: "K-BB%", kind: "pct" },
              { key: "CSWp", label: "CSW%", kind: "pct" },
              { key: "SwStrPct", label: "SwStr%", kind: "pct" },
              { key: "ZonePct", label: "Zone%", kind: "pct" },
              { key: "ContactPct", label: "Contact%", kind: "pct" },
              { key: "O_SwingPct", label: "O-Swing%", kind: "pct" },
            ]}
            avgKeys={["Kper9", "BBper9", "Kp", "BBp", "KMinusBB", "CSWp", "SwStrPct", "ZonePct", "ContactPct", "O_SwingPct"]}
          />

          <Table
            title="Run Prevention"
            rows={runPrevention}
            cols={[
              { key: "season", label: "season" },
              { key: "ERA", label: "ERA" },
              { key: "FIP", label: "FIP" },
              { key: "xFIP", label: "xFIP" },
              { key: "SIERA", label: "SIERA" },
              { key: "ERAminus", label: "ERA-" },
              { key: "FIPminus", label: "FIP-" },
              { key: "xFIPminus", label: "xFIP-" },
              { key: "HRper9", label: "HR/9" },
              { key: "HRperFB", label: "HR/FB", kind: "pct" },
              { key: "LOBPct", label: "LOB%", kind: "pct" },
              { key: "GBpct", label: "GB%", kind: "pct" },
              { key: "HardHitPct", label: "HardHit%", kind: "pct" },
            ]}
            avgKeys={["ERA", "FIP", "xFIP", "SIERA", "ERAminus", "FIPminus", "xFIPminus", "HRper9", "HRperFB", "LOBPct", "GBpct", "HardHitPct"]}
          />

          <Table
            title="Batted Ball & Contact"
            rows={contactQuality}
            cols={[
              { key: "season", label: "season" },
              { key: "BABIP", label: "BABIP", kind: "dec3" },
              { key: "LDpct", label: "LD%", kind: "pct" },
              { key: "GBpct", label: "GB%", kind: "pct" },
              { key: "FBpct", label: "FB%", kind: "pct" },
              { key: "IFFBpct", label: "IFFB%", kind: "pct" },
              { key: "PullPct", label: "Pull%", kind: "pct" },
              { key: "CentPct", label: "Cent%", kind: "pct" },
              { key: "OppoPct", label: "Oppo%", kind: "pct" },
            ]}
            avgKeys={["BABIP", "LDpct", "GBpct", "FBpct", "IFFBpct", "PullPct", "CentPct", "OppoPct"]}
          />

          <Table
            title="Pitch Mix"
            rows={pitchMix}
            cols={[
              { key: "season", label: "season" },
              { key: "FFpct", label: "FF%", kind: "pct" },
              { key: "FSpct", label: "FS%", kind: "pct" },
              { key: "FTpct", label: "FT%", kind: "pct" },
              { key: "SIpct", label: "SI%", kind: "pct" },
              { key: "SLpct", label: "SL%", kind: "pct" },
              { key: "CUpct", label: "CU%", kind: "pct" },
              { key: "CHpct", label: "CH%", kind: "pct" },
              { key: "KCpct", label: "KC%", kind: "pct" },
              { key: "CSpct", label: "CS%", kind: "pct" },
            ]}
            avgKeys={["FFpct", "FSpct", "FTpct", "SIpct", "SLpct", "CUpct", "CHpct", "KCpct", "CSpct"]}
            minDataCols={2}
          />

          <Table
            title="Value"
            rows={value}
            cols={[
              { key: "season", label: "season" },
              { key: "WAR", label: "WAR" },
              { key: "RA9_WAR", label: "RA9-WAR" },
              { key: "RAR", label: "RAR" },
              { key: "WPA", label: "WPA" },
              { key: "RE24", label: "RE24" },
              { key: "Shutdowns", label: "SD", kind: "int" },
              { key: "Meltdowns", label: "MD", kind: "int" },
              { key: "Dollars", label: "Dollars" },
            ]}
            sumKeys={["WAR", "RA9_WAR", "RAR", "WPA", "RE24", "Shutdowns", "Meltdowns", "Dollars"]}
          />
        </div>
      ) : null}
    </div>
  );
}
