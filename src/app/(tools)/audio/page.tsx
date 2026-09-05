"use client";

import * as React from "react";
import { FileUploader } from "@/components/common/FileUploader";
import { useMediaEngine } from "@/hooks/useMediaEngine";
import { Download, Music, Loader2, Settings2, Sliders, Volume2, Waves } from "lucide-react";

export default function AudioExtractorPage() {
  const [file, setFile] = React.useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null);
  const [resultUrl, setResultUrl] = React.useState<string | null>(null);
  
  // Settings
  const [format, setFormat] = React.useState<string>("mp3");
  const [quality, setQuality] = React.useState<string>("192k");
  const [volume, setVolume] = React.useState<string>("1.0");
  const [bass, setBass] = React.useState<string>("none");
  const [outputExt, setOutputExt] = React.useState<string>(".mp3");
  
  const { isReady, isProcessing, progress, error, convertVideo } = useMediaEngine();
  const timeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  React.useEffect(() => {
    if (file) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setPreviewUrl(null);
      setResultUrl(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file]);

  React.useEffect(() => {
    // Clear result if user edits settings so they can re-render
    if (resultUrl && resultUrl !== previewUrl) {
      URL.revokeObjectURL(resultUrl);
    }
    setResultUrl(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [format, quality, volume, bass]);

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
      if (resultUrl) URL.revokeObjectURL(resultUrl);
      setResultUrl(url);
      setOutputExt(ext);
    }
  };

  const handleReset = () => {
    if (resultUrl) URL.revokeObjectURL(resultUrl);
    setResultUrl(null);
    setFile(null);
  };

  return (
    <div className="flex flex-col gap-4 w-full max-w-6xl mx-auto p-4 glass-card smooth-show h-[calc(100vh-6rem)]">
      
      <div className="flex flex-col gap-1 text-center items-center shrink-0">
        <div className="w-12 h-12 rounded-2xl bg-secondary flex items-center justify-center mb-1 smooth-shadow">
          <Music className="w-6 h-6 text-foreground" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight">Audio Extractor Studio</h1>
        <p className="text-sm text-muted-foreground">
          Extract, enhance, and preview high-quality audio from any video instantly.
        </p>
      </div>

      {!isReady && (
        <div className="flex-1 border border-border/50 rounded-xl bg-card flex flex-col items-center justify-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-muted-foreground font-medium text-sm">Initializing Media Engine...</p>
        </div>
      )}

      {isReady && !file && (
        <div className="flex-1 flex items-center justify-center min-h-[300px]">
          <FileUploader
            onFileSelect={(f) => setFile(Array.isArray(f) ? f[0] : f)}
            accept="video/mp4,video/webm,video/quicktime,audio/*"
          />
        </div>
      )}

      {isReady && file && (
        <div className="flex-1 flex flex-col md:flex-row gap-6 min-h-0 bg-card border border-border/50 rounded-2xl p-4 md:p-6 smooth-shadow">
          
          {/* LEFT: Live Preview */}
          <div className="flex-[3] flex flex-col gap-4 min-w-0 h-full relative">
            <div className="flex items-center justify-between border-b border-border/50 pb-3 shrink-0">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <Music className="w-4 h-4 text-primary" /> Audio Preview
              </h3>
              <div className="flex items-center gap-4">
                <div className="flex flex-col items-end">
                  <p className="font-bold text-xs truncate max-w-[150px]">{file.name}</p>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                </div>
                <button
                  onClick={handleReset}
                  className="text-[10px] font-bold text-muted-foreground hover:text-foreground underline underline-offset-4 uppercase tracking-wider"
                >
                  Change
                </button>
              </div>
            </div>

            <div className="flex-1 bg-black/5 rounded-xl border border-border/50 flex flex-col items-center justify-center p-8 relative pattern-dots overflow-hidden min-h-0 smooth-shadow">
              
              {isProcessing && (
                <div className="absolute top-2 left-2 z-50 bg-background/80 backdrop-blur-md px-2 py-1 rounded-full border border-border/50 flex items-center gap-1.5 shadow-sm">
                  <Loader2 className="w-3 h-3 animate-spin text-primary" />
                  <span className="text-[10px] font-bold text-muted-foreground">
                    {Math.round(progress * 100)}%
                  </span>
                </div>
              )}

              {(resultUrl || previewUrl) && (
                <div className="w-full flex flex-col items-center justify-center gap-8 relative z-10">
                  <div className={`w-32 h-32 rounded-full flex items-center justify-center bg-gradient-to-tr from-primary/20 to-primary/5 border border-primary/20 shadow-2xl relative ${isProcessing ? 'opacity-50' : 'animate-pulse'}`}>
                    <Music className="w-12 h-12 text-primary" />
                    
                    {/* Decorative sound waves */}
                    <div className="absolute inset-0 rounded-full border border-primary/30 animate-ping" style={{ animationDuration: '3s' }} />
                    <div className="absolute inset-[-10px] rounded-full border border-primary/10 animate-ping" style={{ animationDuration: '2s', animationDelay: '0.5s' }} />
                  </div>
                  
                  <div className="w-full max-w-md bg-background/50 backdrop-blur p-4 rounded-2xl border border-border/50 shadow-lg">
                    <audio 
                      src={resultUrl || previewUrl!} 
                      controls 
                      autoPlay 
                      className="w-full h-12 custom-audio-player" 
                    />
                  </div>
                </div>
              )}
            </div>
            
            {error && (
              <p className="text-xs text-destructive text-center p-2 bg-destructive/10 rounded-lg">
                {error}
              </p>
            )}
          </div>

          {/* RIGHT: Controls */}
          <div className="flex-[2] flex flex-col gap-4 min-w-0 h-full overflow-y-auto pr-1 custom-scrollbar">
            
            {/* Format Selection */}
            <div className="flex bg-background p-1 rounded-xl border border-border/50 shrink-0">
               <button
                  onClick={() => setFormat("mp3")}
                  className={`flex-1 py-2 text-xs font-bold uppercase rounded-lg transition-all ${
                    format === "mp3" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  .MP3
                </button>
                <button
                  onClick={() => setFormat("wav")}
                  className={`flex-1 py-2 text-xs font-bold uppercase rounded-lg transition-all ${
                    format === "wav" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  .WAV
                </button>
                <button
                  onClick={() => setFormat("aac")}
                  className={`flex-1 py-2 text-xs font-bold uppercase rounded-lg transition-all ${
                    format === "aac" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  .AAC
                </button>
            </div>

            {/* Quality (Bitrate) */}
            <div className="flex flex-col gap-4 bg-secondary/30 p-4 rounded-xl border border-border/50">
              <div className="flex items-center gap-2 pb-2 border-b border-border/50">
                <Sliders className="w-4 h-4 text-primary" />
                <h3 className="font-bold text-sm">Encoding Quality</h3>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-bold uppercase text-muted-foreground">Audio Bitrate</label>
                <select
                  value={quality}
                  onChange={(e) => setQuality(e.target.value)}
                  className="w-full h-9 px-3 text-xs font-medium rounded-lg border border-border bg-background focus:ring-1 focus:ring-primary/50 outline-none disabled:opacity-50"
                  disabled={format === "wav"}
                >
                  <option value="320k">320 kbps (Studio Highest)</option>
                  <option value="256k">256 kbps (High Quality)</option>
                  <option value="192k">192 kbps (Standard)</option>
                  <option value="128k">128 kbps (Low Size)</option>
                </select>
                {format === "wav" && (
                  <p className="text-[10px] text-muted-foreground">Bitrate is locked for lossless WAV.</p>
                )}
              </div>
            </div>

            {/* Audio Enhancements */}
            <div className="flex flex-col gap-4 bg-secondary/30 p-4 rounded-xl border border-border/50">
              <div className="flex items-center gap-2 pb-2 border-b border-border/50">
                <Waves className="w-4 h-4 text-primary" />
                <h3 className="font-bold text-sm">Enhancements</h3>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-bold uppercase text-muted-foreground flex items-center gap-1">
                  <Volume2 className="w-3 h-3" /> Volume Adjust
                </label>
                <select
                  value={volume}
                  onChange={(e) => setVolume(e.target.value)}
                  className="w-full h-9 px-3 text-xs font-medium rounded-lg border border-border bg-background focus:ring-1 focus:ring-primary/50 outline-none"
                >
                  <option value="0.5">50% (Quieter)</option>
                  <option value="1.0">100% (Normal)</option>
                  <option value="1.5">150% (Louder)</option>
                  <option value="2.0">200% (Much Louder)</option>
                </select>
              </div>

              <div className="flex flex-col gap-2 pt-2 border-t border-border/50">
                <label className="text-[10px] font-bold uppercase text-muted-foreground">Bass Boost Profile</label>
                <select
                  value={bass}
                  onChange={(e) => setBass(e.target.value)}
                  className="w-full h-9 px-3 text-xs font-medium rounded-lg border border-border bg-background focus:ring-1 focus:ring-primary/50 outline-none"
                >
                  <option value="none">Flat (No Boost)</option>
                  <option value="light">Light Boost (+5dB)</option>
                  <option value="heavy">Heavy Boost (+10dB)</option>
                </select>
              </div>
            </div>

            <div className="mt-auto shrink-0 pt-2 flex flex-col gap-3">
              {!resultUrl ? (
                <button
                  onClick={handleProcess}
                  disabled={isProcessing}
                  className="w-full flex items-center justify-center gap-2 py-4 rounded-xl font-bold transition-all shadow-md bg-primary text-primary-foreground hover:opacity-90 active:scale-95 disabled:opacity-50"
                >
                  {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Music className="w-5 h-5" />}
                  {isProcessing ? "Extracting..." : "Apply & Extract"}
                </button>
              ) : (
                <a
                  href={resultUrl}
                  download={`audio_studio_output_${Date.now()}${outputExt}`}
                  className="w-full py-4 rounded-xl flex items-center justify-center gap-2 font-bold transition-all shadow-md bg-foreground text-background hover:bg-foreground/90 active:scale-[0.98]"
                >
                  <Download className="w-5 h-5" /> 
                  Download {outputExt.toUpperCase()}
                </a>
              )}
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
