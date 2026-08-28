"use client";

import * as React from "react";
import { FileUploader } from "@/components/common/FileUploader";
import { useDocumentEngine } from "@/hooks/useDocumentEngine";
import { FileText, FileSpreadsheet, Images, CopyPlus, SplitSquareHorizontal, Download, RefreshCw, Loader2, Search, ArrowRight } from "lucide-react";

export default function DocumentHubPage() {
  const [files, setFiles] = React.useState<File[]>([]);
  const [activeOperation, setActiveOperation] = React.useState<string | null>(null);
  const [resultUrls, setResultUrls] = React.useState<string[]>([]);
  const [resultText, setResultText] = React.useState<string | null>(null);

  const {
    isProcessing,
    error,
    processWordToPdf,
    processExcelToPdf,
    processPdfToText,
    processImagesToPdf,
    processMergePdfs,
    processSplitPdf
  } = useDocumentEngine();

  const handleProcess = async () => {
    if (files.length === 0 || !activeOperation) return;
    
    setResultUrls([]);
    setResultText(null);

    try {
      if (activeOperation === "word-to-pdf") {
        const url = await processWordToPdf(files[0]);
        if (url) setResultUrls([url]);
      } else if (activeOperation === "excel-to-pdf") {
        const url = await processExcelToPdf(files[0]);
        if (url) setResultUrls([url]);
      } else if (activeOperation === "images-to-pdf") {
        const url = await processImagesToPdf(files);
        if (url) setResultUrls([url]);
      } else if (activeOperation === "merge-pdf") {
        const url = await processMergePdfs(files);
        if (url) setResultUrls([url]);
      } else if (activeOperation === "split-pdf") {
        const urls = await processSplitPdf(files[0]);
        if (urls) setResultUrls(urls);
      } else if (activeOperation === "pdf-to-text") {
        const text = await processPdfToText(files[0]);
        if (text) setResultText(text);
      }
    } catch (err: any) {
      console.error(err);
    }
  };

  const handleReset = () => {
    resultUrls.forEach((url) => URL.revokeObjectURL(url));
    setResultUrls([]);
    setResultText(null);
    setFiles([]);
    setActiveOperation(null);
  };

  // Determine available operations based on uploaded files
  const getAvailableOperations = () => {
    if (files.length === 0) return [];

    const isMultiple = files.length > 1;
    const firstType = files[0].type;
    const firstExt = files[0].name.split('.').pop()?.toLowerCase();

    const isWord = firstType.includes("word") || firstExt === "docx";
    const isExcel = firstType.includes("spreadsheet") || firstType.includes("excel") || firstExt === "xlsx";
    const isPdf = firstType === "application/pdf" || firstExt === "pdf";
    const areAllImages = files.every(f => f.type.startsWith("image/"));
    const areAllPdfs = files.every(f => f.type === "application/pdf");

    const ops = [];

    if (isWord && !isMultiple) {
      ops.push({ id: "word-to-pdf", icon: FileText, label: "Convert to PDF", desc: "Turn this Word document into a PDF." });
    }
    
    if (isExcel && !isMultiple) {
      ops.push({ id: "excel-to-pdf", icon: FileSpreadsheet, label: "Convert to PDF", desc: "Turn this Spreadsheet into a PDF." });
    }

    if (areAllImages) {
      ops.push({ id: "images-to-pdf", icon: Images, label: "Images to PDF", desc: "Combine these images into a single PDF document." });
    }

    if (isPdf && !isMultiple) {
      ops.push({ id: "split-pdf", icon: SplitSquareHorizontal, label: "Split PDF", desc: "Extract individual pages from this PDF." });
      ops.push({ id: "pdf-to-text", icon: Search, label: "Extract Text", desc: "Parse raw text data from this PDF." });
    }

    if (areAllPdfs && isMultiple) {
      ops.push({ id: "merge-pdf", icon: CopyPlus, label: "Merge PDFs", desc: "Combine all selected PDFs into one document." });
    }

    return ops;
  };

  const availableOps = getAvailableOperations();

  // If active operation is invalid after file change, reset it
  React.useEffect(() => {
    if (activeOperation && !availableOps.find(op => op.id === activeOperation)) {
      setActiveOperation(null);
    }
  }, [files, activeOperation, availableOps]);

  return (
    <div className="flex flex-col gap-6 w-full max-w-5xl mx-auto">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
          <FileText className="w-8 h-8 text-primary" />
          Universal Document Converter
        </h1>
        <p className="text-muted-foreground">
          Upload any file (Word, Excel, PDF, Images) and we'll show you what we can do with it!
        </p>
      </div>

      {/* Main Content Area */}
      {files.length === 0 ? (
        <div className="mt-4">
          <FileUploader
            onFileSelect={(f) => setFiles(Array.isArray(f) ? f : [f])}
            accept=".docx,.xlsx,.pdf,image/png,image/jpeg"
            multiple={true}
          />
        </div>
      ) : (
        <div className="flex flex-col gap-6 border border-border rounded-xl bg-card p-6 mt-4">
          
          {/* File Summary Header */}
          <div className="flex items-center justify-between pb-4 border-b border-border">
            <div>
              <p className="font-bold text-lg">
                {files.length === 1 ? files[0].name : `${files.length} files selected`}
              </p>
              <p className="text-sm text-muted-foreground">
                {files.length === 1 ? `${(files[0].size / 1024 / 1024).toFixed(2)} MB` : 'Multiple files ready for processing'}
              </p>
            </div>
            <button
              onClick={handleReset}
              className="text-sm px-4 py-2 bg-muted hover:bg-secondary rounded-lg font-medium transition-all"
              disabled={isProcessing}
            >
              Start Over
            </button>
          </div>

          {!isProcessing && resultUrls.length === 0 && !resultText ? (
            <div className="flex flex-col gap-4">
              {availableOps.length === 0 ? (
                <div className="p-4 bg-destructive/10 text-destructive rounded-lg font-medium text-center">
                  We don't support converting this combination of files yet. Please try uploading a single Word document, PDF, Excel file, or multiple images.
                </div>
              ) : (
                <>
                  <h3 className="font-bold text-lg mb-2">Select an operation:</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {availableOps.map((op) => {
                      const Icon = op.icon;
                      const isSelected = activeOperation === op.id;
                      return (
                        <button
                          key={op.id}
                          onClick={() => setActiveOperation(op.id)}
                          className={`flex flex-col gap-2 p-4 rounded-xl border-2 transition-all text-left group ${
                            isSelected
                              ? "border-primary bg-primary/10"
                              : "border-border hover:border-primary/50 hover:bg-muted/50"
                          }`}
                        >
                          <div className={`flex items-center gap-2 font-bold ${isSelected ? 'text-primary' : ''}`}>
                            <Icon className="w-5 h-5" />
                            {op.label}
                          </div>
                          <p className="text-sm text-muted-foreground">{op.desc}</p>
                        </button>
                      );
                    })}
                  </div>

                  {activeOperation && (
                    <button
                      onClick={handleProcess}
                      className="mt-4 flex items-center justify-center gap-2 p-4 rounded-xl bg-primary text-primary-foreground font-bold hover:opacity-90 active:scale-95 transition-all w-full text-lg shadow-xl shadow-primary/20"
                    >
                      Process Document <ArrowRight className="w-5 h-5" />
                    </button>
                  )}
                </>
              )}
            </div>
          ) : isProcessing ? (
            <div className="flex flex-col items-center justify-center py-12 gap-6">
              <Loader2 className="w-16 h-16 animate-spin text-primary" />
              <div className="text-center">
                <h3 className="font-bold text-lg">Processing your documents...</h3>
                <p className="text-sm text-muted-foreground">This is happening entirely in your browser memory.</p>
              </div>
            </div>
          ) : null}

          {error && (
            <div className="p-4 bg-destructive/10 text-destructive border border-destructive rounded-lg text-sm font-medium break-all">
              {error}
            </div>
          )}

          {/* Results Area */}
          {(resultUrls.length > 0 || resultText) && (
            <div className="flex flex-col gap-6 animate-in fade-in zoom-in duration-300">
              <div className="w-full bg-black/5 rounded-xl border border-border p-4 flex flex-col gap-4 max-h-[600px] overflow-y-auto shadow-inner">
                {resultText ? (
                  <pre className="whitespace-pre-wrap font-mono text-sm bg-background p-4 rounded-lg border border-border shadow-sm">{resultText}</pre>
                ) : resultUrls.length === 1 ? (
                  <iframe src={resultUrls[0]} className="w-full min-h-[500px] rounded-lg border border-border shadow-sm bg-background" />
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {resultUrls.map((url, i) => (
                      <div key={i} className="flex flex-col gap-2 bg-background p-2 rounded-lg border border-border shadow-sm">
                        <iframe src={url} className="w-full aspect-[3/4] rounded border-0 pointer-events-none" />
                        <a
                          href={url}
                          download={`page_${i + 1}.pdf`}
                          className="w-full flex items-center justify-center gap-2 py-2 rounded-md bg-primary/10 text-primary font-bold hover:bg-primary/20 transition-all text-xs"
                        >
                          <Download className="w-3 h-3" />
                          Save Page {i + 1}
                        </a>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              <div className="flex flex-col sm:flex-row items-center gap-4">
                {resultUrls.length === 1 && (
                  <a
                    href={resultUrls[0]}
                    download={`gifter_doc_${Date.now()}.pdf`}
                    className="w-full sm:w-auto flex-1 flex items-center justify-center gap-2 p-4 rounded-xl bg-primary text-primary-foreground font-bold hover:opacity-90 active:scale-95 transition-all text-lg shadow-xl shadow-primary/20"
                  >
                    <Download className="w-6 h-6" />
                    Download PDF Document
                  </a>
                )}
                {resultText && (
                  <button
                    onClick={() => {
                      const blob = new Blob([resultText], { type: "text/plain" });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement("a");
                      a.href = url;
                      a.download = `extracted_text_${Date.now()}.txt`;
                      a.click();
                      URL.revokeObjectURL(url);
                    }}
                    className="w-full sm:w-auto flex-1 flex items-center justify-center gap-2 p-4 rounded-xl bg-primary text-primary-foreground font-bold hover:opacity-90 active:scale-95 transition-all text-lg shadow-xl shadow-primary/20"
                  >
                    <Download className="w-6 h-6" />
                    Save Text File
                  </button>
                )}
                <button
                  onClick={handleReset}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 p-4 rounded-xl border-2 border-border hover:bg-muted font-bold transition-all text-lg"
                >
                  <RefreshCw className="w-5 h-5" />
                  Process Another
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
