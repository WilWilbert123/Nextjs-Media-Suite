"use client";

import * as React from "react";
import { RefreshCw, Loader2, Download, Settings2, RotateCcw, Play, Repeat, ArrowRightLeft } from "lucide-react";
import { FileUploader } from "@/components/common/FileUploader";
import { useMediaEngine } from "@/hooks/useMediaEngine";

type LoopMode = "pingpong" | "repeat" | "reverse";

export default function LoopPage() {
  const [file, setFile] = React.useState<File | null>(null);
  const [resultUrl, setResultUrl] = React.useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null);
  
  // Settings
  const [mode, setMode] = React.useState<LoopMode>("pingpong");
  const [loopCount, setLoopCount] = React.useState<number>(1);
  
  const { isReady, isProcessing, progress, error, engine } = useMediaEngine();
  
  // Debounce ref for auto-processing
  const timeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  // Initialize preview when file is uploaded
  React.useEffect(() => {
    if (file) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      setResultUrl(url); // initially show original
      
      // Auto-trigger first process
      handleProcess();
      
      return () => {
        URL.revokeObjectURL(url);
      };
    } else {
      setPreviewUrl(null);
      setResultUrl(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file]);

  // Auto-process on settings change
  React.useEffect(() => {
    if (file && isReady && !isProcessing) {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        handleProcess();
      }, 800); // 800ms debounce
    }
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, loopCount]);

  const handleProcess = async () => {
    if (!file || !engine.current) return;
    
    try {
      const ext = file.name.split('.').pop()?.toLowerCase() || 'mp4';
      const outputName = 'loop_output.' + ext;
      
      const fileData = await file.arrayBuffer();
      await engine.current.writeFile('input.' + ext, new Uint8Array(fileData));
      
      let command: string[] = [];

      if (mode === "pingpong") {
        // Forward then backward. If loopCount > 1, we must duplicate it.
        // For simplicity in ffmpeg, a single ping pong is: [0:v]reverse[r];[0:v][r]concat=n=2:v=1:a=0
        // To loop that N times, we can use stream_loop on the result, but FFmpeg stream_loop can be tricky with complex filters.
        // Alternative: we build a complex filter.
        let filter = `[0:v]reverse[r];[0:v][r]concat=n=2:v=1:a=0[pp];`;
        let concatStr = ``;
        for(let i=0; i<loopCount; i++) {
            // we can't easily reuse [pp] multiple times without split.
            // Better to just rely on Ping-Pong 1 time for the WASM preview, 
            // and let the browser's "loop" attribute handle infinite looping visually.
            // But if the user wants hardcoded file loops:
        }
        
        // Let's just create 1 ping-pong and loop it with -stream_loop if count > 1
        // Wait, -stream_loop goes BEFORE the input.
        // Actually, Ping pong itself is inherently looped by the browser. 
        // If they want the actual file to contain multiple iterations:
        command = [
          '-stream_loop', (loopCount - 1).toString(),
          '-i', 'input.' + ext,
          '-filter_complex', '[0:v]reverse[r];[0:v][r]concat=n=2:v=1:a=0',
          '-y', outputName
        ];
      } else if (mode === "repeat") {
        command = [
          '-stream_loop', loopCount.toString(),
          '-i', 'input.' + ext,
          '-c', 'copy',
          '-y', outputName
        ];
      } else if (mode === "reverse") {
        command = [
          '-stream_loop', (loopCount - 1).toString(),
          '-i', 'input.' + ext,
          '-vf', 'reverse',
          '-af', 'areverse',
          '-y', outputName
        ];
      }
      
      await engine.current.exec(command);
      
      const data = await engine.current.readFile(outputName);
      const blob = new Blob([data], { type: ext === 'gif' ? 'image/gif' : 'video/mp4' });
      
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
  };

  return (
    <div className="flex flex-col gap-4 w-full max-w-6xl mx-auto p-4 glass-card smooth-show h-[calc(100vh-6rem)]">
      <div className="flex flex-col gap-1 text-center items-center">
        <div className="w-12 h-12 rounded-2xl bg-secondary flex items-center justify-center mb-1 smooth-shadow">
          <RefreshCw className="w-6 h-6 text-foreground" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight">Seamless Loop Seamer</h1>
        <p className="text-sm text-muted-foreground">
          Create perfectly smooth boomerang loops and repeating sequences.
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
            accept="video/*,image/gif"
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

            <div className="flex-1 bg-black/5 rounded-xl border border-border/40 flex items-center justify-center p-2 relative pattern-dots overflow-hidden min-h-0">
              {isProcessing && (
                <div className="absolute inset-0 z-10 bg-background/50 backdrop-blur-sm flex flex-col items-center justify-center gap-3">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  <span className="font-bold text-sm bg-background px-3 py-1 rounded-full shadow-sm">
                    Processing... {Math.round(progress * 100)}%
                  </span>
                </div>
              )}
              
              {resultUrl && (
                file.type.includes("video") ? (
                  <video 
                    src={resultUrl} 
                    autoPlay 
                    loop 
                    controls 
                    className="max-w-full max-h-full object-contain rounded shadow-lg"
                  />
                ) : (
                  <img 
                    src={resultUrl} 
                    alt="Looped Preview" 
                    className="max-w-full max-h-full object-contain rounded shadow-lg" 
                  />
                )
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
            
            <div className="flex flex-col gap-4 bg-secondary/30 p-4 rounded-xl border border-border/50">
              <div className="flex items-center gap-2 pb-2 border-b border-border/50">
                <Settings2 className="w-4 h-4 text-primary" />
                <h3 className="font-bold text-sm">Loop Settings</h3>
              </div>

              {/* Mode Selection */}
              <div className="flex flex-col gap-3">
                <label className="text-xs font-bold text-muted-foreground">Loop Technique</label>
                <div className="grid grid-cols-1 gap-2">
                  <button
                    onClick={() => setMode("pingpong")}
                    className={`flex items-center gap-3 p-3 rounded-lg border text-left transition-all ${
                      mode === "pingpong" ? "bg-background border-primary shadow-sm" : "bg-card border-border/50 hover:border-border"
                    }`}
                  >
                    <ArrowRightLeft className={`w-4 h-4 ${mode === "pingpong" ? "text-primary" : "text-muted-foreground"}`} />
                    <div className="flex flex-col">
                      <span className="text-sm font-bold">Ping-Pong (Boomerang)</span>
                      <span className="text-[10px] text-muted-foreground">Forward then reverse. 100% seamless.</span>
                    </div>
                  </button>

                  <button
                    onClick={() => setMode("repeat")}
                    className={`flex items-center gap-3 p-3 rounded-lg border text-left transition-all ${
                      mode === "repeat" ? "bg-background border-primary shadow-sm" : "bg-card border-border/50 hover:border-border"
                    }`}
                  >
                    <Repeat className={`w-4 h-4 ${mode === "repeat" ? "text-primary" : "text-muted-foreground"}`} />
                    <div className="flex flex-col">
                      <span className="text-sm font-bold">Standard Repeat</span>
                      <span className="text-[10px] text-muted-foreground">Plays forward, hard cuts back to start.</span>
                    </div>
                  </button>

                  <button
                    onClick={() => setMode("reverse")}
                    className={`flex items-center gap-3 p-3 rounded-lg border text-left transition-all ${
                      mode === "reverse" ? "bg-background border-primary shadow-sm" : "bg-card border-border/50 hover:border-border"
                    }`}
                  >
                    <RotateCcw className={`w-4 h-4 ${mode === "reverse" ? "text-primary" : "text-muted-foreground"}`} />
                    <div className="flex flex-col">
                      <span className="text-sm font-bold">Reverse Only</span>
                      <span className="text-[10px] text-muted-foreground">Plays the media entirely backwards.</span>
                    </div>
                  </button>
                </div>
              </div>

              {/* Multiplier */}
              <div className="flex flex-col gap-3 pt-2">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold text-muted-foreground">Write loops into file</label>
                  <span className="text-xs font-mono bg-background px-2 py-1 rounded border border-border">
                    {loopCount}x
                  </span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="10"
                  step="1"
                  value={loopCount}
                  onChange={(e) => setLoopCount(parseInt(e.target.value))}
                  className="w-full accent-primary"
                />
                <p className="text-[10px] text-muted-foreground leading-tight">
                  How many times should the sequence repeat inside the actual exported file? (1x means it relies on the player to loop).
                </p>
              </div>

            </div>

            <div className="mt-auto">
               <a
                href={resultUrl || ""}
                download={`looped_media_${mode}.${file.name.split('.').pop()}`}
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
