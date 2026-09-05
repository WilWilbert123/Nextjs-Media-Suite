"use client";

import * as React from "react";
import { FileUploader } from "@/components/common/FileUploader";
import { useMediaEngine } from "@/hooks/useMediaEngine";
import { getFFmpeg } from "@/lib/engines/ffmpeg";
import { Download, Type, Loader2, Play, Pause, Trash2 } from "lucide-react";


export default function TextStudioPage() {
  const [file, setFile] = React.useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null);
  const [resultUrl, setResultUrl] = React.useState<string | null>(null);
  const [textOverlayUrl, setTextOverlayUrl] = React.useState<string | null>(null);
  
  // Text Options
  const [text, setText] = React.useState("HELLO GIFTER!");
  const [textColor, setTextColor] = React.useState("#FFFFFF");
  const [strokeColor, setStrokeColor] = React.useState("#000000");
  const [strokeWidth, setStrokeWidth] = React.useState(15);
  const [fontSize, setFontSize] = React.useState(100);
  const [fontFamily, setFontFamily] = React.useState("sans-serif");
  const [xPosition, setXPosition] = React.useState(50); // 0 to 100 percentage
  const [yPosition, setYPosition] = React.useState(50); // 0 to 100 percentage

  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = React.useState(true);
  const timeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  const { isReady, isProcessing, progress, error, convertVideo } = useMediaEngine();

  // Create immediate preview URL when file is selected
  React.useEffect(() => {
    if (file) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setPreviewUrl(null);
    }
  }, [file]);

  // Handle Play/Pause for Video Preview
  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const drawTextOverlay = () => {
    const canvas = canvasRef.current;
    if (!canvas || !text.trim()) {
      setTextOverlayUrl(null);
      return;
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    
    // Keep a standard 1080p canvas for the overlay 
    canvas.width = 1920;
    canvas.height = 1080;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = textColor;
    ctx.font = `bold ${fontSize}px ${fontFamily}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    
    const x = (canvas.width * xPosition) / 100;
    const y = (canvas.height * yPosition) / 100;

    // Draw stroke first
    if (strokeWidth > 0) {
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = strokeWidth;
      ctx.lineJoin = "round";
      ctx.strokeText(text, x, y);
    }
    
    // Draw text over stroke
    ctx.fillText(text, x, y);

    setTextOverlayUrl(canvas.toDataURL("image/png"));
  };

  React.useEffect(() => {
    drawTextOverlay();
    // Clear result if user edits settings so they can re-render
    if (resultUrl) {
      URL.revokeObjectURL(resultUrl);
      setResultUrl(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, textColor, strokeColor, strokeWidth, fontSize, fontFamily, xPosition, yPosition]);

  const handleProcess = async () => {
    const ffmpeg = await getFFmpeg();
    if (!file || !ffmpeg || !textOverlayUrl) return;
    
    try {
      const res = await fetch(textOverlayUrl);
      const blob = await res.blob();
      const textImageFile = new File([blob], "text_overlay.png", { type: "image/png" });

      // Load overlay into FFmpeg
      const { fetchFile } = await import("@ffmpeg/util");
      await ffmpeg.writeFile("text_overlay.png", await fetchFile(textImageFile));

      const isGif = file.type.includes("gif") || file.name.toLowerCase().endsWith(".gif");
      const outputExt = isGif ? ".gif" : ".mp4";

      const args = [
        "-i", "text_overlay.png",
        "-filter_complex", "[1:v]scale=iw:ih[txt];[0:v][txt]overlay=0:0"
      ];
      
      if (!isGif) {
        args.push("-c:a", "copy", "-movflags", "faststart", "-pix_fmt", "yuv420p");
      }

      const url = await convertVideo(file, args, outputExt);
      
      if (url) {
        setResultUrl(prev => {
          if (prev) URL.revokeObjectURL(prev);
          return url;
        });
      }
    } catch (err: any) {
      console.error(err);
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (e.buttons !== 1) return; // Only trigger if left mouse button is held down
    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
    const y = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));
    setXPosition(Math.round(x));
    setYPosition(Math.round(y));
  };

  const handleReset = () => {
    if (resultUrl) URL.revokeObjectURL(resultUrl);
    setResultUrl(null);
    setFile(null);
    setText("HELLO GIFTER!");
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-[1600px] mx-auto h-[calc(100vh-6rem)]">
      {/* Hidden canvas for exporting the text overlay */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Header */}
      <div className="flex flex-col gap-2 shrink-0">
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Type className="w-6 h-6 text-primary" />
          </div>
          Text Studio
        </h1>
        <p className="text-muted-foreground">
          Burn beautiful captions, titles, and watermarks directly into your videos and GIFs.
        </p>
      </div>

      {!isReady && (
        <div className="flex-1 border border-border rounded-xl bg-card flex flex-col items-center justify-center gap-4 text-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Initializing WebAssembly Media Engine...</p>
        </div>
      )}

      {isReady && !file && (
        <div className="flex-1 bg-card rounded-xl border border-border p-8 flex items-center justify-center">
          <div className="w-full max-w-xl">
            <FileUploader
              onFileSelect={(f) => setFile(f as File)}
              accept="video/mp4,video/webm,image/gif"
            />
          </div>
        </div>
      )}

      {file && previewUrl && (
        <div className="flex flex-col lg:flex-row gap-6 h-full min-h-0 pb-6">
          
          {/* Left Panel: Settings */}
          <div className="w-full lg:w-[400px] shrink-0 flex flex-col gap-6 bg-card border border-border rounded-xl overflow-hidden smooth-shadow relative">
            <div className="p-4 border-b border-border/50 bg-muted/20 flex items-center justify-between shrink-0">
              <div className="truncate pr-4">
                <p className="font-medium text-sm truncate">{file.name}</p>
                <p className="text-xs text-muted-foreground">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
              </div>
              <button
                onClick={handleReset}
                className="p-2 hover:bg-destructive/10 hover:text-destructive text-muted-foreground rounded-lg transition-colors"
                title="Remove File"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto custom-scrollbar flex flex-col gap-8 flex-1">
              
              {/* Text Input */}
              <div className="flex flex-col gap-3">
                <label className="text-sm font-semibold flex items-center justify-between">
                  Caption Text
                </label>
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  className="w-full min-h-[100px] p-3 rounded-lg border border-border bg-background resize-none focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent font-medium"
                  placeholder="Enter your caption here..."
                />
              </div>

              {/* Typography Options */}
              <div className="flex flex-col gap-4">
                <label className="text-sm font-semibold border-b border-border/50 pb-2">
                  Typography
                </label>
                
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-2">
                    <label className="text-xs text-muted-foreground font-medium">Font Family</label>
                    <select 
                      value={fontFamily}
                      onChange={(e) => setFontFamily(e.target.value)}
                      className="p-2 rounded-lg border border-border bg-background text-sm h-10"
                    >
                      <option value="sans-serif">Sans-Serif</option>
                      <option value="serif">Serif</option>
                      <option value="monospace">Monospace</option>
                      <option value="Arial">Arial</option>
                      <option value="Verdana">Verdana</option>
                      <option value="Tahoma">Tahoma</option>
                      <option value="Trebuchet MS">Trebuchet MS</option>
                      <option value="Times New Roman">Times New Roman</option>
                      <option value="Georgia">Georgia</option>
                      <option value="Courier New">Courier New</option>
                      <option value="Impact">Impact</option>
                      <option value="Comic Sans MS">Comic Sans</option>
                      <option value="Brush Script MT">Brush Script MT</option>
                    </select>
                  </div>
                  
                  <div className="flex flex-col gap-2">
                    <label className="text-xs text-muted-foreground font-medium flex justify-between">
                      <span>Size</span>
                      <span>{fontSize}px</span>
                    </label>
                    <div className="h-10 flex items-center">
                      <input
                        type="range"
                        min="20"
                        max="300"
                        step="1"
                        value={fontSize}
                        onChange={(e) => setFontSize(parseInt(e.target.value))}
                        className="w-full h-2 bg-background rounded-lg appearance-none cursor-pointer accent-primary"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Color & Stroke */}
              <div className="flex flex-col gap-4">
                <label className="text-sm font-semibold border-b border-border/50 pb-2">
                  Colors & Outline
                </label>
                
                <div className="grid grid-cols-2 gap-6">
                  <div className="flex flex-col gap-2">
                    <label className="text-xs text-muted-foreground font-medium">Text Color</label>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg overflow-hidden border border-border shrink-0 shadow-sm relative">
                        <input
                          type="color"
                          value={textColor}
                          onChange={(e) => setTextColor(e.target.value)}
                          className="absolute -inset-2 w-16 h-16 cursor-pointer"
                        />
                      </div>
                      <span className="text-xs font-mono">{textColor.toUpperCase()}</span>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <label className="text-xs text-muted-foreground font-medium">Outline Color</label>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg overflow-hidden border border-border shrink-0 shadow-sm relative">
                        <input
                          type="color"
                          value={strokeColor}
                          onChange={(e) => setStrokeColor(e.target.value)}
                          className="absolute -inset-2 w-16 h-16 cursor-pointer"
                        />
                      </div>
                      <span className="text-xs font-mono">{strokeColor.toUpperCase()}</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex flex-col gap-2 mt-2">
                  <label className="text-xs text-muted-foreground font-medium flex justify-between">
                    <span>Outline Thickness</span>
                    <span>{strokeWidth}px</span>
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="40"
                    step="1"
                    value={strokeWidth}
                    onChange={(e) => setStrokeWidth(parseInt(e.target.value))}
                    className="w-full h-2 bg-background rounded-lg appearance-none cursor-pointer accent-primary mt-2"
                  />
                </div>
              </div>

              {/* Position Options */}
              <div className="flex flex-col gap-4">
                <label className="text-sm font-semibold border-b border-border/50 pb-2">
                  Position
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-2">
                    <label className="text-xs text-muted-foreground font-medium flex justify-between">
                      <span>Horizontal (X)</span>
                      <span>{xPosition}%</span>
                    </label>
                    <input
                      type="range"
                      min="5"
                      max="95"
                      step="1"
                      value={xPosition}
                      onChange={(e) => setXPosition(parseInt(e.target.value))}
                      className="w-full h-2 bg-background rounded-lg appearance-none cursor-pointer accent-primary mt-2"
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-xs text-muted-foreground font-medium flex justify-between">
                      <span>Vertical (Y)</span>
                      <span>{yPosition}%</span>
                    </label>
                    <input
                      type="range"
                      min="5"
                      max="95"
                      step="1"
                      value={yPosition}
                      onChange={(e) => setYPosition(parseInt(e.target.value))}
                      className="w-full h-2 bg-background rounded-lg appearance-none cursor-pointer accent-primary mt-2"
                    />
                  </div>
                </div>
              </div>

            </div>

            {/* Export Section */}
            <div className="p-4 border-t border-border/50 bg-muted/20 shrink-0">
              {!resultUrl ? (
                <button
                  onClick={handleProcess}
                  disabled={isProcessing}
                  className="w-full flex items-center justify-center gap-2 p-3 rounded-lg bg-primary text-primary-foreground font-medium hover:opacity-90 active:scale-95 transition-all shadow-md disabled:opacity-50"
                >
                  {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Play className="w-5 h-5" />}
                  {isProcessing ? "Rendering..." : "Apply & Render"}
                </button>
              ) : (
                <a
                  href={resultUrl}
                  download={`gifter_text_${Date.now()}${file.type.includes('gif') ? '.gif' : '.mp4'}`}
                  className="w-full flex items-center justify-center gap-2 p-3 rounded-lg bg-primary text-primary-foreground font-medium hover:opacity-90 active:scale-95 transition-all shadow-md"
                >
                  <Download className="w-5 h-5" />
                  Save Media
                </a>
              )}
            </div>
          </div>

          {/* Right Panel: Live Preview */}
          <div className="flex-[2] lg:flex-[3] flex flex-col gap-4 min-h-[400px]">
            <div className="flex items-center justify-between shrink-0 px-2">
              <h2 className="font-semibold text-lg flex items-center gap-2">
                Live Studio
                {isProcessing && (
                  <Loader2 className="w-4 h-4 animate-spin text-primary ml-2" />
                )}
              </h2>
              {file.type.includes("video") && resultUrl && (
                <button
                  onClick={togglePlay}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary hover:bg-secondary/80 text-sm font-medium transition-colors"
                >
                  {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  {isPlaying ? 'Pause' : 'Play'}
                </button>
              )}
            </div>
            
            {/* Live Render Window */}
            <div 
              className="w-full h-full bg-black/5 border border-border/50 rounded-xl relative flex items-center justify-center overflow-hidden shrink-0 group smooth-shadow pattern-dots cursor-move"
              onPointerDown={handlePointerMove}
              onPointerMove={handlePointerMove}
            >
              {isProcessing && (
                <div className="absolute top-2 left-2 z-50 bg-background/80 backdrop-blur-md px-2 py-1 rounded-full border border-border/50 flex items-center gap-1.5 shadow-sm">
                  <Loader2 className="w-3 h-3 animate-spin text-primary" />
                  <span className="text-[10px] font-bold text-muted-foreground">
                    {Math.round(progress * 100)}%
                  </span>
                </div>
              )}

              {(resultUrl || previewUrl) && (
                <div className="w-full h-full relative pointer-events-none">
                  {file.type.includes("video") ? (
                    <video 
                      ref={videoRef}
                      src={resultUrl || previewUrl!} 
                      autoPlay 
                      loop 
                      playsInline
                      className="w-full h-full object-contain pointer-events-none" 
                    />
                  ) : (
                    <img 
                      src={resultUrl || previewUrl!} 
                      alt="Output" 
                      className="w-full h-full object-contain pointer-events-none" 
                    />
                  )}
                  {/* Overlay Canvas Image for instant preview */}
                  {!resultUrl && textOverlayUrl && (
                     <img 
                        src={textOverlayUrl} 
                        className="absolute inset-0 w-full h-full object-contain pointer-events-none" 
                        alt="Text Overlay" 
                     />
                  )}
                  {/* Invisible crosshair to show where the drag point is mapped */}
                  <div 
                    className="absolute w-4 h-4 rounded-full border-2 border-primary/50 bg-background/50 backdrop-blur-sm -translate-x-1/2 -translate-y-1/2 pointer-events-none transition-all duration-75"
                    style={{ left: `${xPosition}%`, top: `${yPosition}%` }}
                  />
                </div>
              )}

              {error && (
                <div className="absolute bottom-4 left-4 right-4 p-4 bg-destructive/10 text-destructive border border-destructive/20 rounded-lg text-sm font-medium shadow-lg backdrop-blur-md">
                  {error}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
