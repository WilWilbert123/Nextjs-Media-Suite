"use client";

import * as React from "react";
import { Sparkles, Loader2, GripVertical } from "lucide-react";
import { FileUploader } from "@/components/common/FileUploader";
import { useMediaEngine } from "@/hooks/useMediaEngine";

function BeforeAfterSlider({ beforeUrl, afterUrl, isVideo }: { beforeUrl: string, afterUrl: string, isVideo: boolean }) {
  const [position, setPosition] = React.useState(50);
  
  return (
    <div className="relative w-full h-[45vh] rounded-lg overflow-hidden select-none group">
      {/* Base: After (Upscaled) */}
      {isVideo ? (
        <video src={afterUrl} autoPlay loop muted playsInline className="absolute inset-0 w-full h-full object-contain pointer-events-none" />
      ) : (
        <img src={afterUrl} alt="After" className="absolute inset-0 w-full h-full object-contain pointer-events-none" />
      )}
      
      {/* Overlay: Before (Original) */}
      <div 
        className="absolute inset-0 w-full h-full pointer-events-none"
        style={{ clipPath: `inset(0 ${100 - position}% 0 0)` }}
      >
        {isVideo ? (
          <video src={beforeUrl} autoPlay loop muted playsInline className="absolute inset-0 w-full h-full object-contain" />
        ) : (
          <img src={beforeUrl} alt="Before" className="absolute inset-0 w-full h-full object-contain" />
        )}
      </div>

      {/* Slider thumb line */}
      <div 
        className="absolute top-0 bottom-0 w-[2px] bg-white drop-shadow-md z-10 flex items-center justify-center pointer-events-none"
        style={{ left: `calc(${position}% - 1px)` }}
      >
         <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-lg border border-black/10 text-black">
           <GripVertical className="w-4 h-4" />
         </div>
      </div>

      {/* Invisible Native Range Input */}
      <input 
        type="range" 
        min="0" max="100" 
        value={position} 
        onChange={(e) => setPosition(Number(e.target.value))}
        className="absolute inset-0 w-full h-full opacity-0 cursor-ew-resize z-20"
      />
      
      {/* Labels */}
      <div className="absolute top-4 left-4 z-10 bg-black/50 backdrop-blur-md text-white text-xs font-bold px-2 py-1 rounded pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
        BEFORE
      </div>
      <div className="absolute top-4 right-4 z-10 bg-primary/80 backdrop-blur-md text-primary-foreground text-xs font-bold px-2 py-1 rounded pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
        AFTER (UPSCALED)
      </div>
    </div>
  );
}

export default function UpscalePage() {
  const [file, setFile] = React.useState<File | null>(null);
  const [fileUrl, setFileUrl] = React.useState<string | null>(null);
  const [scale, setScale] = React.useState<number>(2);
  const [algo, setAlgo] = React.useState<string>("lanczos");
  const [sharpen, setSharpen] = React.useState<string>("medium");
  const [noise, setNoise] = React.useState<string>("none");
  const [resultUrl, setResultUrl] = React.useState<string | null>(null);
  const { isReady, isProcessing, progress, error, convertVideo } = useMediaEngine();

  React.useEffect(() => {
    if (file) {
      const url = URL.createObjectURL(file);
      setFileUrl(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setFileUrl(null);
    }
  }, [file]);

  const handleProcess = async () => {
    if (!file) return;
    
    let filter = "";
    
    // Noise reduction (hqdn3d)
    if (noise === "light") filter += "hqdn3d=1.5:1.5:6:6,";
    if (noise === "heavy") filter += "hqdn3d=3:3:12:12,";
    
    // Upscale
    filter += `scale=trunc(iw*${scale}/2)*2:trunc(ih*${scale}/2)*2:flags=${algo}`;
    
    // Sharpening (unsharp)
    if (sharpen === "light") filter += ",unsharp=3:3:0.5:3:3:0.0";
    if (sharpen === "medium") filter += ",unsharp=5:5:1.0:5:5:0.0";
    if (sharpen === "heavy") filter += ",unsharp=7:7:1.5:7:7:0.0";

    const ext = file.name.split('.').pop()?.toLowerCase() || 'mp4';
    const isVideo = file.type.includes('video') || ext === 'mp4' || ext === 'webm' || ext === 'mov';
    
    const ffmpegArgs = ['-vf', filter];
    if (isVideo) {
      ffmpegArgs.push('-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-preset', 'ultrafast');
    }

    // Call engine with proper args
    const url = await convertVideo(file, ffmpegArgs, '.' + ext);
    if (url) setResultUrl(url);
  };

  const handleReset = () => {
    if (resultUrl) URL.revokeObjectURL(resultUrl);
    setResultUrl(null);
    setFile(null);
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-6xl mx-auto">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
          <Sparkles className="w-8 h-8 text-primary" />
          AI Image & Video Upscaler
        </h1>
        <p className="text-muted-foreground">
          Super-resolution enhancement and noise reduction using advanced resampling and filtering.
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
            {fileUrl && (
              <div className="flex-1 bg-black/5 rounded-lg flex items-center justify-center min-h-[200px] p-4 relative group">
                {file.type.includes("video") ? (
                  <video src={fileUrl} autoPlay loop muted playsInline className="max-w-full max-h-[45vh] object-contain rounded-lg shadow-lg pointer-events-none" />
                ) : (
                  <img src={fileUrl} alt="Preview" className="max-w-full max-h-[45vh] object-contain rounded-lg shadow-lg" />
                )}
                <div className="absolute top-6 left-6 bg-black/50 backdrop-blur-sm text-white text-xs font-bold px-2 py-1 rounded pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
                  ORIGINAL
                </div>
              </div>
            )}
            
            <div className="flex-1 flex flex-col gap-6">
              <div className="flex flex-col gap-4">
                <label className="text-sm font-medium">Upscale Factor</label>
                <select 
                  value={scale} 
                  onChange={e => setScale(Number(e.target.value))}
                  className="w-full h-10 px-3 rounded-lg border border-border bg-background"
                  disabled={isProcessing}
                >
                  <option value={2}>2x Upscale (High Quality)</option>
                  <option value={3}>3x Upscale</option>
                  <option value={4}>4x Upscale (Slower)</option>
                </select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-medium text-muted-foreground">Algorithm</label>
                  <select 
                    value={algo} 
                    onChange={e => setAlgo(e.target.value)}
                    className="w-full h-9 px-2 text-sm rounded-lg border border-border bg-background"
                    disabled={isProcessing}
                  >
                    <option value="lanczos">Lanczos (Photos)</option>
                    <option value="bicubic">Bicubic (Smooth)</option>
                    <option value="neighbor">Nearest Neighbor (Pixel Art)</option>
                  </select>
                </div>
                
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-medium text-muted-foreground">Noise Reduction</label>
                  <select 
                    value={noise} 
                    onChange={e => setNoise(e.target.value)}
                    className="w-full h-9 px-2 text-sm rounded-lg border border-border bg-background"
                    disabled={isProcessing}
                  >
                    <option value="none">None</option>
                    <option value="light">Light</option>
                    <option value="heavy">Heavy</option>
                  </select>
                </div>
                
                <div className="flex flex-col gap-2 md:col-span-2">
                  <label className="text-xs font-medium text-muted-foreground">Sharpening</label>
                  <select 
                    value={sharpen} 
                    onChange={e => setSharpen(e.target.value)}
                    className="w-full h-9 px-2 text-sm rounded-lg border border-border bg-background"
                    disabled={isProcessing}
                  >
                    <option value="none">None</option>
                    <option value="light">Light Sharpening</option>
                    <option value="medium">Medium Sharpening</option>
                    <option value="heavy">Heavy Sharpening</option>
                  </select>
                </div>
              </div>
              
              <div className="flex flex-col gap-4 mt-auto">
                <button
                  onClick={handleProcess}
                  disabled={isProcessing}
                  className="flex items-center justify-center gap-2 p-3 rounded-lg bg-primary text-primary-foreground font-medium hover:opacity-90 active:scale-95 transition-all disabled:opacity-50"
                >
                  {isProcessing ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Enhancing... {Math.round(progress * 100)}%</>
                  ) : "Start Upscale"}
                </button>
                {error && <p className="text-sm text-destructive text-center">{error}</p>}
              </div>
            </div>
          </div>
        </div>
      )}

      {resultUrl && fileUrl && (
        <div className="flex flex-col gap-6 border border-border rounded-xl bg-card p-6">
          <div className="w-full bg-black/5 rounded-lg flex items-center justify-center p-4">
             <BeforeAfterSlider 
               beforeUrl={fileUrl} 
               afterUrl={resultUrl} 
               isVideo={file?.type.includes("video") || false} 
             />
          </div>
          
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <a
              href={resultUrl}
              download={`gifter_upscaled_${Date.now()}.${file?.name.split('.').pop()}`}
              className="w-full sm:w-auto flex-1 flex items-center justify-center gap-2 p-4 rounded-lg bg-primary text-primary-foreground font-medium hover:opacity-90 active:scale-95 transition-all"
            >
              Download Enhanced Media
            </a>
            <button
              onClick={handleReset}
              className="w-full sm:w-auto flex-1 flex items-center justify-center gap-2 p-4 rounded-lg border border-border bg-card text-foreground font-medium hover:bg-secondary/50 active:scale-95 transition-all"
            >
              Enhance Another
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
