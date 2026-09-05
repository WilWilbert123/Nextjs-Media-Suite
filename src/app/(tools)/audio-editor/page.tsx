"use client";

import * as React from "react";
import { AudioLines, Loader2, Download, Settings2, SlidersHorizontal, Music, Volume2, Mic2 } from "lucide-react";
import { FileUploader } from "@/components/common/FileUploader";
import { useMediaEngine } from "@/hooks/useMediaEngine";

export default function AudioEditorPage() {
  const [file, setFile] = React.useState<File | null>(null);
  const [resultUrl, setResultUrl] = React.useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null);
  
  // Settings
  const [speed, setSpeed] = React.useState<number>(1.0);
  const [pitch, setPitch] = React.useState<number>(1.0);
  const [volume, setVolume] = React.useState<number>(1.0);
  const [bassBoost, setBassBoost] = React.useState<number>(0);
  const [exportFormat, setExportFormat] = React.useState<"mp3" | "wav" | "aac">("mp3");
  
  const { isReady, isProcessing, progress, error, engine } = useMediaEngine();
  const timeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  // Initialization
  React.useEffect(() => {
    if (file) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      setResultUrl(url); // Show original initially
      
      // Auto-trigger first process
      handleProcess();
      
      return () => URL.revokeObjectURL(url);
    } else {
      setPreviewUrl(null);
      setResultUrl(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file]);

  // Auto-process on settings change (with 800ms debounce)
  React.useEffect(() => {
    if (file && isReady && !isProcessing) {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        handleProcess();
      }, 800);
    }
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [speed, pitch, volume, bassBoost, exportFormat]);

  const handleProcess = async () => {
    if (!file || !engine.current) return;
    
    try {
      const inputExt = file.name.split('.').pop()?.toLowerCase() || 'mp3';
      const outputName = 'output.' + exportFormat;
      
      const fileData = await file.arrayBuffer();
      await engine.current.writeFile('input.' + inputExt, new Uint8Array(fileData));
      
      let filters = [];
      
      // Pitch & Speed Matrix
      // asetrate changes both Pitch AND Speed.
      // to fix the Speed, we must use atempo to counterbalance it.
      const targetAtempo = speed / pitch;
      filters.push(`asetrate=44100*${pitch}`);
      
      // atempo has limits (0.5 to 100.0). If it exceeds, we can chain multiple atempos, but for 
      // simplicity, we'll bound it to 0.5 - 2.0 in the UI so a single atempo always works.
      filters.push(`atempo=${targetAtempo}`);
      
      if (volume !== 1.0) {
        filters.push(`volume=${volume}`);
      }
      
      if (bassBoost > 0) {
        filters.push(`bass=g=${bassBoost}:f=110:w=0.6`);
      }
      
      const filterStr = filters.join(',');
      
      const command = [
        '-i', 'input.' + inputExt,
        '-filter:a', filterStr,
        '-y', outputName
      ];
      
      await engine.current.exec(command);
      
      const data = await engine.current.readFile(outputName);
      
      let mimeType = 'audio/mpeg';
      if (exportFormat === 'wav') mimeType = 'audio/wav';
      if (exportFormat === 'aac') mimeType = 'audio/aac';

      const blob = new Blob([data as BlobPart], { type: mimeType });
      
      if (resultUrl && resultUrl !== previewUrl) {
        URL.revokeObjectURL(resultUrl);
      }
      setResultUrl(URL.createObjectURL(blob));
      
    } catch (err: any) {
      console.error(err);
    }
  };

  const handleReset = () => {
    if (resultUrl && resultUrl !== previewUrl) URL.revokeObjectURL(resultUrl);
    setResultUrl(null);
    setFile(null);
    setSpeed(1.0);
    setPitch(1.0);
    setVolume(1.0);
    setBassBoost(0);
  };

  return (
    <div className="flex flex-col gap-4 w-full max-w-6xl mx-auto p-4 glass-card smooth-show h-[calc(100vh-6rem)]">
      <div className="flex flex-col gap-1 text-center items-center">
        <div className="w-12 h-12 rounded-2xl bg-secondary flex items-center justify-center mb-1 smooth-shadow">
          <AudioLines className="w-6 h-6 text-foreground" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight">Audio Editor Studio</h1>
        <p className="text-sm text-muted-foreground">
          Manipulate playback speed, pitch shift, bass boost, and volume entirely in your browser.
        </p>
      </div>

      {!isReady && (
        <div className="flex-1 border border-border rounded-xl bg-card flex flex-col items-center justify-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-muted-foreground font-medium">Initializing Engine...</p>
        </div>
      )}

      {isReady && !file && (
        <div className="flex-1 flex items-center justify-center min-h-[300px]">
          <FileUploader
            onFileSelect={(f) => setFile(Array.isArray(f) ? f[0] : f)}
            accept="audio/*,video/*"
          />
        </div>
      )}

      {file && (
        <div className="flex-1 flex flex-col lg:flex-row gap-6 min-h-0 bg-card border border-border/50 rounded-2xl p-4 md:p-6 smooth-shadow">
          
          {/* LEFT: Preview Area */}
          <div className="flex-1 flex flex-col gap-4 min-w-0 h-full relative">
            <div className="flex items-center justify-between">
              <div className="min-w-0 pr-4">
                <p className="font-bold truncate">{file.name}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
              </div>
              <button
                onClick={handleReset}
                className="text-xs font-bold text-muted-foreground hover:text-foreground underline underline-offset-4 whitespace-nowrap"
              >
                Change File
              </button>
            </div>

            <div className="flex-1 bg-black/5 rounded-xl border border-border/40 flex flex-col items-center justify-center p-8 relative pattern-dots overflow-hidden min-h-0">
              {isProcessing && (
                <div className="absolute inset-0 z-10 bg-background/50 backdrop-blur-sm flex flex-col items-center justify-center gap-3">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  <span className="font-bold text-sm bg-background px-3 py-1 rounded-full shadow-sm">
                    Processing... {Math.round(progress * 100)}%
                  </span>
                </div>
              )}
              
              <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center mb-8 shadow-inner border border-primary/20">
                <Music className="w-10 h-10 text-primary" />
              </div>
              
              {resultUrl && (
                <audio 
                  src={resultUrl} 
                  controls 
                  className="w-full max-w-md shadow-lg rounded-full bg-background"
                />
              )}
            </div>
            
            {error && (
              <p className="text-xs text-destructive text-center p-2 bg-destructive/10 rounded-lg">
                {error}
              </p>
            )}
          </div>

          {/* RIGHT: Controls */}
          <div className="w-full lg:w-80 flex flex-col gap-6 overflow-y-auto pr-1">
            
            <div className="flex flex-col gap-5 bg-secondary/30 p-4 rounded-xl border border-border/50">
              <div className="flex items-center gap-2 pb-2 border-b border-border/50">
                <Settings2 className="w-4 h-4 text-primary" />
                <h3 className="font-bold text-sm">Audio Settings</h3>
              </div>

              {/* Speed */}
              <div className="flex flex-col gap-2">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold text-muted-foreground flex items-center gap-1.5"><SlidersHorizontal className="w-3.5 h-3.5" /> Playback Speed</label>
                  <span className="text-xs font-mono bg-background px-2 py-0.5 rounded border border-border">{speed.toFixed(2)}x</span>
                </div>
                <input
                  type="range" min="0.5" max="2.0" step="0.05" value={speed}
                  onChange={(e) => setSpeed(Number(e.target.value))}
                  className="w-full accent-primary"
                />
                <p className="text-[10px] text-muted-foreground">Speed up or slow down the audio without affecting pitch.</p>
              </div>

              {/* Pitch */}
              <div className="flex flex-col gap-2 pt-2 border-t border-border/50">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold text-muted-foreground flex items-center gap-1.5"><Mic2 className="w-3.5 h-3.5" /> Pitch Shift</label>
                  <span className="text-xs font-mono bg-background px-2 py-0.5 rounded border border-border">{pitch.toFixed(2)}x</span>
                </div>
                <input
                  type="range" min="0.5" max="2.0" step="0.05" value={pitch}
                  onChange={(e) => setPitch(Number(e.target.value))}
                  className="w-full accent-primary"
                />
                <p className="text-[10px] text-muted-foreground">Raise or lower the pitch tone without affecting the speed.</p>
              </div>

              {/* Volume */}
              <div className="flex flex-col gap-2 pt-2 border-t border-border/50">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold text-muted-foreground flex items-center gap-1.5"><Volume2 className="w-3.5 h-3.5" /> Volume Boost</label>
                  <span className="text-xs font-mono bg-background px-2 py-0.5 rounded border border-border">{Math.round(volume * 100)}%</span>
                </div>
                <input
                  type="range" min="0.0" max="3.0" step="0.1" value={volume}
                  onChange={(e) => setVolume(Number(e.target.value))}
                  className="w-full accent-primary"
                />
              </div>

              {/* Bass Boost */}
              <div className="flex flex-col gap-2 pt-2 border-t border-border/50">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold text-muted-foreground">Deep Bass EQ</label>
                  <span className="text-xs font-mono bg-background px-2 py-0.5 rounded border border-border">+{bassBoost} dB</span>
                </div>
                <input
                  type="range" min="0" max="20" step="1" value={bassBoost}
                  onChange={(e) => setBassBoost(Number(e.target.value))}
                  className="w-full accent-primary"
                />
                <p className="text-[10px] text-muted-foreground">Boost the low-end frequencies (110Hz).</p>
              </div>

              {/* Export Format */}
              <div className="flex flex-col gap-2 pt-2 border-t border-border/50">
                <label className="text-xs font-bold text-muted-foreground">Export Format</label>
                <div className="flex gap-2">
                  {['mp3', 'wav', 'aac'].map((fmt) => (
                    <button
                      key={fmt}
                      onClick={() => setExportFormat(fmt as "mp3" | "wav" | "aac")}
                      className={`flex-1 py-1.5 text-xs font-bold rounded-lg border transition-all ${
                        exportFormat === fmt ? "bg-primary text-primary-foreground border-primary shadow-sm" : "bg-card border-border/50 hover:border-border text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      .{fmt.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>

            </div>

            <div className="mt-auto">
               <a
                href={resultUrl || ""}
                download={`edited_audio_${Date.now()}.${exportFormat}`}
                onClick={(e) => {
                  if (!resultUrl || isProcessing) e.preventDefault();
                }}
                className={`w-full py-4 rounded-xl flex items-center justify-center gap-2 font-bold transition-all shadow-md ${
                  resultUrl && !isProcessing
                    ? "bg-foreground text-background hover:bg-foreground/90 active:scale-[0.98]" 
                    : "bg-secondary text-muted-foreground cursor-not-allowed"
                }`}
              >
                <Download className="w-5 h-5" /> 
                Export File
              </a>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
