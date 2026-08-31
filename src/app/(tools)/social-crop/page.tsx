"use client";

import * as React from "react";
import { Crop, Loader2 } from "lucide-react";
import { FileUploader } from "@/components/common/FileUploader";
import { useMediaEngine } from "@/hooks/useMediaEngine";

export default function SocialCropPage() {
  const [file, setFile] = React.useState<File | null>(null);
  const [preset, setPreset] = React.useState<"9:16" | "1:1" | "16:9">("9:16");
  const { isReady, isProcessing, progress, error, convertVideo, resultUrl, reset } = useMediaEngine();

  const handleProcess = () => {
    if (!file) return;
    
    let filter = "";
    if (preset === "9:16") {
      // 1080x1920 (TikTok, Reels, Shorts)
      filter = "scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2";
    } else if (preset === "1:1") {
      // 1080x1080 (Instagram Feed)
      filter = "scale=1080:1080:force_original_aspect_ratio=decrease,pad=1080:1080:(ow-iw)/2:(oh-ih)/2";
    } else if (preset === "16:9") {
      // 1920x1080 (YouTube)
      filter = "scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2";
    }

    convertVideo(file, [filter], file.name.split('.').pop()?.toLowerCase() || 'mp4');
  };

  const handleReset = () => {
    reset();
    setFile(null);
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-6xl mx-auto">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
          <Crop className="w-8 h-8 text-primary" />
          Social Aspect Ratio Presets
        </h1>
        <p className="text-muted-foreground">
          Automatically crop and pad your videos to perfectly fit TikTok, Reels, Instagram, and YouTube without stretching.
        </p>
      </div>

      {!isReady && (
        <div className="p-8 border border-border rounded-xl bg-card flex flex-col items-center justify-center gap-4 text-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Initializing WebAssembly Engine...</p>
        </div>
      )}

      {isReady && !file && (
        <FileUploader
          onFileSelect={(f) => setFile(f as File)}
          accept="video/*,image/*"
        />
      )}

      {file && !resultUrl && (
        <div className="flex flex-col gap-6 border border-border rounded-xl bg-card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">{file.name}</p>
              <p className="text-sm text-muted-foreground">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
            </div>
            <button
              onClick={handleReset}
              className="text-sm text-muted-foreground hover:text-foreground underline underline-offset-4"
              disabled={isProcessing}
            >
              Choose different file
            </button>
          </div>

          <div className="flex flex-col md:flex-row gap-6">
            <div className="flex-1 flex flex-col gap-4">
              <label className="text-sm font-medium">Select Target Platform Format</label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <button
                  onClick={() => setPreset("9:16")}
                  className={`flex flex-col items-center justify-center gap-2 p-6 rounded-xl border-2 transition-all ${preset === "9:16" ? "border-primary bg-primary/5" : "border-border bg-card hover:border-primary/50"}`}
                >
                  <div className="w-10 h-16 border-2 border-current rounded-sm" />
                  <span className="font-semibold">9:16 (Vertical)</span>
                  <span className="text-xs text-muted-foreground">TikTok, Reels</span>
                </button>
                
                <button
                  onClick={() => setPreset("1:1")}
                  className={`flex flex-col items-center justify-center gap-2 p-6 rounded-xl border-2 transition-all ${preset === "1:1" ? "border-primary bg-primary/5" : "border-border bg-card hover:border-primary/50"}`}
                >
                  <div className="w-16 h-16 border-2 border-current rounded-sm" />
                  <span className="font-semibold">1:1 (Square)</span>
                  <span className="text-xs text-muted-foreground">Instagram Feed</span>
                </button>

                <button
                  onClick={() => setPreset("16:9")}
                  className={`flex flex-col items-center justify-center gap-2 p-6 rounded-xl border-2 transition-all ${preset === "16:9" ? "border-primary bg-primary/5" : "border-border bg-card hover:border-primary/50"}`}
                >
                  <div className="w-20 h-12 border-2 border-current rounded-sm" />
                  <span className="font-semibold">16:9 (Widescreen)</span>
                  <span className="text-xs text-muted-foreground">YouTube, Twitter</span>
                </button>
              </div>
            </div>
            
            <div className="flex flex-col gap-4 justify-center w-full md:w-64 mt-auto">
              <button
                onClick={handleProcess}
                disabled={isProcessing}
                className="flex items-center justify-center gap-2 p-3 rounded-lg bg-primary text-primary-foreground font-medium hover:opacity-90 active:scale-95 transition-all disabled:opacity-50 h-[140px] sm:h-auto"
              >
                {isProcessing ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Framing... {Math.round(progress * 100)}%</>
                ) : "Auto-Frame Media"}
              </button>
              {error && <p className="text-sm text-destructive text-center">{error}</p>}
            </div>
          </div>
        </div>
      )}

      {resultUrl && (
        <div className="flex flex-col gap-6 border border-border rounded-xl bg-card p-6">
          <div className="w-full bg-black/5 rounded-lg flex items-center justify-center min-h-[200px] p-4">
            {file?.type.includes("video") ? (
              <video src={resultUrl} controls autoPlay loop className="max-w-full max-h-[45vh] object-contain rounded-lg shadow-lg" />
            ) : (
              <img src={resultUrl} alt="Framed result" className="max-w-full max-h-[45vh] object-contain rounded-lg shadow-lg" />
            )}
          </div>
          
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <a
              href={resultUrl}
              download={`social_ready_${Date.now()}.${file?.name.split('.').pop()}`}
              className="w-full sm:w-auto flex-1 flex items-center justify-center gap-2 p-4 rounded-lg bg-primary text-primary-foreground font-medium hover:opacity-90 active:scale-95 transition-all"
            >
              Download Ready Media
            </a>
            <button
              onClick={handleReset}
              className="w-full sm:w-auto flex-1 flex items-center justify-center gap-2 p-4 rounded-lg border border-border bg-card text-foreground font-medium hover:bg-secondary/50 active:scale-95 transition-all"
            >
              Frame Another
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
