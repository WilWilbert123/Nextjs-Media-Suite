"use client";

import * as React from "react";
import Link from "next/link";
import { Search, Film, Scissors, Music, Move, Zap, Wand2, Type, MonitorPlay, FileImage, BarChart2, FileText, ShieldOff, Eraser, Stamp } from "lucide-react";
import { cn } from "@/lib/utils";

const TOOLS = [
  { id: "maker", name: "GIF Maker", description: "Frame-by-frame assembly (GIF/WebP/APNG)", icon: Film, href: "/maker" },
  { id: "video", name: "Video Tools", description: "Cut, Reverse, Speed, GIF-to-Video", icon: Scissors, href: "/video" },
  { id: "audio", name: "Audio Extractor", description: "Extract audio and convert MP4 to MP3", icon: Music, href: "/audio" },
  { id: "transform", name: "Transform", description: "Resize, Crop, Rotate, Reverse, Split", icon: Move, href: "/transform" },
  { id: "optimize", name: "Optimize", description: "Lossy GIF, WebP, AVIF, PNG compression", icon: Zap, href: "/optimize" },
  { id: "effects", name: "Effects", description: "Speed, Color Filters, Overlays, Censoring", icon: Wand2, href: "/effects" },
  { id: "text", name: "Add Text", description: "Text burning & Subtitle overlays", icon: Type, href: "/add-text" },
  { id: "screen", name: "Screen Recorder", description: "WebRTC Screen & Display Capture API", icon: MonitorPlay, href: "/screen-recorder" },
  { id: "formats", name: "Formats", description: "Next-gen converters (AVIF, JXL, SVG, WebP)", icon: FileImage, href: "/formats" },
  { id: "analyzer", name: "Analyzer", description: "Deep inspection, Frame & Delay Parser", icon: BarChart2, href: "/analyzer" },
  { id: "documents", name: "Document Hub", description: "Word, Excel, PDF merge/split & OCR", icon: FileText, href: "/documents" },
  { id: "metadata", name: "Metadata Cleaner", description: "Strip EXIF & GPS data for total privacy", icon: ShieldOff, href: "/metadata" },
  { id: "background", name: "Background Eraser", description: "AI-powered local background removal", icon: Eraser, href: "/background" },
  { id: "watermark", name: "Batch Watermarker", description: "Securely stamp logos & text on bulk media", icon: Stamp, href: "/watermark" },
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
    <div className="flex-1 w-full max-w-7xl mx-auto p-3 md:p-4 flex flex-col gap-2 justify-between h-[100dvh] overflow-hidden">
      <div className="flex flex-col gap-3">
        <div className="flex flex-col items-center justify-center pt-2 pb-2 text-center gap-1 smooth-show">
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-foreground">
            Privacy-First Media Processing
          </h1>
          <p className="text-base text-muted-foreground max-w-2xl">
            Everything runs entirely in your browser using WebAssembly. No uploads, no servers, zero persistence. Fast and secure.
          </p>
        </div>

        <div className="relative max-w-xl mx-auto w-full mb-2 smooth-show" style={{ animationDelay: '50ms' }}>
          <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
            <Search className="w-4 h-4 text-muted-foreground" />
          </div>
          <input
            type="text"
            placeholder="Search tools (e.g. crop, optimize, gif to video)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-10 pl-10 pr-4 rounded-lg border border-border bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-foreground focus:ring-1 focus:ring-foreground transition-all duration-200 ease-spring text-sm smooth-shadow"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 lg:grid-rows-4 gap-2 md:gap-3 flex-1 min-h-0">
          {filteredTools.map((tool, index) => {
            const Icon = tool.icon;
            return (
              <Link
                key={tool.id}
                href={tool.href}
                className="group relative flex flex-col justify-center gap-2 p-3 rounded-xl bg-card border border-border smooth-shadow hover:border-foreground/20 hover:shadow-lg transition-all duration-200 ease-spring active:scale-[0.98] outline-none focus-visible:ring-2 focus-visible:ring-foreground smooth-show h-full"
                style={{ animationDelay: `${100 + index * 30}ms` }}
              >
                <div className="flex items-center gap-2">
                  <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-secondary group-hover:scale-110 transition-transform duration-200 ease-spring">
                    <Icon className="w-4 h-4 text-foreground" />
                  </div>
                  <h3 className="text-base font-bold text-foreground">
                    {tool.name}
                  </h3>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {tool.description}
                </p>
              </Link>
            );
          })}
        </div>
        {filteredTools.length === 0 && (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <p className="text-base font-medium text-foreground">No tools found</p>
            <p className="text-sm text-muted-foreground">Try adjusting your search term.</p>
          </div>
        )}
      </div>

      <footer className="w-full text-center py-4 text-xs text-muted-foreground smooth-show" style={{ animationDelay: '500ms' }}>
        &copy; 2026 Wilbert. All rights reserved.
      </footer>
    </div>
  );
}
