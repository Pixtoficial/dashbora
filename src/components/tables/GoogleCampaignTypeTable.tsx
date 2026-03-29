"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { GoogleCampaignType } from "@/types";
import { formatCurrency, formatNumber, formatMultiplier } from "@/lib/utils";

const TYPE_COLORS: Record<string, string> = {
  Search: "#4285F4",
  "Performance Max": "#34A853",
  Display: "#FBBC05",
  YouTube: "#EA4335",
};

interface Props {
  data: GoogleCampaignType[];
}

export function GoogleCampaignTypeTable({ data }: Props) {
  return (
    <div className="rounded-xl border border-border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent border-border">
            <TableHead>Tipo de Campanha</TableHead>
            <TableHead className="text-right">Custo</TableHead>
            <TableHead className="text-right">Cliques</TableHead>
            <TableHead className="text-right">Conversões</TableHead>
            <TableHead className="text-right">ROAS</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((row) => (
            <TableRow key={row.type} className="border-border">
              <TableCell>
                <div className="flex items-center gap-2.5">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ background: TYPE_COLORS[row.type] ?? "#888" }}
                  />
                  <span className="font-medium">{row.type}</span>
                </div>
              </TableCell>
              <TableCell className="text-right font-mono text-sm">{formatCurrency(row.cost)}</TableCell>
              <TableCell className="text-right font-mono text-sm">{formatNumber(row.clicks)}</TableCell>
              <TableCell className="text-right font-mono text-sm">{formatNumber(row.conversions)}</TableCell>
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
