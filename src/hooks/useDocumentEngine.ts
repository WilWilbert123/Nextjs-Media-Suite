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

  const processWordToHtml = async (file: File): Promise<string | null> => {
    setIsProcessing(true);
    setError(null);
    try {
      return await DocumentEngine.wordToHtml(file);
    } catch (err: any) {
      setError(err.message || "Failed to convert Word to HTML.");
      return null;
    } finally {
      setIsProcessing(false);
    }
  };

  const processWordToText = async (file: File): Promise<string | null> => {
    setIsProcessing(true);
    setError(null);
    try {
      return await DocumentEngine.wordToText(file);
    } catch (err: any) {
      setError(err.message || "Failed to extract text from Word document.");
      return null;
    } finally {
      setIsProcessing(false);
    }
  };

  const processWordToPng = async (file: File): Promise<string[] | null> => {
    setIsProcessing(true);
    setError(null);
    try {
      const blobs = await DocumentEngine.wordToPng(file);
      return blobs.map((blob) => URL.createObjectURL(blob));
    } catch (err: any) {
      setError(err.message || "Failed to convert Word document to PNG.");
      return null;
    } finally {
      setIsProcessing(false);
    }
  };

  const processPdfToPng = async (file: File): Promise<string[] | null> => {
    setIsProcessing(true);
    setError(null);
    try {
      const blobs = await DocumentEngine.pdfToPng(file);
      return blobs.map((blob) => URL.createObjectURL(blob));
    } catch (err: any) {
      setError(err.message || "Failed to convert PDF to PNG.");
      return null;
    } finally {
      setIsProcessing(false);
    }
  };

  const processPdfToJpeg = async (file: File): Promise<string[] | null> => {
    setIsProcessing(true);
    setError(null);
    try {
      const blobs = await DocumentEngine.pdfToJpeg(file);
      return blobs.map((blob) => URL.createObjectURL(blob));
    } catch (err: any) {
      setError(err.message || "Failed to convert PDF to JPEG.");
      return null;
    } finally {
      setIsProcessing(false);
    }
  };

  const processPdfToDocx = async (file: File): Promise<string | null> => {
    setIsProcessing(true);
    setError(null);
    try {
      const blob = await DocumentEngine.pdfToDocx(file);
      return URL.createObjectURL(blob);
    } catch (err: any) {
      setError(err.message || "Failed to convert PDF to DOCX.");
      return null;
    } finally {
      setIsProcessing(false);
    }
  };

  const processPdfToExcel = async (file: File): Promise<string | null> => {
    setIsProcessing(true);
    setError(null);
    try {
      const blob = await DocumentEngine.pdfToExcel(file);
      return URL.createObjectURL(blob);
    } catch (err: any) {
      setError(err.message || "Failed to convert PDF to Excel.");
      return null;
    } finally {
      setIsProcessing(false);
    }
  };

  const processWordToExcel = async (file: File): Promise<string | null> => {
    setIsProcessing(true);
    setError(null);
    try {
      const blob = await DocumentEngine.wordToExcel(file);
      return URL.createObjectURL(blob);
    } catch (err: any) {
      setError(err.message || "Failed to convert Word to Excel (ensure the document contains tables).");
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
      const blob = new Blob([uint8Array as BlobPart], { type: "application/pdf" });
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
      const blob = new Blob([uint8Array as BlobPart], { type: "application/pdf" });
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
        const blob = new Blob([arr as BlobPart], { type: "application/pdf" });
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
    processWordToHtml,
    processWordToText,
    processWordToPng,
    processWordToExcel,
    processExcelToPdf,
    processImagesToPdf,
    processMergePdfs,
    processSplitPdf,
    processPdfToText,
    processPdfToPng,
    processPdfToJpeg,
    processPdfToDocx,
    processPdfToExcel
  };
}
