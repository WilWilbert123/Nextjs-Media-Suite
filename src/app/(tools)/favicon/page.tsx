// src/app/(tools)/favicon/page.tsx

"use client";

import * as React from "react";
import { FileUploader } from "@/components/common/FileUploader";
import { Download, RefreshCw, Loader2, ClipboardCopy } from "lucide-react";
import { resizeImage, generateZip, generateHTMLSnippets } from "./utils";

interface IconSpec {
  name: string;
  size: number;
}

const ICON_SPECS: IconSpec[] = [
  { name: "favicon-16x16.png", size: 16 },
  { name: "favicon-32x32.png", size: 32 },
  { name: "apple-touch-icon-180x180.png", size: 180 },
  { name: "android-chrome-192x192.png", size: 192 },
  { name: "android-chrome-512x512.png", size: 512 },
  { name: "maskable-512x512.png", size: 512 },
  { name: "mstile-150x150.png", size: 150 },
  { name: "favicon-96x96.png", size: 96 },
  { name: "favicon-256x256.png", size: 256 },
  { name: "favicon-1024x1024.png", size: 1024 },
];

export default function FaviconGeneratorPage() {
  const [file, setFile] = React.useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null);
  const [icons, setIcons] = React.useState<{ spec: IconSpec; url: string; blob: Blob }[]>([]);
  const [zipBlob, setZipBlob] = React.useState<Blob | null>(null);
  const [htmlSnippets, setHtmlSnippets] = React.useState<string>("");
  const [isProcessing, setIsProcessing] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (file) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setPreviewUrl(null);
    }
  }, [file]);

  const reset = () => {
    setFile(null);
    setIcons([]);
    setZipBlob(null);
    setHtmlSnippets("");
    setIsProcessing(false);
    setError(null);
  };

  const generate = async () => {
    if (!file) return;
    setIsProcessing(true);
    setError(null);
    try {
      const generated: { spec: IconSpec; url: string; blob: Blob }[] = [];
      for (const spec of ICON_SPECS) {
        const blob = await resizeImage(file, spec.size);
        const url = URL.createObjectURL(blob);
        generated.push({ spec, url, blob });
      }
      setIcons(generated);
      const zip = await generateZip(generated.map(g => ({ name: g.spec.name, blob: g.blob })));
      setZipBlob(zip);
      const snippets = generateHTMLSnippets(
        ICON_SPECS.map(s => ({ size: s.size, name: s.name })),
        "./"
      );
      setHtmlSnippets(snippets);
    } catch (e: any) {
      console.error(e);
      setError(e.message ?? "Failed to generate icons");
    } finally {
      setIsProcessing(false);
    }
  };

  const downloadBlob = (blob: Blob, filename: string) => {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-4xl mx-auto p-4 smooth-show glass-card">
      <div className="flex flex-col items-center text-center gap-2">
        <div className="w-12 h-12 rounded-2xl bg-secondary flex items-center justify-center mb-2 smooth-shadow">
          <Download className="w-6 h-6 text-foreground" />
        </div>
        <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
          Favicon &amp; App Icon Generator
        </h1>
        <p className="text-muted-foreground max-w-lg">
          Upload a master image (≥1024×1024) to instantly generate the full set of PNG icons required for modern web and mobile platforms.
        </p>
      </div>

      {!file && (
        <FileUploader
          onFileSelect={(f) => setFile(f as File)}
          accept="image/*"
          description="Supports JPG, PNG, WebP – best results with a square image"
        />
      )}

      {file && (
        <div className="flex flex-col gap-4 w-full">
          <div className="flex items-center justify-between">
            <span className="font-medium truncate max-w-[200px] md:max-w-md">{file.name}</span>
            <span className="text-xs text-muted-foreground">
              {(file.size / 1024 / 1024).toFixed(2)} MB
            </span>
            <button
              onClick={reset}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Change File
            </button>
          </div>

          {previewUrl && (
            <div className="flex flex-col items-center justify-center p-4 bg-muted/30 border border-border/50 rounded-xl smooth-show">
              <span className="text-xs text-muted-foreground mb-3 font-medium uppercase tracking-wider">Original Image Preview</span>
              <img 
                src={previewUrl} 
                alt="Original preview" 
                className="max-h-[200px] max-w-full object-contain rounded-lg smooth-shadow"
              />
            </div>
          )}

          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-500 text-sm">
              {error}
            </div>
          )}

          {!isProcessing ? (
            <button
              onClick={generate}
              className="flex items-center justify-center gap-2 w-full py-3 bg-foreground text-background rounded-lg font-semibold hover:opacity-90 transition-opacity"
            >
              <RefreshCw className="w-4 h-4" />
              Generate Icons
            </button>
          ) : (
            <div className="flex items-center justify-center gap-2 w-full py-3 bg-foreground/20 text-background rounded-lg font-semibold">
              <Loader2 className="w-4 h-4 animate-spin" />
              Processing…
            </div>
          )}

          {icons.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-4">
              {icons.map((icon) => (
                <div key={icon.spec.name} className="flex flex-col items-center gap-2 p-3 bg-card border border-border/50 rounded-xl smooth-shadow">
                  <div className="flex items-center justify-center min-h-[120px] w-full bg-secondary/20 rounded-lg p-2 overflow-hidden">
                    <img 
                      src={icon.url} 
                      alt={icon.spec.name} 
                      style={{ 
                        width: `${icon.spec.size}px`, 
                        height: `${icon.spec.size}px`,
                        maxWidth: '100%',
                        maxHeight: '120px'
                      }}
                      className="object-contain bg-background p-1 rounded shadow-sm" 
                    />
                  </div>
                  <div className="flex flex-col items-center gap-1 mt-1 text-center w-full">
                    <span className="text-xs font-medium text-foreground">{icon.spec.size}×{icon.spec.size}</span>
                    <span className="text-[10px] text-muted-foreground truncate w-full px-1" title={icon.spec.name}>{icon.spec.name}</span>
                  </div>
                  <button
                    onClick={() => downloadBlob(icon.blob, icon.spec.name)}
                    className="mt-1 flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-primary bg-primary/10 rounded-md hover:bg-primary/20 transition-colors w-full justify-center"
                  >
                    <Download className="w-3 h-3" /> Download
                  </button>
                </div>
              ))}
            </div>
          )}

          {zipBlob && (
            <button
              onClick={() => downloadBlob(zipBlob, "icons.zip")}
              className="flex items-center gap-2 mt-4 px-4 py-2 bg-secondary text-foreground rounded hover:bg-secondary/80"
            >
              <Download className="w-4 h-4" />
              Download All (ZIP)
            </button>
          )}

          {htmlSnippets && (
            <div className="mt-4">
              <h2 className="font-medium mb-2">HTML <code>&lt;link&gt;</code> Snippets</h2>
              <pre className="bg-muted p-2 rounded overflow-x-auto text-sm whitespace-pre-wrap">
                {htmlSnippets}
              </pre>
              <button
                onClick={() => navigator.clipboard.writeText(htmlSnippets)}
                className="flex items-center gap-1 mt-2 text-sm text-primary hover:underline"
              >
                <ClipboardCopy className="w-3 h-3" /> Copy to Clipboard
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
