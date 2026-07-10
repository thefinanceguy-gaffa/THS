"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { MaterialIcon } from "@/components/ui/material-icon";
import { globalSearch, type SearchResult } from "@/app/actions/search";

const TYPE_LABEL: Record<SearchResult["type"], string> = { customer: "Customer", lead: "Lead", supplier: "Supplier" };
const TYPE_ICON: Record<SearchResult["type"], string> = { customer: "domain", lead: "target", supplier: "local_shipping" };
const TYPE_HREF: Record<SearchResult["type"], (id: string) => string> = {
  customer: (id) => `/customers/${id}`,
  lead: (id) => `/crm?lead=${id}`,
  supplier: (id) => `/suppliers/${id}`,
};

export function GlobalSearch() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      return;
    }
    const handle = setTimeout(() => {
      startTransition(async () => setResults(await globalSearch(query)));
    }, 200);
    return () => clearTimeout(handle);
  }, [query]);

  function select(result: SearchResult) {
    setOpen(false);
    router.push(TYPE_HREF[result.type](result.id));
  }

  const grouped = (["customer", "lead", "supplier"] as const).map((type) => ({
    type,
    items: results.filter((r) => r.type === type),
  }));

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex h-[38px] w-full max-w-md items-center gap-2 rounded-full bg-white/[0.08] px-3.5 text-sm text-white/60 transition-colors hover:bg-white/[0.12]"
      >
        <MaterialIcon name="search" className="text-[18px]" />
        <span className="flex-1 text-left">Search customers, leads, quotes, jobs, staff…</span>
        <kbd className="rounded border border-white/20 px-1.5 py-0.5 font-mono text-[10px] text-white/50">⌘K</kbd>
      </button>
      <CommandDialog open={open} onOpenChange={setOpen} title="Search" description="Search across THS OS">
        <CommandInput placeholder="Search customers, leads, suppliers…" value={query} onValueChange={setQuery} />
        <CommandList>
          {!isPending && query.trim().length >= 2 && results.length === 0 && <CommandEmpty>No results found.</CommandEmpty>}
          {grouped.map(
            (group) =>
              group.items.length > 0 && (
                <CommandGroup key={group.type} heading={TYPE_LABEL[group.type]}>
                  {group.items.map((item) => (
                    <CommandItem key={`${item.type}-${item.id}`} onSelect={() => select(item)}>
                      <MaterialIcon name={TYPE_ICON[item.type]} className="text-[16px]" />
                      <span>{item.label}</span>
                      {item.sublabel && <span className="text-muted-foreground">{item.sublabel}</span>}
                    </CommandItem>
                  ))}
                </CommandGroup>
              )
          )}
        </CommandList>
      </CommandDialog>
    </>
  );
}
