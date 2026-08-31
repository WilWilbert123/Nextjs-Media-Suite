"use client";

import * as React from "react";
import { QrCode, Download } from "lucide-react";

export default function QrStudioPage() {
  const [text, setText] = React.useState("https://gifter.app");
  const [size, setSize] = React.useState(300);
  
  // Free reliable QR generation API
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(text)}`;

  const handleDownload = async () => {
    try {
      const response = await fetch(qrUrl);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "qrcode.png";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      // Fallback for CORS issues
      window.open(qrUrl, "_blank");
    }
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-6xl mx-auto">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
          <QrCode className="w-8 h-8 text-primary" />
          QR Code Studio
        </h1>
        <p className="text-muted-foreground">
          Instantly generate high-quality QR codes for links, text, Wi-Fi passwords, and more.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 border border-border rounded-xl bg-card p-6">
        
        {/* Controls */}
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-3">
            <label className="font-semibold">Content (URL, Text, etc.)</label>
            <textarea
              className="w-full min-h-[120px] p-4 rounded-xl border border-border bg-background focus:ring-2 focus:ring-primary outline-none transition-all resize-none"
              placeholder="Enter your URL or text here..."
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-3">
            <label className="font-semibold flex justify-between">
              <span>Resolution (Size)</span>
              <span className="text-muted-foreground font-normal">{size}x{size} px</span>
            </label>
            <input
              type="range"
              min={100}
              max={1000}
              step={50}
              value={size}
              onChange={(e) => setSize(Number(e.target.value))}
              className="w-full accent-primary h-2 bg-muted rounded-full appearance-none cursor-pointer"
            />
          </div>
        </div>

        {/* Preview */}
        <div className="flex flex-col items-center justify-center gap-6 p-6 bg-black/5 rounded-xl border border-border">
          {text ? (
            <div className="bg-white p-4 rounded-xl shadow-lg border border-border/50 transition-all hover:scale-105">
              <img 
                src={qrUrl} 
                alt="QR Code" 
                className="w-48 h-48 sm:w-64 sm:h-64 object-contain"
                crossOrigin="anonymous"
              />
            </div>
          ) : (
            <div className="w-48 h-48 sm:w-64 sm:h-64 bg-background border-2 border-dashed border-border rounded-xl flex items-center justify-center text-muted-foreground text-center p-6">
              Enter text to generate QR code
            </div>
          )}

          <button
            onClick={handleDownload}
            disabled={!text}
            className="flex items-center gap-2 px-8 py-3 rounded-lg bg-primary text-primary-foreground font-semibold hover:opacity-90 active:scale-95 transition-all shadow-md disabled:opacity-50"
          >
            <Download className="w-5 h-5" /> Download PNG
          </button>
        </div>

      </div>
    </div>
  );
}
