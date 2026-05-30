import { useState, useEffect, useRef } from "react";
import { Search } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { SERVICE_META } from "@/api/services";

type SearchItem = {
  name: string;
  displayName: string;
  route: string;
};

// We can also add other static routes like Dashboard here if we want.
const SEARCH_ITEMS: SearchItem[] = [
  { name: "dashboard", displayName: "Console Home", route: "/console/aws" },
  ...SERVICE_META.map((s) => ({
    name: s.name,
    displayName: s.displayName,
    route: s.route,
  })),
];

export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const results = query
    ? SEARCH_ITEMS.filter((item) =>
        item.displayName.toLowerCase().includes(query.toLowerCase()) ||
        item.name.toLowerCase().includes(query.toLowerCase())
      )
    : SEARCH_ITEMS.slice(0, 5); // Show first 5 when empty

  useEffect(() => {
    function handleGlobalKeyDown(e: KeyboardEvent) {
      if (e.key === "/" && document.activeElement?.tagName !== "INPUT" && document.activeElement?.tagName !== "TEXTAREA") {
        e.preventDefault();
        inputRef.current?.focus();
        setOpen(true);
      }
      if (e.key === "Escape") {
        setOpen(false);
        inputRef.current?.blur();
      }
    }
    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      window.addEventListener("mousedown", handleClickOutside);
    }
    return () => window.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((prev) => (prev < results.length - 1 ? prev + 1 : prev));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((prev) => (prev > 0 ? prev - 1 : 0));
    } else if (e.key === "Enter" && results.length > 0) {
      e.preventDefault();
      const selected = results[activeIndex];
      navigate(selected.route);
      setOpen(false);
      setQuery("");
      inputRef.current?.blur();
    }
  }

  return (
    <div className="search-container" ref={containerRef} style={{ position: "relative" }}>
      <div
        className="search"
        onClick={() => {
          setOpen(true);
          inputRef.current?.focus();
        }}
        style={{
          background: open ? "var(--surface-hover)" : "var(--surface)",
          border: open ? "1px solid var(--primary)" : "1px solid transparent",
        }}
      >
        <Search size={14} />
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => setOpen(true)}
          placeholder="Search services, features, docs, and more"
        />
        <span className="kbd">/</span>
      </div>

      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            left: 0,
            width: "100%",
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: 6,
            boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
            zIndex: 100,
            overflow: "hidden",
            maxHeight: 300,
            overflowY: "auto",
          }}
        >
          {results.length === 0 ? (
            <div style={{ padding: "12px", color: "var(--text-muted)", fontSize: 13 }}>
              No results found for "{query}"
            </div>
          ) : (
            results.map((item, index) => (
              <div
                key={item.name}
                onClick={() => {
                  navigate(item.route);
                  setOpen(false);
                  setQuery("");
                }}
                onMouseEnter={() => setActiveIndex(index)}
                style={{
                  padding: "8px 12px",
                  cursor: "pointer",
                  fontSize: 13,
                  background: index === activeIndex ? "var(--surface-hover)" : "transparent",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <strong>{item.displayName}</strong>
                <span style={{ color: "var(--text-muted)", fontSize: 11 }}>Service</span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
