import * as pdfLib from "pdf-lib";
import * as mammoth from "mammoth";
import * as XLSX from "xlsx";

export type DocumentOperation = 
  | "word-to-pdf"
  | "word-to-html"
  | "excel-to-pdf"
  | "excel-to-csv"
  | "pdf-to-images"
  | "pdf-to-text"
  | "images-to-pdf"
  | "merge-pdfs"
  | "split-pdf";

export class DocumentEngine {
  
  /**
   * Reads a file into an ArrayBuffer
   */
  static async readFileAsBuffer(file: File): Promise<ArrayBuffer> {
    return await file.arrayBuffer();
  }

  /**
   * Word (.docx) to HTML
   */
  static async wordToHtml(file: File): Promise<string> {
    const buffer = await this.readFileAsBuffer(file);
    const result = await mammoth.convertToHtml({ arrayBuffer: buffer });
    return result.value;
  }

  /**
   * Word (.docx) to Text
   */
  static async wordToText(file: File): Promise<string> {
    const buffer = await this.readFileAsBuffer(file);
    const result = await mammoth.extractRawText({ arrayBuffer: buffer });
    return result.value;
  }

  /**
   * Word (.docx) to PDF
   */
  static async wordToPdf(file: File): Promise<Blob> {
    const html = await this.wordToHtml(file);
    
    // Create an invisible container for the HTML
    const container = document.createElement('div');
    container.innerHTML = `<div style="padding: 20px; font-family: sans-serif;">${html}</div>`;
    document.body.appendChild(container);
    
    const opt = {
      margin:       0.5,
      filename:     'document.pdf',
      image:        { type: 'jpeg', quality: 0.98 },
      html2canvas:  { scale: 2 },
      jsPDF:        { unit: 'in', format: 'letter', orientation: 'portrait' }
    };
    
    
    try {
      const html2pdfModule = (await import("html2pdf.js")).default;
      const pdfBlob = await html2pdfModule().set(opt).from(container).output('blob');
      return pdfBlob;
    } finally {
      document.body.removeChild(container);
    }
  }

  /**
   * PDF to Text Extraction
   */
  static async pdfToText(file: File): Promise<string> {
    const pdfjsLib = await import("pdfjs-dist");
    
    // Initialize pdfjs worker on first use
    if (typeof window !== "undefined" && !pdfjsLib.GlobalWorkerOptions.workerSrc) {
      pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
    }

    const buffer = await this.readFileAsBuffer(file);
    const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
    
    let fullText = "";
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map((item: any) => item.str).join(" ");
      fullText += `--- Page ${i} ---\n${pageText}\n\n`;
    }
    
    return fullText;
  }

  /**
   * Images to a single PDF
   */
  static async imagesToPdf(files: File[]): Promise<Uint8Array> {
    const pdfDoc = await pdfLib.PDFDocument.create();

    for (const file of files) {
      const imgBuffer = await this.readFileAsBuffer(file);
      let img;
      
      if (file.type === "image/jpeg") {
        img = await pdfDoc.embedJpg(imgBuffer);
      } else if (file.type === "image/png") {
        img = await pdfDoc.embedPng(imgBuffer);
      } else {
        throw new Error(`Unsupported image format: ${file.type}. Only JPG/PNG are supported for direct embedding.`);
      }

      const page = pdfDoc.addPage([img.width, img.height]);
      page.drawImage(img, {
        x: 0,
        y: 0,
        width: img.width,
        height: img.height,
      });
    }

    return await pdfDoc.save();
  }

  /**
   * Merge Multiple PDFs
   */
  static async mergePdfs(files: File[]): Promise<Uint8Array> {
    const mergedPdf = await pdfLib.PDFDocument.create();

    for (const file of files) {
      const buffer = await this.readFileAsBuffer(file);
      const pdf = await pdfLib.PDFDocument.load(buffer);
      
      const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
      copiedPages.forEach((page) => mergedPdf.addPage(page));
    }

    return await mergedPdf.save();
  }

  /**
   * Split PDF into separate pages (returns a zip or multiple files, we'll return an array of uint8arrays)
   */
  static async splitPdf(file: File): Promise<Uint8Array[]> {
    const buffer = await this.readFileAsBuffer(file);
    const originalPdf = await pdfLib.PDFDocument.load(buffer);
    const pagesCount = originalPdf.getPageCount();
    
    const splitFiles: Uint8Array[] = [];
    
    for (let i = 0; i < pagesCount; i++) {
      const newPdf = await pdfLib.PDFDocument.create();
      const [copiedPage] = await newPdf.copyPages(originalPdf, [i]);
      newPdf.addPage(copiedPage);
      splitFiles.push(await newPdf.save());
    }
    
    return splitFiles;
  }

  /**
   * Excel to CSV
   */
  static async excelToCsv(file: File): Promise<string> {
    const buffer = await this.readFileAsBuffer(file);
    const workbook = XLSX.read(buffer, { type: "array" });
    
    // Just grab the first sheet
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    
    return XLSX.utils.sheet_to_csv(worksheet);
  }

  /**
   * Excel to PDF
   */
  static async excelToPdf(file: File): Promise<Blob> {
    const buffer = await this.readFileAsBuffer(file);
    const workbook = XLSX.read(buffer, { type: "array" });
    
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    
    const html = XLSX.utils.sheet_to_html(worksheet);
    
    const container = document.createElement('div');
    // Add some basic styling for the table
    container.innerHTML = `
      <style>
        table { border-collapse: collapse; width: 100%; font-family: sans-serif; font-size: 10px; }
        td, th { border: 1px solid #ddd; padding: 4px; }
      </style>
      <div style="padding: 20px;">${html}</div>
    `;
    document.body.appendChild(container);
    
    const opt = {
      margin:       0.5,
      filename:     'spreadsheet.pdf',
      image:        { type: 'jpeg', quality: 0.98 },
      html2canvas:  { scale: 2 },
      jsPDF:        { unit: 'in', format: 'landscape', orientation: 'landscape' }
    };
    
    try {
      const html2pdfModule = (await import("html2pdf.js")).default;
      const pdfBlob = await html2pdfModule().set(opt).from(container).output('blob');
      return pdfBlob;
    } finally {
      document.body.removeChild(container);
    }
  }
}
