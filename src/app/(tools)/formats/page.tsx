"use client";

import * as React from "react";
import { FileUploader } from "@/components/common/FileUploader";
import { useMediaEngine } from "@/hooks/useMediaEngine";
import { Download, RefreshCw, FileImage, Loader2 } from "lucide-react";

export default function FormatsToolPage() {
  const [file, setFile] = React.useState<File | null>(null);
  const [resultUrl, setResultUrl] = React.useState<string | null>(null);
  const [targetFormat, setTargetFormat] = React.useState<string>("webp");
  const [imageDuration, setImageDuration] = React.useState<number>(5);
  
  const { isReady, isProcessing, progress, error, convertVideo } = useMediaEngine();

  const handleProcess = async () => {
    if (!file) return;
    
    let args: string[] = [];
    let ext = `.${targetFormat}`;

    if (targetFormat === "webp") {
      args = ["-vcodec", "libwebp", "-lossless", "0", "-compression_level", "4", "-q:v", "50", "-loop", "0", "-preset", "picture"];
    } else if (targetFormat === "gif") {
      args = ["-filter_complex", "fps=15,scale=720:-1:flags=lanczos,split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse"];
    } else if (targetFormat === "mp4") {
      args = ["-movflags", "faststart", "-pix_fmt", "yuv420p", "-c:v", "libx264"];
    } else if (targetFormat === "avi") {
      args = ["-c:v", "libxvid", "-qscale:v", "3", "-c:a", "libmp3lame"];
    }

    // If converting an image to a video format, we need to loop it and set a duration
    if (file.type.includes("image") && (targetFormat === "mp4" || targetFormat === "avi")) {
      args.unshift("-loop", "1");
      args.push("-t", imageDuration.toString());
    }

    const url = await convertVideo(file, args, ext);
    if (url) {
      setResultUrl(url);
    }
  };

  const handleReset = () => {
    if (resultUrl) URL.revokeObjectURL(resultUrl);
    setResultUrl(null);
    setFile(null);
  };

  const formats = [
    { id: "webp", name: "WebP (Animated/Static)", desc: "Next-gen web format, great compression." },
    { id: "gif", name: "GIF", desc: "Classic animated format. High compatibility." },
    { id: "mp4", name: "MP4 (H.264)", desc: "Universal video format." },
    { id: "avi", name: "AVI (Xvid)", desc: "Legacy video format." }
  ];

  return (
    <div className="flex flex-col gap-6 w-full max-w-4xl mx-auto">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
          <FileImage className="w-8 h-8 text-primary" />
          Format Converter
        </h1>
        <p className="text-muted-foreground">
          Convert between next-gen web formats and legacy video containers instantly.
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

          {!isProcessing ? (
            <div className="flex flex-col md:flex-row gap-8">
              <div className="flex-1 flex flex-col gap-8">
                {/* Format Control */}
                <div className="flex flex-col gap-4 bg-muted/30 p-4 rounded-xl border border-border">
                  <label className="text-sm font-medium">Select Target Format</label>
                  <div className="flex flex-col gap-3">
                    {formats.map((fmt) => (
                      <button
                        key={fmt.id}
                        onClick={() => setTargetFormat(fmt.id)}
                        className={`flex flex-col items-start gap-1 p-3 rounded-lg border-2 transition-all text-left ${
                          targetFormat === fmt.id 
                            ? "border-primary bg-primary/10 text-primary" 
                            : "border-border hover:border-primary/50 text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        <span className="font-bold">{fmt.name}</span>
                        <span className="text-xs opacity-80">{fmt.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Duration Control (Only shown when converting image to video) */}
                {file.type.includes("image") && (targetFormat === "mp4" || targetFormat === "avi") && (
                  <div className="flex flex-col gap-2 bg-muted/30 p-4 rounded-xl border border-border">
                    <label className="text-sm font-medium">Video Duration (seconds)</label>
                    <input
                      type="number"
                      min="1"
                      step="1"
                      value={imageDuration}
                      onChange={(e) => setImageDuration(parseFloat(e.target.value) || 5)}
                      className="w-full h-10 px-3 rounded-lg border border-border bg-background"
                    />
                    <p className="text-xs text-muted-foreground">Since you uploaded a static image, you must specify how long the resulting video should be.</p>
                  </div>
                )}

                <button
                  onClick={handleProcess}
                  className="flex items-center justify-center gap-2 p-4 rounded-lg bg-primary text-primary-foreground font-medium hover:opacity-90 active:scale-95 transition-all w-full mt-auto"
                >
                  Convert to .{targetFormat.toUpperCase()}
                </button>
              </div>

              {/* Live Preview Window */}
              <div className="flex-1 border-2 border-dashed border-border rounded-xl p-2 bg-muted/20 flex flex-col items-center justify-center relative overflow-hidden min-h-[300px]">
                <div className="absolute top-2 right-2 bg-primary text-primary-foreground font-bold text-xs px-3 py-1 rounded-full z-10 backdrop-blur-md flex items-center gap-2 shadow-lg">
                  <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  Preview: {targetFormat.toUpperCase()}
                </div>
                {file.type.includes("video") ? (
                  <video 
                    src={URL.createObjectURL(file)} 
                    autoPlay 
                    loop 
                    muted
                    controls
                    className="max-w-full max-h-[400px] object-contain rounded-lg shadow-lg transition-all duration-300"
                    style={{
                      filter: targetFormat === 'gif' ? 'contrast(1.15) saturate(1.2) brightness(0.95)' : 
                              targetFormat === 'avi' ? 'sepia(0.1) contrast(0.9) blur(0.5px)' : 'none',
                    }}
                  />
                ) : (
                  <img 
                    src={URL.createObjectURL(file)} 
                    alt="Preview" 
                    className="max-w-full max-h-[400px] object-contain rounded-lg shadow-lg transition-all duration-300"
                    style={{
                      filter: targetFormat === 'gif' ? 'contrast(1.15) saturate(1.2) brightness(0.95)' : 
                              targetFormat === 'avi' ? 'sepia(0.1) contrast(0.9) blur(0.5px)' : 'none',
                    }}
                  />
                )}
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
              <p className="text-sm font-medium animate-pulse">Encoding to .{targetFormat} format...</p>
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
            {targetFormat === "mp4" || targetFormat === "avi" ? (
              <video src={resultUrl} controls autoPlay loop className="max-w-full max-h-[600px] object-contain rounded-lg shadow-lg" />
            ) : (
              <img src={resultUrl} alt="Filtered output" className="max-w-full max-h-[600px] object-contain rounded-lg shadow-lg" />
            )}
          </div>
          
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <a
              href={resultUrl}
              download={`gifter_format_${Date.now()}.${targetFormat}`}
              className="w-full sm:w-auto flex-1 flex items-center justify-center gap-2 p-4 rounded-lg bg-primary text-primary-foreground font-medium hover:opacity-90 active:scale-95 transition-all"
            >
              <Download className="w-5 h-5" />
              Download .{targetFormat.toUpperCase()}
            </a>
            <button
              onClick={handleReset}
              className="w-full sm:w-auto flex items-center justify-center gap-2 p-4 rounded-lg border border-border hover:bg-muted font-medium transition-all"
            >
              <RefreshCw className="w-5 h-5" />
              Convert Another
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
