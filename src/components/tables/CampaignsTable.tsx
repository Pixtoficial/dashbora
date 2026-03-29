"use client";

import { useState } from "react";
import { ChevronUp, ChevronDown, ChevronsUpDown } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { MetaCampaign } from "@/types";
import { formatCurrency, formatNumber, formatPercent, formatMultiplier } from "@/lib/utils";

interface Props {
  campaigns: MetaCampaign[];
}

type SortKey = keyof MetaCampaign;
type SortDir = "asc" | "desc";

export function CampaignsTable({ campaigns }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>("spend");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  }

  const sorted = [...campaigns].sort((a, b) => {
    const av = a[sortKey];
    const bv = b[sortKey];
    const cmp = typeof av === "number" && typeof bv === "number"
      ? av - bv
      : String(av).localeCompare(String(bv));
    return sortDir === "asc" ? cmp : -cmp;
  });

  function SortIcon({ k }: { k: SortKey }) {
    if (sortKey !== k) return <ChevronsUpDown className="w-3 h-3 ml-1 opacity-40" />;
    return sortDir === "asc"
      ? <ChevronUp className="w-3 h-3 ml-1 text-primary" />
      : <ChevronDown className="w-3 h-3 ml-1 text-primary" />;
  }

  const cols: Array<{ key: SortKey; label: string; right?: boolean }> = [
    { key: "name", label: "Campanha" },
    { key: "status", label: "Status" },
    { key: "spend", label: "Gasto", right: true },
    { key: "impressions", label: "Impressões", right: true },
    { key: "ctr", label: "CTR", right: true },
    { key: "cpc", label: "CPC", right: true },
    { key: "conversions", label: "Compras", right: true },
    { key: "cpa", label: "CPA", right: true },
    { key: "roas", label: "ROAS", right: true },
  ];

  return (
    <div className="rounded-xl border border-border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent border-border">
            {cols.map((c) => (
              <TableHead
                key={c.key}
                className={`cursor-pointer select-none ${c.right ? "text-right" : ""}`}
                onClick={() => handleSort(c.key)}
              >
                <span className="inline-flex items-center">
                  {c.label}
                  <SortIcon k={c.key} />
                </span>
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {sorted.map((row) => (
            <TableRow key={row.id} className="border-border">
              <TableCell className="font-medium max-w-[200px]">
                <span className="truncate block">{row.name}</span>
              </TableCell>
              <TableCell>
                <Badge variant={row.status === "active" ? "success" : "secondary"}>
                  {row.status === "active" ? "Ativo" : "Pausado"}
                </Badge>
              </TableCell>
              <TableCell className="text-right font-mono text-sm">{formatCurrency(row.spend)}</TableCell>
              <TableCell className="text-right font-mono text-sm">{formatNumber(row.impressions)}</TableCell>
              <TableCell className="text-right font-mono text-sm">{formatPercent(row.ctr)}</TableCell>
              <TableCell className="text-right font-mono text-sm">{formatCurrency(row.cpc)}</TableCell>
              <TableCell className="text-right font-mono text-sm">{formatNumber(row.conversions)}</TableCell>
              <TableCell className="text-right font-mono text-sm">{formatCurrency(row.cpa)}</TableCell>
              <TableCell className="text-right font-mono text-sm font-semibold text-emerald-400">
                {formatMultiplier(row.roas)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
