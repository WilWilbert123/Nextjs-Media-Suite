"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function ToolsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col min-h-screen w-full bg-background">
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 max-w-screen-2xl items-center mx-auto px-4">
          <Link
            href="/"
            className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-md p-1 -ml-1"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Tools
          </Link>
        </div>
      </header>
      
      <main className="flex-1 w-full max-w-screen-2xl mx-auto px-4 pb-4 pt-2 md:pb-6 md:px-8 flex flex-col">
        {children}
      </main>
    </div>
  );
}
