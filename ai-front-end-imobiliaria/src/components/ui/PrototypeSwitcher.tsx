"use client";

import { ArrowLeft, ArrowRight } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";

import { Button } from "@/components/ui/button";

interface PrototypeVariant {
  key: string;
  name: string;
}

interface PrototypeSwitcherProps {
  current: string;
  variants: PrototypeVariant[];
}

export function PrototypeSwitcher({ current, variants }: PrototypeSwitcherProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  const cycle = (direction: -1 | 1) => {
    const currentIndex = Math.max(0, variants.findIndex((variant) => variant.key === current));
    const next = variants[(currentIndex + direction + variants.length) % variants.length];
    const params = new URLSearchParams(searchParams.toString());
    params.set("variant", next.key);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target;
      if (target instanceof HTMLElement && (target.matches("input, textarea, [contenteditable]") || target.closest("[contenteditable]"))) return;
      if (event.key === "ArrowLeft") cycle(-1);
      if (event.key === "ArrowRight") cycle(1);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  });

  if (process.env.NODE_ENV === "production") return null;

  const active = variants.find((variant) => variant.key === current) ?? variants[0];
  return (
    <div className="fixed bottom-5 left-1/2 z-[100] flex -translate-x-1/2 items-center gap-2 rounded-full bg-slate-950 p-1.5 text-white shadow-2xl ring-1 ring-white/20">
      <Button aria-label="Variação anterior" className="rounded-full text-white hover:bg-white/15 hover:text-white" onClick={() => cycle(-1)} size="icon-sm" type="button" variant="ghost"><ArrowLeft /></Button>
      <span className="min-w-48 px-2 text-center text-sm font-medium">{active.key} — {active.name}</span>
      <Button aria-label="Próxima variação" className="rounded-full text-white hover:bg-white/15 hover:text-white" onClick={() => cycle(1)} size="icon-sm" type="button" variant="ghost"><ArrowRight /></Button>
    </div>
  );
}
