"use client";

import { useState } from "react";
import { DocumentEngine } from "../lib/engines/document";

export function useDocumentEngine() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const processWordToPdf = async (file: File): Promise<string | null> => {
    setIsProcessing(true);
    setError(null);
    try {
      const blob = await DocumentEngine.wordToPdf(file);
      return URL.createObjectURL(blob);
    } catch (err: any) {
      setError(err.message || "Failed to convert Word to PDF.");
      return null;
    } finally {
      setIsProcessing(false);
    }
  };

  const processExcelToPdf = async (file: File): Promise<string | null> => {
    setIsProcessing(true);
    setError(null);
    try {
      const blob = await DocumentEngine.excelToPdf(file);
      return URL.createObjectURL(blob);
    } catch (err: any) {
      setError(err.message || "Failed to convert Excel to PDF.");
      return null;
    } finally {
      setIsProcessing(false);
    }
  };

  const processPdfToText = async (file: File): Promise<string | null> => {
    setIsProcessing(true);
    setError(null);
    try {
      return await DocumentEngine.pdfToText(file);
    } catch (err: any) {
      setError(err.message || "Failed to extract text from PDF.");
      return null;
    } finally {
      setIsProcessing(false);
    }
  };

  const processImagesToPdf = async (files: File[]): Promise<string | null> => {
    setIsProcessing(true);
    setError(null);
    try {
      const uint8Array = await DocumentEngine.imagesToPdf(files);
      const blob = new Blob([uint8Array], { type: "application/pdf" });
      return URL.createObjectURL(blob);
    } catch (err: any) {
      setError(err.message || "Failed to convert images to PDF.");
      return null;
    } finally {
      setIsProcessing(false);
    }
  };

  const processMergePdfs = async (files: File[]): Promise<string | null> => {
    setIsProcessing(true);
    setError(null);
    try {
      const uint8Array = await DocumentEngine.mergePdfs(files);
      const blob = new Blob([uint8Array], { type: "application/pdf" });
      return URL.createObjectURL(blob);
    } catch (err: any) {
      setError(err.message || "Failed to merge PDFs.");
      return null;
    } finally {
      setIsProcessing(false);
    }
  };

  const processSplitPdf = async (file: File): Promise<string[] | null> => {
    setIsProcessing(true);
    setError(null);
    try {
      const uint8Arrays = await DocumentEngine.splitPdf(file);
      return uint8Arrays.map(arr => {
        const blob = new Blob([arr], { type: "application/pdf" });
        return URL.createObjectURL(blob);
      });
    } catch (err: any) {
      setError(err.message || "Failed to split PDF.");
      return null;
    } finally {
      setIsProcessing(false);
    }
  };

  return {
    isProcessing,
    error,
    processWordToPdf,
    processExcelToPdf,
    processPdfToText,
    processImagesToPdf,
    processMergePdfs,
    processSplitPdf,
  };
}
