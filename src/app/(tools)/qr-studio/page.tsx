"use client";

import * as React from "react";
import { QrCode, Download, Settings2, Palette } from "lucide-react";
import { QRCodeCanvas } from "qrcode.react";

export default function QrStudioPage() {
  const [text, setText] = React.useState("https://gifter.app");
  const [size, setSize] = React.useState(500);
  const [fgColor, setFgColor] = React.useState("#000000");
  const [bgColor, setBgColor] = React.useState("#ffffff");
  const [margin, setMargin] = React.useState(2);
  const [errorLevel, setErrorLevel] = React.useState<"L" | "M" | "Q" | "H">("M");
  
  const qrRef = React.useRef<HTMLDivElement>(null);

  const handleDownload = () => {
    if (!qrRef.current) return;
    const canvas = qrRef.current.querySelector("canvas");
    if (!canvas) return;

    // Create a temporary link to trigger download
    const url = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = url;
    a.download = "qrcode.png";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-5xl mx-auto p-4 glass-card smooth-show">
      <div className="flex flex-col items-center text-center gap-2">
        <div className="w-12 h-12 rounded-2xl bg-secondary flex items-center justify-center mb-2 smooth-shadow">
          <QrCode className="w-6 h-6 text-foreground" />
        </div>
        <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
          QR Code Studio
        </h1>
        <p className="text-muted-foreground max-w-lg">
          Instantly generate high-quality QR codes entirely in your browser. Customize colors, margins, and error correction.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[1.2fr_1fr] gap-6 mt-4">
        
        {/* Controls */}
        <div className="flex flex-col gap-6 bg-background rounded-2xl p-5 border border-border/40 smooth-shadow">
          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Settings2 className="w-4 h-4 text-primary" />
              Content (URL, Text, etc.)
            </label>
            <textarea
              className="w-full min-h-[100px] p-3 rounded-xl border border-border bg-card focus:ring-2 focus:ring-foreground/20 outline-none transition-all resize-none text-sm smooth-shadow"
              placeholder="Enter your URL or text here..."
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="flex flex-col gap-3">
              <label className="text-sm font-semibold flex justify-between items-center">
                <span>Resolution</span>
                <span className="text-xs text-muted-foreground bg-secondary px-2 py-0.5 rounded-md font-mono">{size}px</span>
              </label>
              <input
                type="range"
                min={100}
                max={1000}
                step={50}
                value={size}
                onChange={(e) => setSize(Number(e.target.value))}
                className="w-full h-1.5 bg-secondary rounded-full appearance-none cursor-pointer"
              />
            </div>
            <div className="flex flex-col gap-3">
              <label className="text-sm font-semibold flex justify-between items-center">
                <span>Padding (Margin)</span>
                <span className="text-xs text-muted-foreground bg-secondary px-2 py-0.5 rounded-md font-mono">{margin}</span>
              </label>
              <input
                type="range"
                min={0}
                max={10}
                step={1}
                value={margin}
                onChange={(e) => setMargin(Number(e.target.value))}
                className="w-full h-1.5 bg-secondary rounded-full appearance-none cursor-pointer"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border/40">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold flex items-center gap-2">
                <Palette className="w-3 h-3 text-primary" /> QR Color
              </label>
              <div className="flex items-center gap-2 bg-card border border-border rounded-lg p-1 pr-3 smooth-shadow transition-colors focus-within:border-foreground/30">
                <input
                  type="color"
                  value={fgColor}
                  onChange={(e) => setFgColor(e.target.value)}
                  className="w-8 h-8 rounded border-none cursor-pointer bg-transparent outline-none p-0"
                />
                <span className="text-xs uppercase font-mono">{fgColor}</span>
              </div>
            </div>
            
            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold flex items-center gap-2">
                <Palette className="w-3 h-3 text-primary" /> Background
              </label>
              <div className="flex items-center gap-2 bg-card border border-border rounded-lg p-1 pr-3 smooth-shadow transition-colors focus-within:border-foreground/30">
                <input
                  type="color"
                  value={bgColor}
                  onChange={(e) => setBgColor(e.target.value)}
                  className="w-8 h-8 rounded border-none cursor-pointer bg-transparent outline-none p-0"
                />
                <span className="text-xs uppercase font-mono">{bgColor}</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3 pt-4 border-t border-border/40">
            <label className="text-sm font-semibold">Error Correction Level</label>
            <div className="flex bg-secondary/50 p-1 rounded-lg gap-1 border border-border/40">
              {(["L", "M", "Q", "H"] as const).map((level) => (
                <button
                  key={level}
                  onClick={() => setErrorLevel(level)}
                  className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${
                    errorLevel === level 
                      ? "bg-background text-foreground shadow-sm border border-border/50" 
                      : "text-muted-foreground hover:bg-background/50 hover:text-foreground"
                  }`}
                >
                  {level} {level === "L" && "(7%)"}
                  {level === "M" && "(15%)"}
                  {level === "Q" && "(25%)"}
                  {level === "H" && "(30%)"}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Preview */}
        <div className="flex flex-col items-center justify-center gap-6 p-6 bg-secondary/20 rounded-2xl border border-border/40 h-full min-h-[350px]">
          {text ? (
            <div className="flex flex-col items-center gap-6 w-full">
              <div 
                className="w-full max-w-[280px] aspect-square rounded-2xl shadow-xl border border-border/20 flex items-center justify-center p-3 transition-all hover:scale-105 duration-300"
                style={{ backgroundColor: bgColor }}
              >
                <div 
                  ref={qrRef} 
                  className="w-full h-full flex items-center justify-center rounded overflow-hidden"
                >
                  <QRCodeCanvas
                    value={text}
                    size={size}
                    fgColor={fgColor}
                    bgColor={bgColor}
                    level={errorLevel}
                    marginSize={margin}
                    style={{ width: "100%", height: "100%", objectFit: "contain" }}
                  />
                </div>
              </div>
              
              <button
                onClick={handleDownload}
                className="flex items-center justify-center gap-2 w-full max-w-[280px] py-3.5 rounded-xl bg-foreground text-background font-bold hover:bg-foreground/90 active:scale-[0.98] transition-all shadow-md"
              >
                <Download className="w-5 h-5" /> Download High-Res PNG
              </button>
            </div>
          ) : (
            <div className="w-full max-w-[280px] aspect-square bg-card border-2 border-dashed border-border rounded-2xl flex items-center justify-center text-muted-foreground text-center p-6 text-sm">
              Enter content to preview your QR code instantly
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
