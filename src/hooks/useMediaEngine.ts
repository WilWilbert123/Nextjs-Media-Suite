"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { getFFmpeg, processVideo, processImagesToGif, processWithWatermark, abortFFmpeg } from "../lib/engines/ffmpeg";
import type { FFmpeg } from "@ffmpeg/ffmpeg";

export function useMediaEngine() {
  const engine = useRef<FFmpeg | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Initialize engine on mount (or lazily when needed)
  useEffect(() => {
    let mounted = true;
    getFFmpeg()
      .then((ffmpeg) => {
        engine.current = ffmpeg;
        if (mounted) setIsReady(true);
      })
      .catch((err) => {
        if (mounted) setError(`Failed to load media engine: ${err.message}`);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const convertVideo = useCallback(
    async (file: File, args: string[], outputExt: string = ".mp4") => {
      setIsProcessing(true);
      setProgress(0);
      setError(null);
      
      try {
        const outputName = `output${outputExt}`;
        const data = await processVideo(file, args, outputName, setProgress);
        
        const isAudio = [".mp3", ".wav", ".aac", ".ogg"].includes(outputExt);
        const mimeType = isAudio ? `audio/${outputExt.slice(1)}` : `video/${outputExt.slice(1)}`;
        
        // Ensure data is compatible with Blob by taking its buffer or casting
        const blob = new Blob([new Uint8Array(data)], { type: mimeType });
        return URL.createObjectURL(blob);
      } catch (err: any) {
        setError(err.message || "An error occurred during processing");
        return null;
      } finally {
        setIsProcessing(false);
        setProgress(0);
      }
    },
    []
  );

  const convertImagesToGif = useCallback(
    async (files: File[], fps: number = 10, options: { format: 'gif' | 'webp'; scale: string; loop: boolean } = { format: 'gif', scale: 'original', loop: true }) => {
      setIsProcessing(true);
      setProgress(0);
      setError(null);
      
      try {
        const outputName = `output.${options.format}`;
        const data = await processImagesToGif(files, fps, options, outputName, setProgress);
        
        const blob = new Blob([new Uint8Array(data)], { type: `image/${options.format}` });
        return URL.createObjectURL(blob);
      } catch (err: any) {
        setError(err.message || "An error occurred during processing");
        return null;
      } finally {
        setIsProcessing(false);
        setProgress(0);
      }
    },
    []
  );

  const convertWithWatermark = useCallback(
    async (targetFile: File, watermarkFile: File, args: string[], outputExt: string = ".mp4") => {
      setIsProcessing(true);
      setProgress(0);
      setError(null);
      
      try {
        const outputName = `output${outputExt}`;
        const data = await processWithWatermark(targetFile, watermarkFile, args, outputName, setProgress);
        
        const blob = new Blob([new Uint8Array(data)], { type: outputExt === '.gif' ? 'image/gif' : (outputExt === '.jpg' || outputExt === '.jpeg' ? 'image/jpeg' : (outputExt === '.png' ? 'image/png' : `video/${outputExt.slice(1)}`)) });
        return URL.createObjectURL(blob);
      } catch (err: any) {
        setError(err.message || "An error occurred during processing");
        return null;
      } finally {
        setIsProcessing(false);
        setProgress(0);
      }
    },
    []
  );

  const cancelProcessing = useCallback(() => {
    abortFFmpeg();
    setIsProcessing(false);
    setProgress(0);
    setError("Processing cancelled by user.");
  }, []);

  return {
    engine,
    isReady,
    isProcessing,
    progress,
    error,
    convertVideo,
    convertImagesToGif,
    convertWithWatermark,
    cancelProcessing,
  };
}
