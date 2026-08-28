"use client";

import * as React from "react";
import Link from "next/link";
import { Search, Film, Scissors, Music, Move, Zap, Wand2, Type, MonitorPlay, FileImage, BarChart2, FileText } from "lucide-react";
import { cn } from "@/lib/utils";

const TOOLS = [
  { id: "maker", name: "GIF Maker", description: "Frame-by-frame assembly (GIF/WebP/APNG)", icon: Film, href: "/maker", color: "text-blue-500" },
  { id: "video", name: "Video Tools", description: "Cut, Reverse, Speed, GIF-to-Video", icon: Scissors, href: "/video", color: "text-red-500" },
  { id: "audio", name: "Audio Extractor", description: "Extract audio and convert MP4 to MP3", icon: Music, href: "/audio", color: "text-green-500" },
  { id: "transform", name: "Transform", description: "Resize, Crop, Rotate, Reverse, Split", icon: Move, href: "/transform", color: "text-orange-500" },
  { id: "optimize", name: "Optimize", description: "Lossy GIF, WebP, AVIF, PNG compression", icon: Zap, href: "/optimize", color: "text-yellow-500" },
  { id: "effects", name: "Effects", description: "Speed, Color Filters, Overlays, Censoring", icon: Wand2, href: "/effects", color: "text-purple-500" },
  { id: "text", name: "Add Text", description: "Text burning & Subtitle overlays", icon: Type, href: "/add-text", color: "text-indigo-500" },
  { id: "screen", name: "Screen Recorder", description: "WebRTC Screen & Display Capture API", icon: MonitorPlay, href: "/screen-recorder", color: "text-cyan-500" },
  { id: "formats", name: "Formats", description: "Next-gen converters (AVIF, JXL, SVG, WebP)", icon: FileImage, href: "/formats", color: "text-pink-500" },
  { id: "analyzer", name: "Analyzer", description: "Deep inspection, Frame & Delay Parser", icon: BarChart2, href: "/analyzer", color: "text-teal-500" },
  { id: "documents", name: "Document Hub", description: "Word, Excel, PDF merge/split & OCR", icon: FileText, href: "/documents", color: "text-rose-500" },
];

export default function HomePage() {
  const [search, setSearch] = React.useState("");

  const filteredTools = React.useMemo(() => {
    return TOOLS.filter(
      (tool) =>
        tool.name.toLowerCase().includes(search.toLowerCase()) ||
        tool.description.toLowerCase().includes(search.toLowerCase())
    );
  }, [search]);

  return (
    <div className="flex-1 w-full max-w-6xl mx-auto p-4 md:p-8 flex flex-col gap-8">
      <div className="flex flex-col items-center justify-center pt-12 pb-8 text-center gap-4">
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-foreground">
          Privacy-First Media Processing
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl">
          Everything runs entirely in your browser using WebAssembly. No uploads, no servers, zero persistence. Fast and secure.
        </p>
      </div>

      <div className="relative max-w-xl mx-auto w-full mb-8">
        <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
          <Search className="w-5 h-5 text-muted-foreground" />
        </div>
        <input
          type="text"
          placeholder="Search tools (e.g. crop, optimize, gif to video)..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full h-14 pl-12 pr-4 rounded-2xl border-2 border-border bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all text-lg shadow-sm"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        {filteredTools.map((tool) => {
          const Icon = tool.icon;
          return (
            <Link
              key={tool.id}
              href={tool.href}
              className="group relative flex flex-col gap-4 p-6 rounded-2xl bg-card border border-border hover:border-primary/50 hover:shadow-md transition-all active:scale-[0.98] outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <div className="flex items-center gap-4">
                <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-secondary group-hover:scale-110 transition-transform">
                  <Icon className={cn("w-6 h-6", tool.color)} />
                </div>
                <h3 className="text-xl font-bold text-foreground">
                  {tool.name}
                </h3>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {tool.description}
              </p>
            </Link>
          );
        })}
      </div>
      
      {filteredTools.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <p className="text-lg font-medium text-foreground">No tools found</p>
          <p className="text-sm text-muted-foreground">Try adjusting your search term.</p>
        </div>
      )}
    </div>
  );
}
