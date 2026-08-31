"use client";

import * as React from "react";
import { Palette, Loader2 } from "lucide-react";
import { FileUploader } from "@/components/common/FileUploader";

export default function PalettePage() {
  const [file, setFile] = React.useState<File | null>(null);
  const [fileUrl, setFileUrl] = React.useState<string>("");
  const [colors, setColors] = React.useState<string[]>([]);
  const [isProcessing, setIsProcessing] = React.useState(false);

  React.useEffect(() => {
    if (file) {
      const url = URL.createObjectURL(file);
      setFileUrl(url);
      extractColors(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setFileUrl("");
      setColors([]);
    }
  }, [file]);

  const extractColors = (url: string) => {
    setIsProcessing(true);
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      
      // Scale down for faster processing
      const maxSize = 200;
      let w = img.width;
      let h = img.height;
      if (w > h) {
        if (w > maxSize) { h *= maxSize / w; w = maxSize; }
      } else {
        if (h > maxSize) { w *= maxSize / h; h = maxSize; }
      }
      canvas.width = w;
      canvas.height = h;
      ctx.drawImage(img, 0, 0, w, h);
      
      const data = ctx.getImageData(0, 0, w, h).data;
      const colorCounts: Record<string, number> = {};
      
      // Sample every 4th pixel for speed
      for (let i = 0; i < data.length; i += 16) {
        const r = Math.round(data[i] / 10) * 10;
        const g = Math.round(data[i+1] / 10) * 10;
        const b = Math.round(data[i+2] / 10) * 10;
        const a = data[i+3];
        if (a < 255) continue; // Skip transparent
        const hex = rgbToHex(r, g, b);
        colorCounts[hex] = (colorCounts[hex] || 0) + 1;
      }
      
      const sortedColors = Object.entries(colorCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8)
        .map(entry => entry[0]);
        
      setColors(sortedColors);
      setIsProcessing(false);
    };
    img.src = url;
  };

  const rgbToHex = (r: number, g: number, b: number) => {
    return "#" + [r, g, b].map(x => {
      const hex = Math.min(255, x).toString(16);
      return hex.length === 1 ? "0" + hex : hex;
    }).join("");
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-6xl mx-auto">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
          <Palette className="w-8 h-8 text-primary" />
          Color Palette Extractor
        </h1>
        <p className="text-muted-foreground">
          Extract dominant hex colors and gradients from images entirely in your browser.
        </p>
      </div>

      {!file && (
        <FileUploader
          onFileSelect={(f) => setFile(f as File)}
          accept="image/*"
        />
      )}

      {file && (
        <div className="flex flex-col gap-6 border border-border rounded-xl bg-card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">{file.name}</p>
              <p className="text-sm text-muted-foreground">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
            </div>
            <button
              onClick={() => setFile(null)}
              className="text-sm text-muted-foreground hover:text-foreground underline underline-offset-4"
            >
              Choose different file
            </button>
          </div>

          <div className="flex flex-col md:flex-row gap-6">
            <div className="flex-1 bg-black/5 rounded-lg flex items-center justify-center min-h-[200px] p-4">
              <img src={fileUrl || undefined} alt="Preview" className="max-w-full max-h-[45vh] object-contain rounded-lg shadow-lg" />
            </div>

            <div className="flex-1 flex flex-col gap-4">
              <h3 className="font-semibold text-lg">Dominant Colors</h3>
              {isProcessing ? (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin" /> Analyzing pixels...
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {colors.map((color, i) => (
                    <div key={i} className="flex flex-col gap-2">
                      <div 
                        className="w-full aspect-square rounded-lg shadow-sm border border-border" 
                        style={{ backgroundColor: color }}
                      />
                      <p className="text-xs font-mono text-center uppercase">{color}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
