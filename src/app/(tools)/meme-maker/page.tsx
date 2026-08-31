"use client";

import * as React from "react";
import { Laugh, Download } from "lucide-react";
import { FileUploader } from "@/components/common/FileUploader";

export default function MemeMakerPage() {
  const [file, setFile] = React.useState<File | null>(null);
  const [topText, setTopText] = React.useState("TOP TEXT");
  const [bottomText, setBottomText] = React.useState("BOTTOM TEXT");
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  
  React.useEffect(() => {
    if (file) {
      drawMeme();
    }
  }, [file, topText, bottomText]);

  const drawMeme = () => {
    if (!file || !canvasRef.current) return;
    
    const ctx = canvasRef.current.getContext("2d");
    if (!ctx) return;

    const img = new Image();
    const url = URL.createObjectURL(file);
    
    img.onload = () => {
      // Set canvas size to image size
      canvasRef.current!.width = img.width;
      canvasRef.current!.height = img.height;
      
      // Draw image
      ctx.drawImage(img, 0, 0);
      
      // Setup text style (Impact font, white with black stroke)
      const fontSize = Math.floor(img.height / 8);
      ctx.font = `bold ${fontSize}px Impact, sans-serif`;
      ctx.textAlign = "center";
      ctx.fillStyle = "white";
      ctx.strokeStyle = "black";
      ctx.lineWidth = fontSize / 15;
      
      // Helper to draw text with wrap (simple version)
      const drawText = (text: string, yPos: number) => {
        ctx.textBaseline = yPos < img.height / 2 ? "top" : "bottom";
        const x = img.width / 2;
        ctx.strokeText(text.toUpperCase(), x, yPos);
        ctx.fillText(text.toUpperCase(), x, yPos);
      };
      
      // Draw Top & Bottom
      if (topText) drawText(topText, 20);
      if (bottomText) drawText(bottomText, img.height - 20);
      
      URL.revokeObjectURL(url);
    };
    img.src = url;
  };

  const handleDownload = () => {
    if (!canvasRef.current) return;
    const url = canvasRef.current.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = url;
    a.download = `meme_${Date.now()}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-6xl mx-auto">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
          <Laugh className="w-8 h-8 text-primary" />
          Meme Generator
        </h1>
        <p className="text-muted-foreground">
          Create classic Top/Bottom text memes instantly using any image.
        </p>
      </div>

      {!file && (
        <FileUploader
          onFileSelect={(f) => setFile(f as File)}
          accept="image/*"
        />
      )}

      {file && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 border border-border rounded-xl bg-card p-6">
          
          <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between">
              <p className="font-medium truncate">{file.name}</p>
              <button
                onClick={() => setFile(null)}
                className="text-sm text-muted-foreground hover:text-foreground underline underline-offset-4 whitespace-nowrap"
              >
                Choose different image
              </button>
            </div>

            <div className="flex flex-col gap-4 mt-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Top Text</label>
                <input 
                  type="text" 
                  value={topText} 
                  onChange={(e) => setTopText(e.target.value)}
                  placeholder="TOP TEXT"
                  className="w-full px-4 py-3 text-lg font-semibold uppercase rounded-xl border border-border bg-background focus:ring-2 focus:ring-primary outline-none transition-all"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Bottom Text</label>
                <input 
                  type="text" 
                  value={bottomText} 
                  onChange={(e) => setBottomText(e.target.value)}
                  placeholder="BOTTOM TEXT"
                  className="w-full px-4 py-3 text-lg font-semibold uppercase rounded-xl border border-border bg-background focus:ring-2 focus:ring-primary outline-none transition-all"
                />
              </div>
            </div>

            <button
              onClick={handleDownload}
              className="flex items-center justify-center gap-2 p-4 mt-auto rounded-lg bg-primary text-primary-foreground font-semibold hover:opacity-90 active:scale-95 transition-all w-full"
            >
              <Download className="w-5 h-5" /> Download Meme
            </button>
          </div>

          <div className="flex flex-col items-center justify-center p-4 bg-black/5 rounded-xl border border-border min-h-[400px]">
            <canvas 
              ref={canvasRef} 
              className="max-w-full max-h-[60vh] object-contain shadow-2xl rounded-sm"
            />
          </div>

        </div>
      )}
    </div>
  );
}
