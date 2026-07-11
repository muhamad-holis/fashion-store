"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import type { Faq } from "@/types/database";

export function FaqAccordion({ faqs }: { faqs: Faq[] }) {
  const [openId, setOpenId] = useState<string | null>(null);

  if (faqs.length === 0) {
    return (
      <div className="premium-card p-8 text-center text-sm text-muted-foreground">
        Belum ada pertanyaan yang tersedia.
      </div>
    );
  }

  return (
    <div className="premium-card divide-y divide-border overflow-hidden">
      {faqs.map((faq) => {
        const isOpen = openId === faq.id;
        return (
          <div key={faq.id}>
            <button
              onClick={() => setOpenId(isOpen ? null : faq.id)}
              className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left transition hover:bg-secondary/40"
            >
              <span className="text-sm font-medium">{faq.question}</span>
              <ChevronDown
                className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${
                  isOpen ? "rotate-180" : ""
                }`}
              />
            </button>
            {isOpen && (
              <div className="px-4 pb-4">
                <p className="text-sm leading-relaxed text-muted-foreground">{faq.answer}</p>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
