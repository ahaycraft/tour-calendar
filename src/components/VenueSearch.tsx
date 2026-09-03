"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, MapPin } from "lucide-react";

export interface VenueResult {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  country: string;
  lat: number | null;
  lng: number | null;
  source: "photon" | "google";
}

interface Props {
  value: string;
  onValueChange: (v: string) => void;
  onSelect: (v: VenueResult) => void;
  inputClassName: string;
  name?: string;
  required?: boolean;
  placeholder?: string;
}

export default function VenueSearch({
  value,
  onValueChange,
  onSelect,
  inputClassName,
  name = "venue",
  required,
  placeholder,
}: Props) {
  const [results, setResults] = useState<VenueResult[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const skipNextSearch = useRef(false);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (skipNextSearch.current) {
      skipNextSearch.current = false;
      return;
    }
    const q = value.trim();
    const controller = new AbortController();

    const t = setTimeout(async () => {
      if (q.length < 2) {
        setResults([]);
        setOpen(false);
        return;
      }
      setLoading(true);
      try {
        const res = await fetch(`/api/venues?q=${encodeURIComponent(q)}`, {
          signal: controller.signal,
        });
        if (res.ok) {
          const data: VenueResult[] = await res.json();
          setResults(data);
          setOpen(true);
          setActiveIndex(-1);
        }
      } catch {
        /* aborted or offline — ignore */
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => {
      clearTimeout(t);
      controller.abort();
    };
  }, [value]);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  function choose(r: VenueResult) {
    skipNextSearch.current = true;
    onSelect(r);
    setOpen(false);
    setResults([]);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open || results.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => (i + 1) % results.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => (i - 1 + results.length) % results.length);
    } else if (e.key === "Enter" && activeIndex >= 0) {
      e.preventDefault();
      choose(results[activeIndex]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div ref={boxRef} className="relative">
      <input
        name={name}
        required={required}
        autoComplete="off"
        value={value}
        onChange={(e) => onValueChange(e.target.value)}
        onFocus={() => results.length > 0 && setOpen(true)}
        onKeyDown={onKeyDown}
        className={inputClassName}
        placeholder={placeholder}
      />
      {loading && (
        <Loader2
          size={15}
          className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-zinc-500"
        />
      )}

      {open && (
        <ul className="absolute z-20 mt-1 w-full max-h-64 overflow-y-auto rounded-lg border border-zinc-700 bg-zinc-900 shadow-xl">
          {results.length === 0 ? (
            <li className="px-3 py-2 text-sm text-zinc-500">No matches</li>
          ) : (
            results.map((r, i) => (
              <li key={r.id}>
                <button
                  type="button"
                  onMouseEnter={() => setActiveIndex(i)}
                  onClick={() => choose(r)}
                  className={`flex w-full items-start gap-2 px-3 py-2 text-left transition-colors ${
                    i === activeIndex ? "bg-zinc-800" : "hover:bg-zinc-800/60"
                  }`}
                >
                  <MapPin size={14} className="mt-0.5 shrink-0 text-zinc-500" />
                  <span className="min-w-0">
                    <span className="block text-sm font-medium text-zinc-100">{r.name}</span>
                    {r.address && (
                      <span className="block truncate text-xs text-zinc-500">{r.address}</span>
                    )}
                  </span>
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
