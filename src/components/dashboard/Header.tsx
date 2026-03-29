"use client";

import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { DateRangePicker } from "./DateRangePicker";

const PAGE_TITLES: Record<string, string> = {
  "/overview":   "Visão Geral",
  "/meta-ads":   "Meta Ads",
  "/google-ads": "Google Ads",
  "/ga4":        "Google Analytics (GA4)",
  "/usuarios":   "Usuários",
  "/paginas":    "Páginas Mais Visitadas",
  "/funil":      "Funil de Conversão",
  "/settings":   "Configurações de Integração",
};

export function Header() {
  const pathname = usePathname();
  const title = PAGE_TITLES[pathname] ?? "Dashboard";

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between h-16 px-6 border-b border-border bg-background/80 backdrop-blur-sm">
      <div className="flex items-center gap-3">
        <button className="md:hidden p-2 rounded-lg hover:bg-accent transition-colors">
          <Menu className="w-5 h-5" />
        </button>
        <h1 className="text-lg font-semibold">{title}</h1>
      </div>
      <DateRangePicker />
    </header>
  );
}
