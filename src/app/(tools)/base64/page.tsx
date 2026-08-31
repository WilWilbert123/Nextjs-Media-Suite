"use client";

import * as React from "react";
import { Binary, Loader2, Copy, Check } from "lucide-react";
import { FileUploader } from "@/components/common/FileUploader";

export default function Base64Page() {
  const [file, setFile] = React.useState<File | null>(null);
  const [base64, setBase64] = React.useState<string>("");
  const [isProcessing, setIsProcessing] = React.useState(false);
  const [copied, setCopied] = React.useState(false);

  React.useEffect(() => {
    if (file) {
      encodeFile(file);
    } else {
      setBase64("");
      setCopied(false);
    }
  }, [file]);

  const encodeFile = (file: File) => {
    setIsProcessing(true);
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === "string") {
        setBase64(reader.result);
      }
      setIsProcessing(false);
    };
    reader.readAsDataURL(file);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(base64);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const a = document.createElement("a");
    const blob = new Blob([base64], { type: "text/plain" });
    a.href = URL.createObjectURL(blob);
    a.download = `${file?.name}.base64.txt`;
    a.click();
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-6xl mx-auto">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
          <Binary className="w-8 h-8 text-primary" />
          Base64 Encoder
        </h1>
        <p className="text-muted-foreground">
          Convert any media file (images, fonts, small videos) into a Base64 Data URI string for embedding in HTML/CSS.
        </p>
      </div>

      {!file && (
        <FileUploader
          onFileSelect={(f) => setFile(f as File)}
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

          <div className="flex flex-col gap-4">
            {isProcessing ? (
              <div className="flex items-center justify-center py-12 text-muted-foreground gap-2">
                <Loader2 className="w-6 h-6 animate-spin" /> Encoding to Base64...
              </div>
            ) : (
              <>
                <div className="relative">
                  <textarea
                    readOnly
                    value={base64}
                    className="w-full h-64 p-4 rounded-xl border border-border bg-black/5 font-mono text-xs text-muted-foreground resize-none focus:outline-none"
                  />
                  <div className="absolute top-4 right-4 flex gap-2">
                    <button
                      onClick={handleCopy}
                      className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg shadow hover:opacity-90 transition-all text-sm font-medium"
                    >
                      {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      {copied ? "Copied!" : "Copy String"}
                    </button>
                  </div>
                </div>
                
                <div className="flex items-center justify-between px-2 text-sm text-muted-foreground">
                  <p>Length: {base64.length.toLocaleString()} characters</p>
                  <button onClick={handleDownload} className="hover:text-foreground underline">
                    Download as .txt
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
