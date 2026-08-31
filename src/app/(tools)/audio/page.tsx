"use client";

import * as React from "react";
import { FileUploader } from "@/components/common/FileUploader";
import { useMediaEngine } from "@/hooks/useMediaEngine";
import { Download, RefreshCw, Music, Loader2 } from "lucide-react";

export default function AudioExtractorPage() {
  const [file, setFile] = React.useState<File | null>(null);
  const [resultUrl, setResultUrl] = React.useState<string | null>(null);
  const [format, setFormat] = React.useState<string>("mp3");
  const [quality, setQuality] = React.useState<string>("192k");
  const [volume, setVolume] = React.useState<string>("1.0");
  const [bass, setBass] = React.useState<string>("none");
  const [outputExt, setOutputExt] = React.useState<string>(".mp3");
  
  const { isReady, isProcessing, progress, error, convertVideo } = useMediaEngine();

  const handleProcess = async () => {
    if (!file) return;
    
    const args = ["-vn"];
    
    if (format === "mp3") {
      args.push("-c:a", "libmp3lame", "-b:a", quality);
    } else if (format === "wav") {
      args.push("-c:a", "pcm_s16le");
    } else if (format === "aac") {
      args.push("-c:a", "aac", "-b:a", quality);
    }

    const filters = [];
    if (volume !== "1.0") {
      filters.push(`volume=${volume}`);
    }
    
    if (bass === "light") {
      filters.push("bass=g=5:f=110:w=0.6");
    } else if (bass === "heavy") {
      filters.push("bass=g=10:f=110:w=0.6");
    }
    
    if (filters.length > 0) {
      args.push("-af", filters.join(","));
    }

    const ext = `.${format}`;

    const url = await convertVideo(file, args, ext);
    if (url) {
      setResultUrl(url);
      setOutputExt(ext);
    }
  };

  const handleReset = () => {
    if (resultUrl) {
      URL.revokeObjectURL(resultUrl);
    }
    setResultUrl(null);
    setFile(null);
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-4xl mx-auto">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
          <Music className="w-8 h-8 text-primary" />
          Audio Extractor
        </h1>
        <p className="text-muted-foreground">
          Extract high-quality MP3 audio from any video file instantly in your browser.
        </p>
      </div>

      {!isReady && (
        <div className="p-8 border border-border rounded-xl bg-card flex flex-col items-center justify-center gap-4 text-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Initializing WebAssembly Media Engine...</p>
        </div>
      )}

      {isReady && !file && (
        <FileUploader
          onFileSelect={(f) => setFile(f as File)}
          accept="video/mp4,video/webm,video/quicktime"
          description="Supports MP4, WebM"
          placeholder="Paste a direct video URL (e.g., .mp4)..."
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

          {!isProcessing ? (
            <div className="flex flex-col gap-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Format Control */}
                <div className="flex flex-col gap-2 bg-muted/30 p-4 rounded-xl border border-border">
                  <label className="text-sm font-medium">Output Format</label>
                  <select
                    value={format}
                    onChange={(e) => setFormat(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg border border-border bg-background"
                  >
                    <option value="mp3">MP3 (Universal)</option>
                    <option value="wav">WAV (Lossless)</option>
                    <option value="aac">AAC (High Efficiency)</option>
                  </select>
                </div>

                {/* Quality Control */}
                <div className="flex flex-col gap-2 bg-muted/30 p-4 rounded-xl border border-border">
                  <label className="text-sm font-medium">Audio Bitrate</label>
                  <select
                    value={quality}
                    onChange={(e) => setQuality(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg border border-border bg-background"
                    disabled={format === "wav"}
                  >
                    <option value="320k">320 kbps (Highest)</option>
                    <option value="256k">256 kbps (High)</option>
                    <option value="192k">192 kbps (Standard)</option>
                    <option value="128k">128 kbps (Low)</option>
                  </select>
                </div>

                {/* Volume Control */}
                <div className="flex flex-col gap-2 bg-muted/30 p-4 rounded-xl border border-border">
                  <label className="text-sm font-medium">Volume Adjust</label>
                  <select
                    value={volume}
                    onChange={(e) => setVolume(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg border border-border bg-background"
                  >
                    <option value="0.5">50% (Quieter)</option>
                    <option value="1.0">100% (Normal)</option>
                    <option value="1.5">150% (Louder)</option>
                    <option value="2.0">200% (Much Louder)</option>
                  </select>
                </div>

                {/* Bass Boost */}
                <div className="flex flex-col gap-2 bg-muted/30 p-4 rounded-xl border border-border">
                  <label className="text-sm font-medium">Bass Boost</label>
                  <select
                    value={bass}
                    onChange={(e) => setBass(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg border border-border bg-background"
                  >
                    <option value="none">None</option>
                    <option value="light">Light Boost</option>
                    <option value="heavy">Heavy Boost</option>
                  </select>
                </div>
              </div>

              <button
                onClick={handleProcess}
                className="flex items-center justify-center gap-2 p-4 rounded-lg bg-primary text-primary-foreground font-medium hover:opacity-90 active:scale-95 transition-all w-full"
              >
                Extract Audio ({format.toUpperCase()})
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 gap-4">
              <div className="w-16 h-16 relative flex items-center justify-center">
                <svg className="animate-spin w-full h-full text-primary" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span className="absolute text-xs font-bold">{Math.round(progress * 100)}%</span>
              </div>
              <p className="text-sm font-medium animate-pulse">Extracting audio stream...</p>
            </div>
          )}

          {error && (
            <div className="p-4 bg-destructive/10 text-destructive border border-destructive rounded-lg text-sm font-medium">
              Error: {error}
            </div>
          )}
        </div>
      )}

      {resultUrl && (
        <div className="flex flex-col gap-6 border border-border rounded-xl bg-card p-6">
          <div className="w-full bg-black/5 rounded-lg overflow-hidden flex flex-col items-center justify-center min-h-[200px] p-6 gap-4">
            <Music className="w-16 h-16 text-primary" />
            <audio src={resultUrl} controls className="w-full max-w-md" />
          </div>
          
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <a
              href={resultUrl}
              download={`extracted_audio_${Date.now()}${outputExt}`}
              className="w-full sm:w-auto flex-1 flex items-center justify-center gap-2 p-4 rounded-lg bg-primary text-primary-foreground font-medium hover:opacity-90 active:scale-95 transition-all"
            >
              <Download className="w-5 h-5" />
              Download {outputExt.slice(1).toUpperCase()}
            </a>
            <button
              onClick={handleReset}
              className="w-full sm:w-auto flex items-center justify-center gap-2 p-4 rounded-lg border border-border hover:bg-muted font-medium transition-all"
            >
              <RefreshCw className="w-5 h-5" />
              Start Over
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
