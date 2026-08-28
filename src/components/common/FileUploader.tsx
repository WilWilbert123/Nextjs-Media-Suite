"use client";

import * as React from "react";
import { UploadCloud, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface FileUploaderProps {
  onFileSelect: (file: File | File[]) => void;
  accept?: string;
  maxSizeMB?: number;
  className?: string;
  multiple?: boolean;
  description?: string;
}

export function FileUploader({
  onFileSelect,
  accept = "image/*,video/*",
  maxSizeMB = 200, // Client side hard limit
  className,
  multiple = false,
  description = "Supports MP4, WebM, GIF, PNG, WebP",
}: FileUploaderProps) {
  const [isDragging, setIsDragging] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleFile = (files: FileList | File[]) => {
    setError(null);
    const fileArray = Array.from(files);
    
    // Check sizes
    for (let f of fileArray) {
      if (f.size > maxSizeMB * 1024 * 1024) {
        setError(`File ${f.name} size must be less than ${maxSizeMB}MB`);
        return;
      }
    }
    
    if (multiple) {
      onFileSelect(fileArray);
    } else {
      onFileSelect(fileArray[0]);
    }
  };

  const onDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = () => {
    setIsDragging(false);
  };

  const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFile(e.dataTransfer.files);
    }
  };

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFile(e.target.files);
    }
  };

  return (
    <div className={cn("w-full flex flex-col gap-4", className)}>
      <div
        className={cn(
          "relative flex flex-col items-center justify-center w-full min-h-[200px] rounded-xl border-2 border-dashed transition-colors duration-200 cursor-pointer p-6",
          isDragging
            ? "border-primary bg-accent"
            : "border-border hover:border-primary/50 hover:bg-muted/50"
        )}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="p-4 bg-muted rounded-full">
            <UploadCloud className="w-8 h-8 text-primary" />
          </div>
          <div>
            <p className="text-lg font-medium text-foreground">
              Click or drag and drop to upload
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              {description} up to {maxSizeMB}MB
            </p>
          </div>
        </div>
        <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          accept={accept}
          multiple={multiple}
          onChange={onChange}
        />
      </div>

      {error && (
        <div className="flex items-center gap-2 p-4 mt-2 text-destructive-foreground bg-destructive rounded-lg">
          <X className="w-5 h-5" />
          <p className="text-sm font-medium">{error}</p>
        </div>
      )}
    </div>
  );
}
