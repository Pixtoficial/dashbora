"use client";

import { usePathname } from "next/navigation";
import { Menu, Sun, Moon } from "lucide-react";
import { DateRangePicker } from "./DateRangePicker";
import { useSidebar } from "@/contexts/SidebarContext";
import { useTheme } from "@/contexts/ThemeContext";

const PAGE_TITLES: Record<string, string> = {
  "/overview":   "Visão Geral",
  "/meta-ads":   "Meta Ads",
  "/google-ads": "Google Ads",
  "/ga4":        "Google Analytics (GA4)",
  "/usuarios":   "Usuários",
  "/paginas":    "Páginas Mais Visitadas",
  "/funil":      "Funil de Conversão",
  "/criativos":  "Criativos",
  "/estrategia": "Estratégia",
  "/settings":   "Configurações de Integração",
};

export function Header() {
  const pathname = usePathname();
  const title = PAGE_TITLES[pathname] ?? "Dashboard";
  const { toggle } = useSidebar();
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between h-14 px-4 md:px-6 border-b border-border bg-background/80 backdrop-blur-sm">
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={toggle}
          className="md:hidden p-2 rounded-lg hover:bg-accent transition-colors shrink-0"
          aria-label="Abrir menu"
        >
          <Menu className="w-5 h-5" />
        </button>
        <h1 className="text-base md:text-lg font-semibold truncate">{title}</h1>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={toggleTheme}
          className="p-2 rounded-lg hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
          aria-label={theme === "dark" ? "Ativar tema claro" : "Ativar tema escuro"}
        >
          {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>
        <DateRangePicker />
      </div>
    </header>
  );
}
