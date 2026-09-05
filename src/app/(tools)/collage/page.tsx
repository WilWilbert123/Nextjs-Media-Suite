"use client";

import * as React from "react";
import { LayoutGrid, Loader2, Image as ImageIcon, Film } from "lucide-react";
import { FileUploader } from "@/components/common/FileUploader";
import { useMediaEngine } from "@/hooks/useMediaEngine";
import { cn } from "@/lib/utils";

type Layout = {
  id: string;
  label: string;
  cols: number;
  rows: number;
  icon: React.ElementType;
};

const GRID_OPTIONS: Layout[] = [
  { id: 'side', label: '1x2 (Side-by-Side)', cols: 2, rows: 1, icon: LayoutGrid },
  { id: '2x2', label: '2x2 Grid', cols: 2, rows: 2, icon: LayoutGrid },
  { id: '3x3', label: '3x3 Grid', cols: 3, rows: 3, icon: LayoutGrid },
  { id: '4x4', label: '4x4 Grid', cols: 4, rows: 4, icon: LayoutGrid },
  { id: 'strip_1x3', label: '1x3 Photo Strip', cols: 1, rows: 3, icon: Film },
  { id: 'strip_1x4', label: '1x4 Photo Strip', cols: 1, rows: 4, icon: Film }
];

export default function CollagePage() {
  const [activeLayout, setActiveLayout] = React.useState<Layout>(GRID_OPTIONS[0]);
  const [enableBorders, setEnableBorders] = React.useState<boolean>(false);
  const [files, setFiles] = React.useState<File[]>([]);
  const [fileUrls, setFileUrls] = React.useState<string[]>([]);
  const [result, setResult] = React.useState<{ url: string, isVideo: boolean } | null>(null);
  
  const { isReady, isProcessing, progress, error, engine } = useMediaEngine();

  const totalRequired = activeLayout.cols * activeLayout.rows;

  React.useEffect(() => {
    if (files.length > 0) {
      const urls = files.map(f => URL.createObjectURL(f));
      setFileUrls(urls);
      return () => urls.forEach(u => URL.revokeObjectURL(u));
    } else {
      setFileUrls([]);
    }
  }, [files]);

  const handleProcess = async () => {
    if (files.length !== totalRequired || !engine.current) return;
    
    try {
      const isGif = files.some(f => f.name.toLowerCase().endsWith('.gif'));
      const outputName = `collage.${isGif ? 'gif' : 'mp4'}`;
      
      const inputArgs: string[] = [];
      const fileNames: string[] = [];

      for (let i = 0; i < files.length; i++) {
        const ext = files[i].name.split('.').pop()?.toLowerCase() || 'mp4';
        const fName = `input${i}.${ext}`;
        fileNames.push(fName);
        
        const data = await files[i].arrayBuffer();
        await engine.current.writeFile(fName, new Uint8Array(data));
        
        inputArgs.push('-i', fName);
      }
      
      const cols = activeLayout.cols;
      const rows = activeLayout.rows;
      const res = totalRequired >= 9 ? 200 : 400; // base resolution

      let filterStr = "";
      
      // 1. Scale and pad each input
      for(let i = 0; i < totalRequired; i++) {
        // Base scale crop to square
        let nodeFilter = `scale=${res}:${res}:force_original_aspect_ratio=decrease,pad=${res}:${res}:(ow-iw)/2:(oh-ih)/2,setsar=1`;
        
        // Add white photo booth border if enabled
        if (enableBorders) {
          const b = Math.floor(res * 0.05); // 5% border
          nodeFilter += `,pad=iw+${b*2}:ih+${b*2}:${b}:${b}:color=white`;
        }
        
        filterStr += `[${i}:v]${nodeFilter}[v${i}];`;
      }

      // 2. hstack rows (if columns > 1)
      if (cols > 1) {
        for(let r = 0; r < rows; r++) {
          let rowInputs = "";
          for(let c = 0; c < cols; c++) {
            rowInputs += `[v${r*cols + c}]`;
          }
          if (rows === 1) {
            filterStr += `${rowInputs}hstack=inputs=${cols}`;
          } else {
            filterStr += `${rowInputs}hstack=inputs=${cols}[h${r}];`;
          }
        }
      }

      // 3. vstack cols (if rows > 1)
      if (rows > 1) {
        let colInputs = "";
        for(let r = 0; r < rows; r++) {
          if (cols === 1) {
            colInputs += `[v${r}]`; // directly use scaled inputs if 1 column
          } else {
            colInputs += `[h${r}]`; // use hstacked rows
          }
        }
        filterStr += `${colInputs}vstack=inputs=${rows}`;
      }
      
      // If we enabled borders and it's a photo strip, let's add a thicker border to the final output to make it look like a real strip!
      if (enableBorders) {
        const outerB = Math.floor(res * 0.05);
        filterStr += `,pad=iw+${outerB*2}:ih+${outerB*2}:${outerB}:${outerB}:color=white`;
      }
      
      const command = [
        ...inputArgs,
        '-filter_complex', filterStr,
        outputName
      ];
      
      await engine.current.exec(command);
      
      const data = await engine.current.readFile(outputName);
      const blob = new Blob([data as BlobPart], { type: isGif ? 'image/gif' : 'video/mp4' });
      setResult({ url: URL.createObjectURL(blob), isVideo: !isGif });
      
      // Cleanup
      for (const fName of fileNames) {
        await engine.current.deleteFile(fName);
      }
      
    } catch (err: any) {
      console.error(err);
    }
  };

  const handleReset = () => {
    if (result) URL.revokeObjectURL(result.url);
    setResult(null);
    setFiles([]);
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-6xl mx-auto">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
          <LayoutGrid className="w-8 h-8 text-primary" />
          Collage Maker
        </h1>
        <p className="text-muted-foreground">
          Combine multiple Images, GIFs, or Videos into perfect grids and photo strips.
        </p>
      </div>

      {!isReady && (
        <div className="p-8 border border-border rounded-xl bg-card flex flex-col items-center justify-center gap-4 text-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Initializing WebAssembly Engine...</p>
        </div>
      )}

      {isReady && !result && (
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <label className="font-medium">Select Grid Size</label>
              <label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={enableBorders} 
                  onChange={(e) => setEnableBorders(e.target.checked)}
                  className="rounded border-border"
                />
                Photo Booth Borders
              </label>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              {GRID_OPTIONS.map((opt) => {
                const Icon = opt.icon;
                return (
                  <button
                    key={opt.id}
                    onClick={() => {
                      setActiveLayout(opt);
                      const req = opt.cols * opt.rows;
                      if (files.length > 0) {
                        // Tile the existing files to fill the new grid size
                        const tiled = [];
                        for (let i = 0; i < req; i++) {
                          const row = Math.floor(i / opt.cols);
                          const col = i % opt.cols;
                          tiled.push(files[(row + col) % files.length]);
                        }
                        setFiles(tiled);
                      }
                    }}
                    className={cn(
                      "p-3 rounded-lg border text-sm font-medium transition-all flex flex-col items-center justify-center gap-2",
                      activeLayout.id === opt.id 
                        ? "border-primary bg-primary/10 text-primary" 
                        : "border-border bg-card text-muted-foreground hover:bg-secondary/50"
                    )}
                  >
                    <Icon className="w-5 h-5" />
                    {opt.label}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="flex flex-col gap-4 border border-border bg-card rounded-xl p-6">
            <div className="flex items-center justify-between">
              <p className="font-medium">
                Upload Files ({files.length} of {totalRequired})
              </p>
              {files.length > 0 && (
                <button
                  onClick={() => setFiles([])}
                  className="text-sm text-muted-foreground hover:text-foreground underline underline-offset-4"
                >
                  Clear All
                </button>
              )}
            </div>

            {files.length < totalRequired && (
              <FileUploader
                onFileSelect={(f) => {
                  const newFiles = Array.isArray(f) ? f : [f];
                  setFiles(prev => [...prev, ...newFiles].slice(0, totalRequired));
                }}
                accept="video/*,image/*"
                multiple={true}
                description={`Select up to ${totalRequired - files.length} files`}
              />
            )}

            {files.length > 0 && (
              <div 
                className={cn(
                  "grid gap-4 mt-4",
                  activeLayout.cols === 1 ? "grid-cols-2 md:grid-cols-4" : (
                    activeLayout.cols === 2 ? "grid-cols-2 md:grid-cols-4" : (
                      activeLayout.cols === 3 ? "grid-cols-3" : "grid-cols-4"
                    )
                  )
                )}
              >
                {files.map((f, i) => (
                  <div key={i} className="relative aspect-square rounded-lg overflow-hidden border border-border bg-secondary/30">
                    {fileUrls[i] ? (
                      <img src={fileUrls[i]} className="w-full h-full object-cover" alt={`Upload ${i+1}`} />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <ImageIcon className="w-6 h-6 text-muted-foreground opacity-50" />
                      </div>
                    )}
                    <div className="absolute top-2 left-2 bg-black/60 text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center backdrop-blur-md">
                      {i + 1}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {files.length === totalRequired && (
              <div className="flex flex-col gap-4 mt-4">
                <button
                  onClick={handleProcess}
                  disabled={isProcessing}
                  className="w-full flex items-center justify-center gap-2 p-4 rounded-lg bg-primary text-primary-foreground font-medium hover:opacity-90 active:scale-95 transition-all disabled:opacity-50"
                >
                  {isProcessing ? (
                    <><Loader2 className="w-5 h-5 animate-spin" /> Merging... {Math.round(progress * 100)}%</>
                  ) : (
                    "Create Collage"
                  )}
                </button>
                {error && <p className="text-sm text-destructive text-center">{error}</p>}
              </div>
            )}
          </div>
        </div>
      )}

      {result && (
        <div className="flex flex-col gap-6 border border-border rounded-xl bg-card p-6 animate-in fade-in zoom-in duration-300">
          <div className="w-full bg-black/5 rounded-lg flex items-center justify-center min-h-[300px] p-4">
            {result.isVideo ? (
               <video src={result.url} autoPlay loop muted playsInline className="max-w-full max-h-[60vh] object-contain rounded-lg shadow-lg pointer-events-none" />
            ) : (
               <img src={result.url} className="max-w-full max-h-[60vh] object-contain rounded-lg shadow-lg" />
            )}
          </div>
          
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <a
              href={result.url}
              download={`gifter_collage_${Date.now()}.${result.isVideo ? 'mp4' : 'gif'}`}
              className="w-full sm:w-auto flex-1 flex items-center justify-center gap-2 p-4 rounded-lg bg-primary text-primary-foreground font-medium hover:opacity-90 active:scale-95 transition-all"
            >
              Download Collage
            </a>
            <button
              onClick={handleReset}
              className="w-full sm:w-auto flex-1 flex items-center justify-center gap-2 p-4 rounded-lg border border-border bg-card text-foreground font-medium hover:bg-secondary/50 active:scale-95 transition-all"
            >
              Make Another
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
