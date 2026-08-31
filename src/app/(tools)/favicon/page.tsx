"use client";

import * as React from "react";
import { Bookmark, Loader2, Download } from "lucide-react";
import { FileUploader } from "@/components/common/FileUploader";

const SIZES = [
  { size: 16, label: "Favicon Small (16x16)" },
  { size: 32, label: "Favicon Standard (32x32)" },
  { size: 192, label: "Android Chrome (192x192)" },
  { size: 512, label: "PWA Splash (512x512)" },
  { size: 180, label: "Apple Touch (180x180)" },
];

export default function FaviconPage() {
  const [file, setFile] = React.useState<File | null>(null);
  const [generatedUrls, setGeneratedUrls] = React.useState<{size: number, url: string}[]>([]);
  const [isProcessing, setIsProcessing] = React.useState(false);

  React.useEffect(() => {
    if (file) {
      generateIcons(file);
    } else {
      setGeneratedUrls(urls => {
        urls.forEach(u => URL.revokeObjectURL(u.url));
        return [];
      });
    }
  }, [file]);

  const generateIcons = (file: File) => {
    setIsProcessing(true);
    const imgUrl = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const urls: {size: number, url: string}[] = [];
      SIZES.forEach(({ size }) => {
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          // Calculate padding to maintain aspect ratio inside the square icon
          let drawW = size;
          let drawH = size;
          let offsetX = 0;
          let offsetY = 0;
          if (img.width > img.height) {
            drawH = (img.height / img.width) * size;
            offsetY = (size - drawH) / 2;
          } else {
            drawW = (img.width / img.height) * size;
            offsetX = (size - drawW) / 2;
          }
          ctx.drawImage(img, offsetX, offsetY, drawW, drawH);
          urls.push({ size, url: canvas.toDataURL("image/png") });
        }
      });
      setGeneratedUrls(urls);
      setIsProcessing(false);
      URL.revokeObjectURL(imgUrl);
    };
    img.src = imgUrl;
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-6xl mx-auto">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
          <Bookmark className="w-8 h-8 text-primary" />
          Favicon & App Icon Generator
        </h1>
        <p className="text-muted-foreground">
          Upload a master image to instantly generate standard PNG icon sizes for web and mobile apps.
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

          <div className="flex flex-col gap-6">
            {isProcessing ? (
              <div className="flex items-center gap-2 text-muted-foreground justify-center py-10">
                <Loader2 className="w-6 h-6 animate-spin" /> Generating icons...
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
                {SIZES.map(({ size, label }) => {
                  const item = generatedUrls.find(u => u.size === size);
                  if (!item) return null;
                  return (
                    <div key={size} className="flex flex-col gap-3 items-center p-4 bg-muted/30 rounded-xl border border-border text-center">
                      <div className="h-[100px] flex items-center justify-center">
                        <img 
                          src={item.url} 
                          alt={`${size}x${size}`} 
                          className="shadow-sm border border-border bg-black/5"
                          style={{ width: Math.min(size, 80), height: Math.min(size, 80) }}
                        />
                      </div>
                      <p className="text-sm font-medium">{label}</p>
                      <a
                        href={item.url}
                        download={`icon-${size}x${size}.png`}
                        className="flex items-center gap-2 text-xs font-semibold px-3 py-2 bg-primary/10 text-primary rounded-md hover:bg-primary/20 transition-colors w-full justify-center"
                      >
                        <Download className="w-3 h-3" /> Download
                      </a>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
