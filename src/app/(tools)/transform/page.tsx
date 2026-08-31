"use client";

import * as React from "react";
import { FileUploader } from "@/components/common/FileUploader";
import { useMediaEngine } from "@/hooks/useMediaEngine";
import { Download, RefreshCw, Move, Loader2, RotateCw, FlipHorizontal, FlipVertical, Wand2 } from "lucide-react";

export default function TransformToolPage() {
  const [file, setFile] = React.useState<File | null>(null);
  const [resultUrl, setResultUrl] = React.useState<string | null>(null);
  
  // Transform State
  const [scalePercent, setScalePercent] = React.useState<number>(100);
  const [rotation, setRotation] = React.useState<number>(0);
  const [flipHorizontal, setFlipHorizontal] = React.useState<boolean>(false);
  const [flipVertical, setFlipVertical] = React.useState<boolean>(false);
  const [filterEffect, setFilterEffect] = React.useState<string>("none");
  const [originalDimensions, setOriginalDimensions] = React.useState<{w: number, h: number} | null>(null);
  const [fileUrl, setFileUrl] = React.useState<string>("");
  
  // Panning State
  const [panX, setPanX] = React.useState<number>(0);
  const [panY, setPanY] = React.useState<number>(0);
  const isDragging = React.useRef(false);
  const lastMousePos = React.useRef({ x: 0, y: 0 });

  React.useEffect(() => {
    if (scalePercent <= 100) {
      setPanX(0);
      setPanY(0);
    }
  }, [scalePercent]);
  
  React.useEffect(() => {
    if (file) {
      const url = URL.createObjectURL(file);
      setFileUrl(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setFileUrl("");
    }
  }, [file]);
  
  const { isReady, isProcessing, progress, error, convertVideo } = useMediaEngine();

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (scalePercent <= 100) return;
    isDragging.current = true;
    lastMousePos.current = { x: e.clientX, y: e.clientY };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging.current || scalePercent <= 100) return;
    
    const dx = e.clientX - lastMousePos.current.x;
    const dy = e.clientY - lastMousePos.current.y;
    lastMousePos.current = { x: e.clientX, y: e.clientY };

    const wrapper = e.currentTarget;
    const scaledWidth = wrapper.clientWidth * (scalePercent / 100);
    const scaledHeight = wrapper.clientHeight * (scalePercent / 100);

    const dxPercent = (dx / scaledWidth) * 100;
    const dyPercent = (dy / scaledHeight) * 100;

    const maxPan = ((scalePercent / 100) - 1) / (2 * (scalePercent / 100)) * 100;

    setPanX(prev => Math.min(Math.max(prev + dxPercent, -maxPan), maxPan));
    setPanY(prev => Math.min(Math.max(prev + dyPercent, -maxPan), maxPan));
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    isDragging.current = false;
    e.currentTarget.releasePointerCapture(e.pointerId);
  };

  const handleProcess = async () => {
    if (!file) return;
    
    const filters: string[] = [];
    
    // Zoom (Crop) filter
    if (scalePercent !== 100) {
      const scaleStr = (scalePercent / 100).toFixed(2);
      if (scalePercent > 100) {
        // Zoom In = Crop the center, offset by pan
        // panX and panY are from -maxPan to +maxPan. 
        // 0 means center (iw-ow)/2.
        // -maxPan means left edge (x=0). +maxPan means right edge (x=iw-ow).
        // Let's calculate panRatio from -1 to 1.
        const maxPan = ((scalePercent / 100) - 1) / (2 * (scalePercent / 100)) * 100;
        const panRatioX = maxPan > 0 ? panX / maxPan : 0;
        const panRatioY = maxPan > 0 ? panY / maxPan : 0;
        
        let cropFilter = `crop=trunc(iw/${scaleStr}/2)*2:trunc(ih/${scaleStr}/2)*2:trunc(((iw - (iw/${scaleStr}))/2) * (1 - ${panRatioX})):trunc(((ih - (ih/${scaleStr}))/2) * (1 - ${panRatioY}))`;
        
        if (originalDimensions) {
          // Scale it back to original resolution so the video doesn't physically shrink. Enforce even dimensions!
          cropFilter += `,scale=trunc(${originalDimensions.w}/2)*2:trunc(${originalDimensions.h}/2)*2`;
        }
        filters.push(cropFilter);
      } else if (originalDimensions) {
        // Zoom Out = Scale down and pad with black bars
        const scaledW = Math.round(originalDimensions.w * (scalePercent / 100));
        const scaledH = Math.round(originalDimensions.h * (scalePercent / 100));
        filters.push(`scale=trunc(${scaledW}/2)*2:trunc(${scaledH}/2)*2,pad=${originalDimensions.w}:${originalDimensions.h}:(ow-iw)/2:(oh-ih)/2`);
      }
    }
    
    // Rotation filter
    if (rotation === 90) filters.push("transpose=1");
    else if (rotation === 180) filters.push("hflip,vflip");
    else if (rotation === 270) filters.push("transpose=2");

    // Flip filters
    if (flipHorizontal) filters.push("hflip");
    if (flipVertical) filters.push("vflip");

    // Visual Effects
    if (filterEffect === "grayscale") {
      filters.push("colorchannelmixer=.3:.4:.3:0:.3:.4:.3:0:.3:.4:.3");
    } else if (filterEffect === "blur") {
      filters.push("gblur=sigma=5");
    } else if (filterEffect === "sepia") {
      filters.push("colorchannelmixer=.393:.769:.189:0:.349:.686:.168:0:.272:.534:.131");
    } else if (filterEffect === "invert") {
      filters.push("negate");
    } else if (filterEffect === "brightness") {
      filters.push("eq=brightness=0.3"); // FFmpeg eq brightness range is -1.0 to 1.0
    } else if (filterEffect === "contrast") {
      filters.push("eq=contrast=1.5"); // FFmpeg eq contrast range is -2.0 to 2.0
    }

    // Default fast filter if nothing changed
    if (filters.length === 0) {
      filters.push("copy"); // Actually, if we just copy, we don't use -vf
    }
    
    const isGif = file.type.includes("gif") || file.name.toLowerCase().endsWith(".gif");
    const outputExt = isGif ? ".gif" : ".mp4";
    
    let args: string[] = [];
    if (filters.length > 0 && filters[0] !== "copy") {
      args = ["-vf", filters.join(",")];
      if (!isGif) {
        // Fast start for mp4
        args.push("-movflags", "faststart", "-pix_fmt", "yuv420p");
      }
    } else {
      args = ["-c", "copy"];
    }

    const url = await convertVideo(file, args, outputExt);
    if (url) {
      setResultUrl(url);
    }
  };

  const handleReset = () => {
    if (resultUrl) URL.revokeObjectURL(resultUrl);
    setResultUrl(null);
    setFile(null);
    setScalePercent(100);
    setRotation(0);
    setFlipHorizontal(false);
    setFlipVertical(false);
    setFilterEffect("none");
    setOriginalDimensions(null);
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-6xl mx-auto">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
          <Move className="w-8 h-8 text-primary" />
          Transform Media
        </h1>
        <p className="text-muted-foreground">
          Resize and rotate your GIFs or Videos completely offline.
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
          accept="video/mp4,video/webm,image/gif"
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
            <div className="flex flex-col md:flex-row gap-6">
              <div className="flex-1 flex flex-col gap-4">
              {/* Scale Control */}
              <div className="flex flex-col gap-3 bg-muted/30 p-3 rounded-xl border border-border">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">Zoom (Crop)</label>
                  <span className="text-sm font-bold text-primary">{scalePercent}%</span>
                </div>
                <input 
                  type="range" 
                  min="10" 
                  max="200" 
                  step="10"
                  value={scalePercent} 
                  onChange={(e) => setScalePercent(parseInt(e.target.value))}
                  className="w-full h-2 bg-secondary rounded-lg appearance-none cursor-pointer"
                />
                <div className="flex justify-between items-center text-[11px] text-muted-foreground">
                  <p>Zoom in to crop, zoom out to pad.</p>
                  {originalDimensions && (
                    <p className="font-mono bg-muted px-2 py-0.5 rounded text-primary">
                      {scalePercent > 100 
                        ? `${Math.round(originalDimensions.w / (scalePercent / 100))} x ${Math.round(originalDimensions.h / (scalePercent / 100))}`
                        : `${Math.round(originalDimensions.w * (scalePercent / 100))} x ${Math.round(originalDimensions.h * (scalePercent / 100))}`
                      }
                    </p>
                  )}
                </div>
              </div>

              {/* Rotation Control */}
              <div className="flex flex-col gap-3 bg-muted/30 p-3 rounded-xl border border-border">
                <label className="text-sm font-medium">Rotate</label>
                <div className="grid grid-cols-4 gap-2">
                  {[0, 90, 180, 270].map((deg) => (
                    <button
                      key={deg}
                      onClick={() => setRotation(deg)}
                      className={`flex flex-col items-center justify-center gap-1 p-2 rounded-lg border-2 transition-all ${
                        rotation === deg 
                          ? "border-primary bg-primary/10 text-primary" 
                          : "border-border hover:border-primary/50 text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <RotateCw className="w-4 h-4" style={{ transform: `rotate(${deg}deg)` }} />
                      <span className="text-[10px] font-medium">{deg}°</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Flip & Effects Controls */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="flex flex-col gap-3 bg-muted/30 p-3 rounded-xl border border-border">
                  <label className="text-sm font-medium">Flip</label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setFlipHorizontal(!flipHorizontal)}
                      className={`flex-1 flex flex-col items-center justify-center gap-1 p-2 rounded-lg border-2 transition-all ${
                        flipHorizontal 
                          ? "border-primary bg-primary/10 text-primary" 
                          : "border-border hover:border-primary/50 text-muted-foreground"
                      }`}
                    >
                      <FlipHorizontal className="w-4 h-4" />
                      <span className="text-[10px] font-medium">Horizontal</span>
                    </button>
                    <button
                      onClick={() => setFlipVertical(!flipVertical)}
                      className={`flex-1 flex flex-col items-center justify-center gap-1 p-2 rounded-lg border-2 transition-all ${
                        flipVertical 
                          ? "border-primary bg-primary/10 text-primary" 
                          : "border-border hover:border-primary/50 text-muted-foreground"
                      }`}
                    >
                      <FlipVertical className="w-4 h-4" />
                      <span className="text-[10px] font-medium">Vertical</span>
                    </button>
                  </div>
                </div>

                <div className="flex flex-col gap-3 bg-muted/30 p-3 rounded-xl border border-border">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <Wand2 className="w-4 h-4 text-primary" /> Visual Effect
                  </label>
                  <select
                    value={filterEffect}
                    onChange={(e) => setFilterEffect(e.target.value)}
                    className="w-full h-full min-h-[40px] px-3 rounded-lg border border-border bg-background text-sm"
                  >
                    <option value="none">None (Original)</option>
                    <option value="grayscale">Grayscale</option>
                    <option value="sepia">Sepia</option>
                    <option value="invert">Invert Colors</option>
                    <option value="blur">Gaussian Blur</option>
                    <option value="brightness">Increase Brightness</option>
                    <option value="contrast">High Contrast</option>
                  </select>
                </div>
              </div>

              <button
                onClick={handleProcess}
                className="flex items-center justify-center gap-2 p-3 rounded-lg bg-primary text-primary-foreground font-medium hover:opacity-90 active:scale-95 transition-all w-full mt-auto"
              >
                Apply & Encode Transformations
              </button>
            </div>

            {/* Live Preview Window */}
            <div className="flex-1 border-2 border-dashed border-border rounded-xl p-2 bg-muted/20 flex flex-col items-center justify-center relative min-h-[200px]">
              <div className="absolute top-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded-md z-10 backdrop-blur-md">
                Live Preview
              </div>
              <div 
                className={`relative overflow-hidden flex items-center justify-center max-w-full max-h-[35vh] rounded-lg shadow-lg ${scalePercent > 100 ? 'cursor-grab active:cursor-grabbing' : ''}`}
                style={{ 
                  aspectRatio: originalDimensions ? `${originalDimensions.w} / ${originalDimensions.h}` : 'auto',
                }}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerUp}
              >
                {fileUrl && (file.type.includes("video") ? (
                  <video 
                    src={fileUrl} 
                    autoPlay 
                    loop 
                    muted
                    onLoadedMetadata={(e) => setOriginalDimensions({ w: e.currentTarget.videoWidth, h: e.currentTarget.videoHeight })}
                    className="w-full h-full object-cover transition-transform duration-75"
                    style={{
                      transform: `scale(${scalePercent / 100}) translate(${panX}%, ${panY}%) rotate(${rotation}deg) scaleX(${flipHorizontal ? -1 : 1}) scaleY(${flipVertical ? -1 : 1})`,
                      filter: filterEffect === 'grayscale' ? 'grayscale(100%)' 
                            : filterEffect === 'blur' ? 'blur(5px)' 
                            : filterEffect === 'sepia' ? 'sepia(100%)'
                            : filterEffect === 'invert' ? 'invert(100%)'
                            : filterEffect === 'brightness' ? 'brightness(130%)'
                            : filterEffect === 'contrast' ? 'contrast(150%)'
                            : 'none'
                    }}
                  />
                ) : (
                  <img 
                    src={fileUrl} 
                    alt="Preview" 
                    onLoad={(e) => setOriginalDimensions({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight })}
                    className="w-full h-full object-cover transition-transform duration-75"
                    style={{
                      transform: `scale(${scalePercent / 100}) translate(${panX}%, ${panY}%) rotate(${rotation}deg) scaleX(${flipHorizontal ? -1 : 1}) scaleY(${flipVertical ? -1 : 1})`,
                      filter: filterEffect === 'grayscale' ? 'grayscale(100%)' 
                            : filterEffect === 'blur' ? 'blur(5px)' 
                            : filterEffect === 'sepia' ? 'sepia(100%)'
                            : filterEffect === 'invert' ? 'invert(100%)'
                            : filterEffect === 'brightness' ? 'brightness(130%)'
                            : filterEffect === 'contrast' ? 'contrast(150%)'
                            : 'none'
                    }}
                  />
                ))}
              </div>
            </div>
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
              <p className="text-sm font-medium animate-pulse">Transforming media locally...</p>
            </div>
          )}

          {error && (
            <div className="p-4 bg-destructive/10 text-destructive border border-destructive rounded-lg text-sm font-medium break-all">
              {error}
            </div>
          )}
        </div>
      )}

      {resultUrl && (
        <div className="flex flex-col gap-6 border border-border rounded-xl bg-card p-6">
          <div className="w-full bg-black/5 rounded-lg flex items-center justify-center min-h-[200px] p-4">
            {file?.type.includes("video") || file?.name.toLowerCase().endsWith(".mp4") ? (
              <video src={resultUrl} controls autoPlay loop className="max-w-full max-h-[45vh] object-contain rounded-lg shadow-lg" />
            ) : (
              <img src={resultUrl} alt="Transformed output" className="max-w-full max-h-[45vh] object-contain rounded-lg shadow-lg" />
            )}
          </div>
          
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <a
              href={resultUrl}
              download={`gifter_transformed_${Date.now()}${file?.name.endsWith('.gif') ? '.gif' : '.mp4'}`}
              className="w-full sm:w-auto flex-1 flex items-center justify-center gap-2 p-4 rounded-lg bg-primary text-primary-foreground font-medium hover:opacity-90 active:scale-95 transition-all"
            >
              <Download className="w-5 h-5" />
              Download Result
            </a>
            <button
              onClick={handleReset}
              className="w-full sm:w-auto flex items-center justify-center gap-2 p-4 rounded-lg border border-border hover:bg-muted font-medium transition-all"
            >
              <RefreshCw className="w-5 h-5" />
              Transform Another
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
