"use client";

import * as React from "react";
import { FileUploader } from "@/components/common/FileUploader";
import { useMediaEngine } from "@/hooks/useMediaEngine";
import { Download, Stamp, Loader2, Plus, ArrowRight } from "lucide-react";

export default function BatchWatermarkerPage() {
  const [targetFiles, setTargetFiles] = React.useState<File[]>([]);
  const [watermarkFile, setWatermarkFile] = React.useState<File | null>(null);
  const [results, setResults] = React.useState<{ name: string, url: string, originalUrl: string }[]>([]);

  const [layout, setLayout] = React.useState<"single" | "tiled-2x2" | "tiled-3x3" | "tiled-4x4" | "diagonal">("single");
  const [opacity, setOpacity] = React.useState<number>(100);

  // Draggable position
  const [dragPos, setDragPos] = React.useState({ x: 50, y: 50 });
  const previewRef = React.useRef<HTMLDivElement>(null);
  const isDragging = React.useRef(false);

  // Text watermark state
  const [watermarkType, setWatermarkType] = React.useState<"image" | "text">("image");
  const [textModeStr, setTextModeStr] = React.useState("Watermark");
  const [textColor, setTextColor] = React.useState("#ffffff");
  const [textSize, setTextSize] = React.useState(64);
  const [fontFamily, setFontFamily] = React.useState("sans-serif");
  const [textOutline, setTextOutline] = React.useState(true);
  const [textRotation, setTextRotation] = React.useState(0);

  // Universal scale state
  const [scale, setScale] = React.useState<number>(50); // default 50% of video width

  const [overallProgress, setOverallProgress] = React.useState(0);
  const [currentFileIndex, setCurrentFileIndex] = React.useState(0);
  const [activeCompareIndex, setActiveCompareIndex] = React.useState<number | null>(null);
  const [isBatchProcessing, setIsBatchProcessing] = React.useState(false);
  const [simulatedProgress, setSimulatedProgress] = React.useState(0);
  const isCancelledRef = React.useRef(false);

  const [previewTargetUrl, setPreviewTargetUrl] = React.useState<string | null>(null);
  const [previewWatermarkUrl, setPreviewWatermarkUrl] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (targetFiles.length > 0) {
      setPreviewTargetUrl(URL.createObjectURL(targetFiles[0]));
    } else {
      setPreviewTargetUrl(null);
    }
  }, [targetFiles]);

  React.useEffect(() => {
    if (watermarkFile) {
      setPreviewWatermarkUrl(URL.createObjectURL(watermarkFile));
    } else {
      setPreviewWatermarkUrl(null);
    }
  }, [watermarkFile]);

  React.useEffect(() => {
    if (watermarkType === "text" && textModeStr) {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      ctx.font = `bold ${textSize}px ${fontFamily}`;
      const metrics = ctx.measureText(textModeStr);

      const rawWidth = metrics.width + (textOutline ? 20 : 0);
      const rawHeight = textSize + (textOutline ? 20 : 0);
      const maxSize = Math.sqrt(rawWidth * rawWidth + rawHeight * rawHeight) + 40;

      canvas.width = maxSize;
      canvas.height = maxSize;

      ctx.translate(maxSize / 2, maxSize / 2);
      ctx.rotate((textRotation * Math.PI) / 180);

      ctx.font = `bold ${textSize}px ${fontFamily}`;
      ctx.fillStyle = textColor;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      if (textOutline) {
        ctx.strokeStyle = "#000000";
        ctx.lineWidth = Math.max(2, textSize * 0.05);
        ctx.strokeText(textModeStr, 0, 0);
      }

      ctx.fillText(textModeStr, 0, 0);

      canvas.toBlob((blob) => {
        if (blob) {
          const file = new File([blob], "text_watermark.png", { type: "image/png" });
          setWatermarkFile(file);
        }
      }, "image/png");
    }
  }, [watermarkType, textModeStr, textColor, textSize, fontFamily, textOutline, textRotation]);

  const handlePointerDown = (e: React.PointerEvent) => {
    if (layout !== "single") return;
    isDragging.current = true;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging.current || !previewRef.current) return;
    const rect = previewRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
    const y = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));
    setDragPos({ x, y });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    isDragging.current = false;
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
  };

  const { isReady, isProcessing, progress, error, convertWithWatermark, cancelProcessing } = useMediaEngine();

  React.useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isBatchProcessing && progress === 0) {
      interval = setInterval(() => {
        setSimulatedProgress(prev => {
          if (prev < 15) return prev + 1;
          if (prev < 45) return prev + 0.5;
          if (prev < 85) return prev + 0.1;
          return prev;
        });
      }, 500);
    } else if (!isBatchProcessing) {
      setSimulatedProgress(0);
    } else if (progress > 0) {
      setSimulatedProgress(0); // reset if actual progress arrives
    }
    return () => clearInterval(interval);
  }, [isBatchProcessing, progress]);

  const actualCurrentFilePercent = progress * 100;
  const displayCurrentFilePercent = Math.max(simulatedProgress, actualCurrentFilePercent);
  const combinedProgress = targetFiles.length > 0 
    ? ((currentFileIndex / targetFiles.length) * 100) + (displayCurrentFilePercent / targetFiles.length)
    : 0;

  const handleProcess = async () => {
    if (targetFiles.length === 0 || !watermarkFile) return;

    setResults([]);
    setOverallProgress(0);
    setCurrentFileIndex(0);
    setIsBatchProcessing(true);
    isCancelledRef.current = false;

    const processed: { name: string, url: string, originalUrl: string }[] = [];

    // Helper to get true dimensions of media before FFmpeg processes it
    const getDimensions = async (file: File): Promise<{w: number, h: number}> => {
      return new Promise((resolve) => {
        const url = URL.createObjectURL(file);
        if (file.type.startsWith('video/') || /\\.(mp4|webm|mov|mkv|avi)$/i.test(file.name)) {
          const vid = document.createElement("video");
          vid.onloadedmetadata = () => {
            resolve({ w: vid.videoWidth, h: vid.videoHeight });
            URL.revokeObjectURL(url);
          };
          vid.src = url;
        } else {
          const img = new Image();
          img.onload = () => {
            resolve({ w: img.naturalWidth, h: img.naturalHeight });
            URL.revokeObjectURL(url);
          };
          img.src = url;
        }
      });
    };

    for (let i = 0; i < targetFiles.length; i++) {
      setCurrentFileIndex(i);
      const file = targetFiles[i];
      const isVideo = file.type.startsWith('video/') || /\\.(mp4|webm|mov|mkv|avi)$/i.test(file.name);
      const ext = file.name.substring(file.name.lastIndexOf("."));

      // FFmpeg WASM 0.12 (FFmpeg 5.x) has a broken scale2ref filter that maps main_w to iw.
      // So we calculate the exact target width in Javascript first!
      const { w: mainW } = await getDimensions(file);
      const targetW = Math.max(2, Math.round(mainW * (scale / 100) / 2) * 2);

      const opacityFilter = opacity < 100 ? `[1:v]colorchannelmixer=aa=${(opacity / 100).toFixed(2)}[wm_op];` : `[1:v]copy[wm_op];`;
      // Use standard scale filter with the exact calculated width
      const prepFilter = `${opacityFilter}[wm_op]scale=${targetW}:-2[wm];`;

      let overlayFilter = "";

      if (layout === "single") {
        // Removed max(0, ...) so that negative coordinates are allowed (just like in CSS!)
        const posFilter = `W*${dragPos.x / 100}-w/2:H*${dragPos.y / 100}-h/2`;
        overlayFilter = `${prepFilter}[0:v][wm]overlay=${posFilter}`;
      } else {
        const generateGridFilter = (rows: number, cols: number, gridScale: number) => {
          const total = rows * cols;
          let f = `${prepFilter}[wm]scale=trunc(iw*${gridScale}/2)*2:-2[wms];[wms]split=${total}`;
          for (let j = 1; j <= total; j++) f += `[w${j}]`;
          f += `;`;

          let lastV = "0:v";
          let index = 1;
          for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
              let x = c === 0 ? "10" : c === cols - 1 ? "W-w-10" : `(W-w)*${c / (cols - 1)}`;
              let y = r === 0 ? "10" : r === rows - 1 ? "H-h-10" : `(H-h)*${r / (rows - 1)}`;
              let outV = index === total ? "" : `[v${index}]`;
              f += `[${lastV}][w${index}]overlay=${x}:${y}${outV}${index === total ? '' : ';'}`;
              lastV = `v${index}`;
              index++;
            }
          }
          return f;
        };

        if (layout === "tiled-2x2") overlayFilter = generateGridFilter(2, 2, 0.5);
        else if (layout === "tiled-3x3") overlayFilter = generateGridFilter(3, 3, 0.4);
        else if (layout === "tiled-4x4") overlayFilter = generateGridFilter(4, 4, 0.25);
        else if (layout === "diagonal") {
          let f = `${prepFilter}[wm]scale=trunc(iw*0.5/2)*2:-2[wms];[wms]split=3[w1][w2][w3];`;
          f += `[0:v][w1]overlay=10:10[v1];`;
          f += `[v1][w2]overlay=(W-w)/2:(H-h)/2[v2];`;
          f += `[v2][w3]overlay=W-w-10:H-h-10`;
          overlayFilter = f;
        }
      }

      const args = [
        "-filter_complex", overlayFilter,
      ];

      if (isVideo) {
        args.push("-codec:a", "copy");
        if (['.mp4', '.mov', '.mkv'].includes(ext.toLowerCase())) {
          args.push("-preset", "ultrafast", "-movflags", "faststart");
        }
      }

      if (isCancelledRef.current) break;
      const url = await convertWithWatermark(file, watermarkFile, args, ext);
      if (isCancelledRef.current) break;
      
      if (url) {
        processed.push({ name: `watermarked_${file.name}`, url, originalUrl: URL.createObjectURL(file) });
      }
      setOverallProgress(((i + 1) / targetFiles.length) * 100);
    }

    setResults(processed);
    setIsBatchProcessing(false);
  };

  const handleReset = () => {
    setTargetFiles([]);
    setWatermarkFile(null);
    setResults([]);
    setOverallProgress(0);
    setCurrentFileIndex(0);
  };

  const totalFiles = targetFiles.length;

  return (
    <div className={`flex flex-col gap-3 md:gap-4 w-full max-w-7xl mx-auto px-4 pb-4 pt-2 smooth-show ${targetFiles.length > 0 && watermarkFile ? "h-[calc(100vh-56px)] overflow-hidden" : ""}`}>
      <div className="flex items-center gap-3 shrink-0">
        <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center smooth-shadow shrink-0">
          <Stamp className="w-5 h-5 text-foreground" />
        </div>
        <div className="flex flex-col">
          <h1 className="text-xl font-bold tracking-tight leading-none mb-1">Batch Watermarker</h1>
          <p className="text-xs text-muted-foreground line-clamp-1">
            Securely stamp your logo or watermark onto multiple images and videos locally.
          </p>
        </div>
      </div>

      {!isReady && (
        <div className="w-full h-40 flex flex-col items-center justify-center border-2 border-dashed border-border rounded-xl bg-card">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground mb-4" />
          <p className="text-sm text-muted-foreground">Initializing secure engine...</p>
        </div>
      )}

      {isReady && (!targetFiles.length || !watermarkFile) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 smooth-show w-full shrink-0">
          {/* Target Media Uploader */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between px-1">
              <span className="font-semibold">1. Select Target Media</span>
              {targetFiles.length > 0 && <span className="text-sm text-green-500 font-medium">{targetFiles.length} selected</span>}
            </div>
            {/* Invisible spacer to align with the Image/Text toggle on the right */}
            <div className="flex p-1 rounded-lg invisible pointer-events-none select-none">
              <div className="py-1 text-sm font-medium">&nbsp;</div>
            </div>
            {targetFiles.length === 0 ? (
              <FileUploader
                onFileSelect={(files) => setTargetFiles(files as File[])}
                accept="image/*,video/*"
                multiple={true}
                description="Supports multiple MP4, WebM, JPG, PNG"
              />
            ) : (
              <div className="w-full h-full min-h-[200px] rounded-xl border-2 border-dashed border-green-500/50 bg-green-500/5 flex flex-col items-center justify-center p-6 text-center">
                <div className="w-12 h-12 rounded-full bg-green-500/20 text-green-500 flex items-center justify-center mb-3">
                  <span className="font-bold text-xl">{targetFiles.length}</span>
                </div>
                <p className="font-medium text-foreground">Target Files Ready</p>
                <p className="text-sm text-muted-foreground mt-1">Move to step 2</p>
              </div>
            )}
          </div>

          {/* Watermark Uploader */}
          {/* Watermark Uploader */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between px-1">
              <span className="font-semibold">2. Select Watermark Logo</span>
              {watermarkFile && <span className="text-sm text-green-500 font-medium">Selected</span>}
            </div>

            <div className="flex bg-secondary p-1 rounded-lg">
              <button
                onClick={() => { setWatermarkType("image"); setWatermarkFile(null); }}
                className={`flex-1 py-1 text-sm font-medium rounded-md transition-colors ${watermarkType === "image" ? "bg-background shadow-sm" : "text-muted-foreground hover:bg-background/50"}`}
              >
                Upload Image
              </button>
              <button
                onClick={() => { setWatermarkType("text"); }}
                className={`flex-1 py-1 text-sm font-medium rounded-md transition-colors ${watermarkType === "text" ? "bg-background shadow-sm" : "text-muted-foreground hover:bg-background/50"}`}
              >
                Use Text
              </button>
            </div>

            {watermarkType === "image" ? (
              !watermarkFile ? (
                <FileUploader
                  onFileSelect={(f) => setWatermarkFile(f as File)}
                  accept="image/png,image/webp"
                  description="Upload a transparent PNG logo"
                />
              ) : (
                <div className="w-full h-full min-h-[160px] rounded-xl border-2 border-dashed border-green-500/50 bg-green-500/5 flex flex-col items-center justify-center p-6 text-center">
                  <div className="w-12 h-12 rounded-full bg-green-500/20 text-green-500 flex items-center justify-center mb-3">
                    <Stamp className="w-6 h-6" />
                  </div>
                  <p className="font-medium text-foreground">Watermark Ready</p>
                  <p className="text-sm text-muted-foreground mt-1">{watermarkFile.name}</p>
                </div>
              )
            ) : (
              <div className="w-full h-full min-h-[160px] rounded-xl border-2 border-dashed border-green-500/50 bg-green-500/5 flex flex-col items-center justify-center p-6 text-center">
                <div className="w-12 h-12 rounded-full bg-green-500/20 text-green-500 flex items-center justify-center mb-3">
                  <span className="font-bold text-xl">T</span>
                </div>
                <p className="font-medium text-foreground">Text Watermark Active</p>
                <p className="text-sm text-muted-foreground mt-1">Configure text in the next step</p>
              </div>
            )}
          </div>
        </div>
      )}

      {targetFiles.length > 0 && watermarkFile && (
        <div className="flex flex-col gap-4 w-full p-4 md:p-6 bg-card border border-border rounded-xl smooth-shadow smooth-show flex-1 min-h-0 overflow-hidden">
          <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center p-3 bg-secondary/50 rounded-lg border border-border/50 shrink-0">
            <div className="flex flex-col">
              <span className="text-sm text-muted-foreground font-medium uppercase tracking-wider">Targets</span>
              <span className="font-semibold">{targetFiles.length} files queued</span>
            </div>
            <ArrowRight className="w-5 h-5 text-muted-foreground hidden sm:block" />
            <div className="flex flex-col">
              <span className="text-sm text-muted-foreground font-medium uppercase tracking-wider">Watermark</span>
              <span className="font-semibold truncate max-w-[150px]">{watermarkFile.name}</span>
            </div>
            {!isBatchProcessing && results.length === 0 && (
              <button onClick={handleReset} className="text-sm text-muted-foreground hover:text-foreground">Start Over</button>
            )}
          </div>

          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-500 text-sm">
              {error}
            </div>
          )}

          {results.length === 0 ? (
            <div className="flex flex-col lg:flex-row gap-6 lg:gap-8 items-start w-full flex-1 min-h-0 overflow-hidden">

              {/* Left Column: Live Preview */}
              <div className="flex flex-col gap-4 w-full lg:w-1/2 h-[50vh] lg:h-full shrink-0 lg:shrink flex-1 min-h-0">
                {previewTargetUrl && previewWatermarkUrl && (
                  <div className="flex flex-col gap-2 flex-1 min-h-0">
                    <div className="flex justify-between items-end shrink-0">
                      <span className="text-sm font-medium">Live Preview</span>
                      {layout === "single" && <span className="text-xs text-muted-foreground">Click and drag logo to position</span>}
                    </div>
                    <div
                      ref={previewRef}
                      className="w-full flex-1 min-h-0 rounded-lg overflow-hidden bg-secondary relative smooth-shadow flex items-center justify-center checkered-bg select-none touch-none"
                    >
                      {targetFiles[0].type.startsWith('video/') || /\\.(mp4|webm|mov|mkv|avi)$/i.test(targetFiles[0].name) ? (
                        <video src={previewTargetUrl} className="w-full h-full object-contain pointer-events-none" autoPlay loop muted playsInline />
                      ) : (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img src={previewTargetUrl} alt="Target" className="w-full h-full object-contain pointer-events-none" />
                      )}

                      {/* Watermark Overlay */}
                      {layout === "single" ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={previewWatermarkUrl}
                          alt="Watermark"
                          onPointerDown={handlePointerDown}
                          onPointerMove={handlePointerMove}
                          onPointerUp={handlePointerUp}
                          onPointerCancel={handlePointerUp}
                          style={{
                            opacity: opacity / 100,
                            width: `${scale}%`,
                            left: `${dragPos.x}%`,
                            top: `${dragPos.y}%`,
                            transform: 'translate(-50%, -50%)',
                            cursor: layout === "single" ? 'grab' : 'auto'
                          }}
                          className="absolute object-contain drop-shadow-md z-10 transition-opacity"
                          draggable={false}
                        />
                      ) : (
                        <div className={`absolute inset-0 grid p-4 pointer-events-none ${layout === "tiled-2x2" ? "grid-cols-2 grid-rows-2 gap-4" :
                            layout === "tiled-4x4" ? "grid-cols-4 grid-rows-4 gap-2" :
                              layout === "diagonal" ? "grid-cols-3 grid-rows-3" :
                                "grid-cols-3 grid-rows-3 gap-3"
                          }`}>
                          {Array.from({ length: layout === "tiled-2x2" ? 4 : layout === "tiled-4x4" ? 16 : layout === "diagonal" ? 9 : 9 }).map((_, i) => {
                            if (layout === "diagonal" && i !== 0 && i !== 4 && i !== 8) return <div key={i} />;
                            return (
                              <div key={i} className="flex items-center justify-center w-full h-full">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={previewWatermarkUrl}
                                  alt={`Watermark ${i}`}
                                  style={{ opacity: opacity / 100, width: `${scale}%` }}
                                  className="object-contain drop-shadow-md"
                                />
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Right Column: Controls */}
              <div className="flex flex-col gap-4 w-full lg:w-1/2 h-full overflow-y-auto pb-4 pr-2">
                <div className="flex flex-col gap-4">
                  <div className="flex flex-col gap-1">
                    <label className="text-sm font-medium">Layout Mode</label>
                    <div className="flex flex-wrap gap-2">
                      {(["single", "tiled-2x2", "tiled-3x3", "tiled-4x4", "diagonal"] as const).map(l => (
                        <button
                          key={l}
                          onClick={() => setLayout(l)}
                          className={`px-3 py-1.5 rounded-md text-sm font-medium border transition-colors ${layout === l ? 'bg-foreground text-background border-foreground' : 'bg-transparent text-foreground border-border hover:border-foreground/30'}`}
                        >
                          {l === "single" ? "Single Logo" : l === "tiled-2x2" ? "2x2 Grid" : l === "tiled-3x3" ? "3x3 Grid" : l === "tiled-4x4" ? "4x4 Grid" : "Diagonal"}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 lg:gap-4">
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-medium flex justify-between">
                        <span>Scale</span>
                        <span className="text-muted-foreground">{scale}%</span>
                      </label>
                      <input
                        type="range"
                        min="1"
                        max="100"
                        step="1"
                        value={scale}
                        onChange={(e) => setScale(parseInt(e.target.value))}
                        className="w-full h-2 mt-2 bg-secondary rounded-lg appearance-none cursor-pointer accent-foreground"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-medium flex justify-between">
                        <span>Opacity</span>
                        <span className="text-muted-foreground">{opacity}%</span>
                      </label>
                      <input
                        type="range"
                        min="10"
                        max="100"
                        step="5"
                        value={opacity}
                        onChange={(e) => setOpacity(parseInt(e.target.value))}
                        className="w-full h-2 mt-2 bg-secondary rounded-lg appearance-none cursor-pointer accent-foreground"
                      />
                    </div>
                  </div>
                </div>

                {watermarkType === "text" && (
                  <div className="flex flex-col gap-2 p-3 border border-border rounded-lg bg-secondary/20">
                    <span className="text-xs font-medium">Text Settings</span>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="flex flex-col gap-1 col-span-2">
                        <label className="text-xs text-muted-foreground uppercase">Text</label>
                        <input
                          type="text"
                          value={textModeStr}
                          onChange={(e) => setTextModeStr(e.target.value)}
                          className="px-2 py-1 bg-background border border-border rounded-md text-sm"
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] text-muted-foreground uppercase">Font</label>
                        <select
                          value={fontFamily}
                          onChange={(e) => setFontFamily(e.target.value)}
                          className="w-full px-2 py-1 bg-background border border-border rounded-md text-xs cursor-pointer"
                        >
                          <option value="sans-serif">Sans Serif</option>
                          <option value="serif">Serif</option>
                          <option value="monospace">Monospace</option>
                          <option value="Arial, sans-serif">Arial</option>
                          <option value="Verdana, sans-serif">Verdana</option>
                          <option value="Tahoma, sans-serif">Tahoma</option>
                          <option value="'Trebuchet MS', sans-serif">Trebuchet</option>
                          <option value="'Times New Roman', serif">Times New Roman</option>
                          <option value="Georgia, serif">Georgia</option>
                          <option value="Garamond, serif">Garamond</option>
                          <option value="'Courier New', monospace">Courier New</option>
                          <option value="'Brush Script MT', cursive">Brush Script MT</option>
                          <option value="Impact, charcoal, sans-serif">Impact</option>
                        </select>
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] text-muted-foreground uppercase">Size</label>
                        <input
                          type="number"
                          value={textSize}
                          min="24"
                          max="200"
                          onChange={(e) => setTextSize(parseInt(e.target.value) || 64)}
                          className="w-full px-2 py-1 bg-background border border-border rounded-md text-xs"
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] text-muted-foreground uppercase">Color</label>
                        <input
                          type="color"
                          value={textColor}
                          onChange={(e) => setTextColor(e.target.value)}
                          className="w-full h-7 p-0 bg-background border border-border rounded-md cursor-pointer"
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] text-muted-foreground flex justify-between uppercase">
                          <span>Rotation</span>
                          <span>{textRotation}°</span>
                        </label>
                        <input
                          type="range"
                          min="-180"
                          max="180"
                          value={textRotation}
                          onChange={(e) => setTextRotation(parseInt(e.target.value))}
                          className="w-full h-2 mt-2.5 bg-background rounded-lg appearance-none cursor-pointer accent-foreground border border-border"
                        />
                      </div>
                      <div className="flex items-center gap-2 col-span-2 mt-1">
                        <input
                          type="checkbox"
                          id="outline-toggle"
                          checked={textOutline}
                          onChange={(e) => setTextOutline(e.target.checked)}
                          className="w-4 h-4 rounded border-border text-foreground accent-foreground"
                        />
                        <label htmlFor="outline-toggle" className="text-sm font-medium cursor-pointer">Text Outline (Stroke)</label>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex flex-col gap-3 mt-2">
                  <button
                    onClick={handleProcess}
                    disabled={isBatchProcessing || targetFiles.length === 0 || !watermarkFile}
                    className={`w-full relative overflow-hidden group bg-foreground text-background py-3.5 rounded-xl font-semibold transition-all flex items-center justify-center gap-2 ${
                      (!isBatchProcessing && (targetFiles.length === 0 || !watermarkFile)) ? "opacity-50 cursor-not-allowed" : "hover:opacity-90"
                    } ${isBatchProcessing ? "cursor-not-allowed" : ""}`}
                  >
                    {isBatchProcessing && (
                      <div 
                        className="absolute left-0 top-0 bottom-0 bg-background/30 transition-all duration-300 ease-out z-0"
                        style={{ width: `${Math.min(100, Math.max(0, combinedProgress))}%` }}
                      />
                    )}
                    
                    <div className="relative z-10 flex items-center justify-center gap-2">
                      {isBatchProcessing ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          <span>Processing {targetFiles.length} file{targetFiles.length !== 1 ? 's' : ''}... {Math.round(combinedProgress)}%</span>
                        </>
                      ) : (
                        <>
                          <Stamp className="w-4 h-4" />
                          <span>Apply Watermarks</span>
                        </>
                      )}
                    </div>
                  </button>
                  {isBatchProcessing && (
                    <button 
                      onClick={() => {
                        isCancelledRef.current = true;
                        cancelProcessing();
                        setIsBatchProcessing(false);
                      }}
                      className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors mt-1"
                    >
                      Cancel Processing
                    </button>
                  )}
                  {isBatchProcessing && targetFiles.some(f => f.type.startsWith('video/')) && (
                    <div className="text-[11px] text-muted-foreground/70 text-center px-4 leading-tight mt-1">
                      Videos are processed entirely in your browser for privacy. High-resolution videos may take several minutes as it relies on your device&apos;s CPU.
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between border-b border-border pb-2">
                <h3 className="font-bold text-lg">Ready to Download</h3>
                <button onClick={handleReset} className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors underline underline-offset-4">
                  Start Over
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 overflow-y-auto pr-2 pb-2">
                {results.map((res, idx) => {
                  const isVideo = res.name.endsWith('.mp4') || res.name.endsWith('.webm') || res.name.endsWith('.mov');
                  return (
                    <div key={idx} className="flex flex-col gap-4 p-4 bg-background border border-border rounded-xl group shadow-sm">
                      <div className="w-full aspect-video bg-secondary rounded-lg flex items-center justify-center overflow-hidden shrink-0 checkered-bg relative">
                        <style>{`
                          .checkered-bg {
                            background-color: #f0f0f0;
                            background-image: 
                              linear-gradient(45deg, #e0e0e0 25%, transparent 25%), 
                              linear-gradient(-45deg, #e0e0e0 25%, transparent 25%), 
                              linear-gradient(45deg, transparent 75%, #e0e0e0 75%), 
                              linear-gradient(-45deg, transparent 75%, #e0e0e0 75%);
                            background-size: 20px 20px;
                            background-position: 0 0, 0 10px, 10px -10px, -10px 0px;
                          }
                          .dark .checkered-bg {
                            background-color: #1a1a1a;
                            background-image: 
                              linear-gradient(45deg, #2a2a2a 25%, transparent 25%), 
                              linear-gradient(-45deg, #2a2a2a 25%, transparent 25%), 
                              linear-gradient(45deg, transparent 75%, #2a2a2a 75%), 
                              linear-gradient(-45deg, transparent 75%, #2a2a2a 75%);
                          }
                        `}</style>
                        {isVideo ? (
                          <video src={activeCompareIndex === idx ? res.originalUrl : res.url} className="w-full h-full object-contain transition-all duration-200" autoPlay loop muted playsInline />
                        ) : (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img src={activeCompareIndex === idx ? res.originalUrl : res.url} alt={res.name} className="w-full h-full object-contain transition-all duration-200" />
                        )}
                        {activeCompareIndex === idx && (
                          <div className="absolute top-2 right-2 px-2 py-1 bg-black/60 text-white text-xs font-bold rounded">
                            ORIGINAL
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col gap-3 w-full">
                        <span className="text-sm font-semibold truncate w-full text-center" title={res.name}>{res.name}</span>
                        <div className="flex items-center gap-2 w-full">
                          <button
                            onMouseDown={() => setActiveCompareIndex(idx)}
                            onMouseUp={() => setActiveCompareIndex(null)}
                            onMouseLeave={() => setActiveCompareIndex(null)}
                            onTouchStart={() => setActiveCompareIndex(idx)}
                            onTouchEnd={() => setActiveCompareIndex(null)}
                            className="flex-1 px-3 py-2 bg-secondary hover:bg-secondary/80 text-foreground text-sm font-semibold rounded-md transition-colors select-none"
                          >
                            Hold to Compare
                          </button>
                          <a
                            href={res.url}
                            download={res.name}
                            className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2 bg-foreground text-background hover:opacity-90 text-sm font-semibold rounded-md transition-opacity"
                          >
                            <Download className="w-4 h-4" />
                            Save
                          </a>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <button
                onClick={handleReset}
                className="w-full flex items-center justify-center gap-2 mt-2 py-3 bg-secondary text-foreground rounded-lg font-medium hover:bg-secondary/80 transition-colors"
              >
                Process Another Batch
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
