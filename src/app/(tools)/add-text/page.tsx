"use client";

import * as React from "react";
import { FileUploader } from "@/components/common/FileUploader";
import { useMediaEngine } from "@/hooks/useMediaEngine";
import { getFFmpeg } from "@/lib/engines/ffmpeg";
import { Download, RefreshCw, Type, Loader2 } from "lucide-react";

export default function AddTextToolPage() {
  const [file, setFile] = React.useState<File | null>(null);
  const [resultUrl, setResultUrl] = React.useState<string | null>(null);
  const [text, setText] = React.useState("HELLO GIFTER!");
  const [textColor, setTextColor] = React.useState("#FFFFFF");
  const [yPosition, setYPosition] = React.useState<"top" | "center" | "bottom">("center");

  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const { isReady, isProcessing, progress, error, convertVideo } = useMediaEngine();

  const handleProcess = async () => {
    const ffmpeg = await getFFmpeg();
    if (!file || !ffmpeg) return;
    
    try {
      // 1. Generate text overlay image from Canvas
      const canvas = canvasRef.current;
      if (!canvas) throw new Error("Preview canvas not ready");

      // Draw text in high resolution
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas context failed");
      
      // We assume a 1080p canvas for the overlay image
      canvas.width = 1920;
      canvas.height = 1080;
      
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = textColor;
      ctx.font = "bold 100px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      
      // Draw stroke
      ctx.strokeStyle = "#000000";
      ctx.lineWidth = 15;
      
      const x = canvas.width / 2;
      let y = canvas.height / 2;
      if (yPosition === "top") y = 200;
      if (yPosition === "bottom") y = canvas.height - 200;

      ctx.strokeText(text, x, y);
      ctx.fillText(text, x, y);

      // Export to blob
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((b) => b ? resolve(b) : reject(new Error("Canvas blob failed")), "image/png");
      });
      const textImageFile = new File([blob], "text_overlay.png", { type: "image/png" });

      // 2. Load the overlay image into FFmpeg
      const { fetchFile } = await import("@ffmpeg/util");
      await ffmpeg.writeFile("text_overlay.png", await fetchFile(textImageFile));

      // 3. Process video
      const isGif = file.type.includes("gif") || file.name.toLowerCase().endsWith(".gif");
      const outputExt = isGif ? ".gif" : ".mp4";

      // FFmpeg overlay filter: scales the overlay image to the video's width/height, then overlays it
      // Since our canvas is 1920x1080, we scale it to match the main video [0:v] dimensions.
      const args = [
        "-i", "text_overlay.png",
        "-filter_complex", "[1:v]scale=iw:ih[txt];[0:v][txt]overlay=0:0"
      ];
      
      if (!isGif) {
        args.push("-c:a", "copy", "-movflags", "faststart", "-pix_fmt", "yuv420p");
      }

      const url = await convertVideo(file, args, outputExt);
      if (url) {
        setResultUrl(url);
      }
    } catch (err: any) {
      console.error(err);
    }
  };

  const handleReset = () => {
    if (resultUrl) URL.revokeObjectURL(resultUrl);
    setResultUrl(null);
    setFile(null);
    setText("HELLO GIFTER!");
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-4xl mx-auto">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
          <Type className="w-8 h-8 text-primary" />
          Add Text to Media
        </h1>
        <p className="text-muted-foreground">
          Burn captions, titles, or watermarks directly into your video or GIF.
        </p>
      </div>

      {/* Hidden canvas for exporting the text overlay */}
      <canvas ref={canvasRef} className="hidden" />

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
            <div className="flex flex-col md:flex-row gap-8">
              <div className="flex-1 flex flex-col gap-8">
                {/* Text Input Control */}
                <div className="flex flex-col gap-4 bg-muted/30 p-4 rounded-xl border border-border">
                  <label className="text-sm font-medium">Text Content</label>
                  <textarea
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    className="w-full min-h-[100px] p-3 rounded-lg border border-border bg-background resize-none focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    placeholder="Enter your caption here..."
                  />
                  
                  <div className="flex gap-4 items-center">
                    <label className="text-sm font-medium">Color</label>
                    <input
                      type="color"
                      value={textColor}
                      onChange={(e) => setTextColor(e.target.value)}
                      className="w-10 h-10 rounded cursor-pointer border-0 p-0"
                    />
                  </div>

                  <div className="flex flex-col gap-2 mt-2">
                    <label className="text-sm font-medium">Position</label>
                    <div className="grid grid-cols-3 gap-2">
                      {["top", "center", "bottom"].map((pos) => (
                        <button
                          key={pos}
                          onClick={() => setYPosition(pos as any)}
                          className={`py-2 rounded-lg border-2 font-medium capitalize transition-all ${
                            yPosition === pos 
                              ? "border-primary bg-primary/10 text-primary" 
                              : "border-border hover:border-primary/50 text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          {pos}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleProcess}
                  className="flex items-center justify-center gap-2 p-4 rounded-lg bg-primary text-primary-foreground font-medium hover:opacity-90 active:scale-95 transition-all w-full mt-auto"
                >
                  Burn Text & Encode
                </button>
              </div>

              {/* Live Preview Window */}
              <div className="flex-1 border-2 border-dashed border-border rounded-xl p-2 bg-muted/20 flex flex-col items-center justify-center relative overflow-hidden min-h-[300px]">
                <div className="absolute top-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded-md z-10 backdrop-blur-md">
                  Live Preview
                </div>
                
                <div className="relative flex items-center justify-center w-full h-full">
                  {file.type.includes("video") ? (
                    <video 
                      src={URL.createObjectURL(file)} 
                      autoPlay 
                      loop 
                      muted
                      className="max-w-full max-h-[300px] object-contain rounded-lg shadow-lg pointer-events-none"
                    />
                  ) : (
                    <img 
                      src={URL.createObjectURL(file)} 
                      alt="Preview" 
                      className="max-w-full max-h-[300px] object-contain rounded-lg shadow-lg pointer-events-none"
                    />
                  )}
                  
                  {/* CSS Overlay for Text Preview */}
                  <div 
                    className="absolute inset-0 flex flex-col text-center pointer-events-none p-4"
                    style={{
                      justifyContent: 
                        yPosition === "top" ? "flex-start" : 
                        yPosition === "bottom" ? "flex-end" : "center"
                    }}
                  >
                    <p 
                      className="text-3xl sm:text-5xl font-bold"
                      style={{ 
                        color: textColor,
                        textShadow: "-2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000, 2px 2px 0 #000, 0px 4px 10px rgba(0,0,0,0.8)",
                        whiteSpace: "pre-wrap"
                      }}
                    >
                      {text}
                    </p>
                  </div>
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
              <p className="text-sm font-medium animate-pulse">Rendering text overlay...</p>
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
          <div className="w-full bg-black/5 rounded-lg overflow-hidden flex items-center justify-center min-h-[300px] p-4">
            {resultUrl.endsWith(".mp4") ? (
              <video src={resultUrl} controls autoPlay loop className="max-w-full max-h-[600px] object-contain rounded-lg shadow-lg" />
            ) : (
              <img src={resultUrl} alt="Filtered output" className="max-w-full max-h-[600px] object-contain rounded-lg shadow-lg" />
            )}
          </div>
          
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <a
              href={resultUrl}
              download={`gifter_text_${Date.now()}${file?.name.endsWith('.gif') ? '.gif' : '.mp4'}`}
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
              Add Text to Another
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
