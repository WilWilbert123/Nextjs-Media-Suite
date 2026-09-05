"use client";

import * as React from "react";
import { Laugh, Download, Settings2, Image as ImageIcon, Type, PaintBucket } from "lucide-react";
import { FileUploader } from "@/components/common/FileUploader";

export default function MemeMakerPage() {
  const [file, setFile] = React.useState<File | null>(null);
  
  // Text State
  const [topText, setTopText] = React.useState("TOP TEXT");
  const [bottomText, setBottomText] = React.useState("BOTTOM TEXT");
  
  // Style State
  const [fontSize, setFontSize] = React.useState(12); // relative % of image height
  const [textColor, setTextColor] = React.useState("#ffffff");
  const [strokeColor, setStrokeColor] = React.useState("#000000");
  const [strokeWidth, setStrokeWidth] = React.useState(15); // relative % of font size
  const [format, setFormat] = React.useState<"png" | "jpeg">("jpeg");
  
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const imgRef = React.useRef<HTMLImageElement | null>(null);
  
  // Load image when file changes
  React.useEffect(() => {
    if (file) {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        imgRef.current = img;
        drawMeme();
        URL.revokeObjectURL(url);
      };
      img.src = url;
    } else {
      imgRef.current = null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file]);

  // Redraw when settings change
  React.useEffect(() => {
    drawMeme();
  }, [topText, bottomText, fontSize, textColor, strokeColor, strokeWidth]);

  const drawMeme = () => {
    if (!imgRef.current || !canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const img = imgRef.current;

    // Set canvas size to image size
    canvas.width = img.width;
    canvas.height = img.height;
    
    // Draw image
    ctx.drawImage(img, 0, 0);
    
    // Setup text style (Impact font is classic for memes)
    const pxFontSize = Math.max(10, Math.floor(img.height * (fontSize / 100)));
    ctx.font = `bold ${pxFontSize}px Impact, sans-serif`;
    ctx.textAlign = "center";
    ctx.fillStyle = textColor;
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = Math.max(1, Math.floor(pxFontSize * (strokeWidth / 100)));
    ctx.lineJoin = 'round'; // makes stroke look smoother on sharp corners
    
    const maxWidth = canvas.width - (canvas.width * 0.1); // 5% padding on each side
    const lineHeight = pxFontSize * 1.1;

    // Helper to draw wrapped text
    const wrapText = (text: string, yPos: number, yAlign: "top" | "bottom") => {
      const words = text.toUpperCase().split(' ');
      let line = '';
      const lines: string[] = [];
      
      for (let n = 0; n < words.length; n++) {
        const testLine = line + words[n] + ' ';
        const metrics = ctx.measureText(testLine);
        const testWidth = metrics.width;
        if (testWidth > maxWidth && n > 0) {
          lines.push(line.trim());
          line = words[n] + ' ';
        } else {
          line = testLine;
        }
      }
      lines.push(line.trim());

      const x = canvas.width / 2;
      
      // Adjust starting Y if bottom aligned
      let startY = yPos;
      if (yAlign === "bottom") {
        startY -= (lines.length - 1) * lineHeight;
        ctx.textBaseline = "bottom";
      } else {
        ctx.textBaseline = "top";
      }
      
      for (let i = 0; i < lines.length; i++) {
        const lineY = startY + (i * lineHeight) * (yAlign === 'bottom' ? 1 : 1);
        ctx.strokeText(lines[i], x, lineY);
        ctx.fillText(lines[i], x, lineY);
      }
    };
    
    // Draw Top & Bottom Texts
    const verticalPadding = img.height * 0.05;
    if (topText.trim()) {
      wrapText(topText, verticalPadding, "top");
    }
    if (bottomText.trim()) {
      wrapText(bottomText, img.height - verticalPadding, "bottom");
    }
  };

  const handleDownload = () => {
    if (!canvasRef.current) return;
    const mimeType = `image/${format}`;
    const url = canvasRef.current.toDataURL(mimeType, 0.9);
    const a = document.createElement("a");
    a.href = url;
    a.download = `meme_${Date.now()}.${format}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="flex flex-col gap-4 w-full max-w-6xl mx-auto p-4 glass-card smooth-show h-[calc(100vh-6rem)]">
      
      <div className="flex flex-col gap-1 text-center items-center shrink-0">
        <div className="w-12 h-12 rounded-2xl bg-secondary flex items-center justify-center mb-1 smooth-shadow">
          <Laugh className="w-6 h-6 text-foreground" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight">Meme Generator Studio</h1>
        <p className="text-sm text-muted-foreground">
          Create classic text memes instantly with Impact font, text wrapping, and custom styles.
        </p>
      </div>

      {!file && (
        <div className="flex-1 flex items-center justify-center min-h-[300px]">
          <FileUploader
            onFileSelect={(f) => setFile(Array.isArray(f) ? f[0] : f)}
            accept="image/*"
          />
        </div>
      )}

      {file && (
        <div className="flex-1 flex flex-col md:flex-row gap-6 min-h-0 bg-card border border-border/50 rounded-2xl p-4 md:p-6 smooth-shadow">
          
          {/* LEFT: Preview Panel */}
          <div className="flex-[3] flex flex-col gap-4 min-w-0 h-full relative">
            <div className="flex items-center justify-between border-b border-border/50 pb-3 shrink-0">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-primary" /> Live Preview
              </h3>
              <button
                onClick={() => setFile(null)}
                className="text-[10px] font-bold text-muted-foreground hover:text-foreground underline underline-offset-4 uppercase tracking-wider"
              >
                Change Image
              </button>
            </div>

            <div className="flex-1 bg-black/5 rounded-xl border border-border/50 flex items-center justify-center p-4 relative pattern-dots overflow-hidden min-h-0 smooth-shadow">
              <canvas 
                ref={canvasRef} 
                className="max-w-full max-h-full object-contain shadow-2xl rounded"
              />
            </div>
          </div>

          {/* RIGHT: Controls */}
          <div className="flex-[2] flex flex-col gap-4 min-w-0 h-full overflow-y-auto pr-1 custom-scrollbar">
            
            <div className="flex flex-col gap-5 bg-secondary/30 p-4 rounded-xl border border-border/50">
              
              <div className="flex items-center gap-2 pb-2 border-b border-border/50">
                <Type className="w-4 h-4 text-primary" />
                <h3 className="font-bold text-sm">Meme Text</h3>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Top Text</label>
                <textarea 
                  value={topText} 
                  onChange={(e) => setTopText(e.target.value)}
                  placeholder="TOP TEXT"
                  rows={2}
                  className="w-full px-3 py-2 text-sm font-bold uppercase rounded-lg border border-border bg-background focus:ring-1 focus:ring-primary/50 outline-none resize-none transition-all"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Bottom Text</label>
                <textarea 
                  value={bottomText} 
                  onChange={(e) => setBottomText(e.target.value)}
                  placeholder="BOTTOM TEXT"
                  rows={2}
                  className="w-full px-3 py-2 text-sm font-bold uppercase rounded-lg border border-border bg-background focus:ring-1 focus:ring-primary/50 outline-none resize-none transition-all"
                />
              </div>

            </div>

            <div className="flex flex-col gap-5 bg-secondary/30 p-4 rounded-xl border border-border/50">
              
              <div className="flex items-center gap-2 pb-2 border-b border-border/50">
                <PaintBucket className="w-4 h-4 text-primary" />
                <h3 className="font-bold text-sm">Styling Options</h3>
              </div>

              <div className="flex flex-col gap-2">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] font-bold uppercase text-muted-foreground">Text Size</label>
                  <span className="text-[10px] font-mono bg-background px-2 py-0.5 rounded border border-border">{fontSize}%</span>
                </div>
                <input
                  type="range" min="5" max="30" step="1" value={fontSize}
                  onChange={(e) => setFontSize(Number(e.target.value))}
                  className="w-full accent-primary"
                />
              </div>

              <div className="flex flex-col gap-2 pt-2 border-t border-border/50">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] font-bold uppercase text-muted-foreground">Stroke Thickness</label>
                  <span className="text-[10px] font-mono bg-background px-2 py-0.5 rounded border border-border">{strokeWidth}%</span>
                </div>
                <input
                  type="range" min="0" max="30" step="1" value={strokeWidth}
                  onChange={(e) => setStrokeWidth(Number(e.target.value))}
                  className="w-full accent-primary"
                />
              </div>

              <div className="flex gap-4 pt-2 border-t border-border/50">
                <div className="flex-1 flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold uppercase text-muted-foreground">Text Color</label>
                  <div className="flex items-center gap-2">
                    <input 
                      type="color" 
                      value={textColor} 
                      onChange={(e) => setTextColor(e.target.value)}
                      className="w-8 h-8 rounded cursor-pointer border-0 p-0 bg-transparent"
                    />
                    <span className="text-xs font-mono text-muted-foreground">{textColor.toUpperCase()}</span>
                  </div>
                </div>

                <div className="flex-1 flex flex-col gap-1.5 border-l border-border/50 pl-4">
                  <label className="text-[10px] font-bold uppercase text-muted-foreground">Stroke Color</label>
                  <div className="flex items-center gap-2">
                    <input 
                      type="color" 
                      value={strokeColor} 
                      onChange={(e) => setStrokeColor(e.target.value)}
                      className="w-8 h-8 rounded cursor-pointer border-0 p-0 bg-transparent"
                    />
                    <span className="text-xs font-mono text-muted-foreground">{strokeColor.toUpperCase()}</span>
                  </div>
                </div>
              </div>

            </div>

            <div className="mt-auto flex flex-col gap-2 shrink-0">
              <div className="flex bg-background p-1 rounded-xl border border-border/50 self-center">
                 <button
                    onClick={() => setFormat("jpeg")}
                    className={`px-4 py-1.5 text-[10px] font-bold uppercase rounded-lg transition-all ${
                      format === "jpeg" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    .JPG
                  </button>
                  <button
                    onClick={() => setFormat("png")}
                    className={`px-4 py-1.5 text-[10px] font-bold uppercase rounded-lg transition-all ${
                      format === "png" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    .PNG
                  </button>
              </div>

              <button
                onClick={handleDownload}
                className="w-full py-4 rounded-xl flex items-center justify-center gap-2 font-bold transition-all shadow-md bg-foreground text-background hover:bg-foreground/90 active:scale-[0.98]"
              >
                <Download className="w-5 h-5" /> 
                Download Meme
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
