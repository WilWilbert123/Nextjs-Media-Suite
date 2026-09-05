import * as pdfLib from "pdf-lib";
import * as mammoth from "mammoth";
import * as XLSX from "xlsx";

export type DocumentOperation = 
  | "word-to-pdf"
  | "word-to-html"
  | "word-to-png"
  | "word-to-excel"
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
    const buffer = await this.readFileAsBuffer(file);
    
    // Create a hidden wrapper so it doesn't disrupt the UI
    const wrapper = document.createElement('div');
    wrapper.style.width = "0";
    wrapper.style.height = "0";
    wrapper.style.overflow = "hidden";
    wrapper.style.position = "fixed";
    wrapper.style.top = "0";
    wrapper.style.left = "0";
    
    // Create the actual container for docx-preview
    const container = document.createElement('div');
    container.style.width = "816px"; // 8.5 inches at 96 DPI
    container.style.minHeight = "1056px"; // 11 inches
    container.style.background = "white";
    
    wrapper.appendChild(container);
    document.body.appendChild(wrapper);
    
    try {
      // docx-preview requires JSZip to be available on the window object
      const JSZip = (await import("jszip")).default;
      (window as any).JSZip = JSZip;

      const docx = await import("docx-preview");
      await docx.renderAsync(buffer, container, container, {
        inWrapper: false,
        ignoreWidth: false,
        ignoreHeight: false,
        ignoreFonts: false,
        breakPages: true,
        useBase64URL: true,
      });

      // Wait a moment for fonts and images to render in the DOM
      await new Promise(r => setTimeout(r, 200));
      
      const opt = {
        margin:       0,
        filename:     'document.pdf',
        image:        { type: 'jpeg', quality: 1.0 },
        html2canvas:  { scale: 2, useCORS: true },
        jsPDF:        { unit: 'in', format: 'letter', orientation: 'portrait' }
      };
      
      const html2pdfModule = (await import("html2pdf.js")).default;
      const pdfBlob = await html2pdfModule().set(opt).from(container).output('blob');
      return pdfBlob;
    } finally {
      document.body.removeChild(wrapper);
    }
  }

  /**
   * Generic PDF to Images renderer
   */
  static async renderPdfToImages(pdfBlob: Blob, type: "image/png" | "image/jpeg" = "image/png"): Promise<Blob[]> {
    const pdfjsLib = await import("pdfjs-dist");
    
    if (typeof window !== "undefined" && !pdfjsLib.GlobalWorkerOptions.workerSrc) {
      pdfjsLib.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
    }

    const buffer = await pdfBlob.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
    
    const blobs: Blob[] = [];
    
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const viewport = page.getViewport({ scale: 2.0 });
      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d");
      
      if (!context) throw new Error("Could not create canvas context");
      
      canvas.height = viewport.height;
      canvas.width = viewport.width;
      
      // Fill background for JPEGs since they don't support transparency
      if (type === "image/jpeg") {
        context.fillStyle = "#ffffff";
        context.fillRect(0, 0, canvas.width, canvas.height);
      }
      
      await page.render({
        canvasContext: context,
        viewport: viewport
      }).promise;
      
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((b) => {
          if (b) resolve(b);
          else reject(new Error("Canvas to Blob failed"));
        }, type, 0.95);
      });
      blobs.push(blob);
    }
    
    return blobs;
  }

  /**
   * Word (.docx) to PNG (All Pages)
   */
  static async wordToPng(file: File): Promise<Blob[]> {
    const pdfBlob = await this.wordToPdf(file);
    return this.renderPdfToImages(pdfBlob, "image/png");
  }

  /**
   * PDF to PNG (All Pages)
   */
  static async pdfToPng(file: File): Promise<Blob[]> {
    return this.renderPdfToImages(file, "image/png");
  }

  /**
   * PDF to JPEG (All Pages)
   */
  static async pdfToJpeg(file: File): Promise<Blob[]> {
    return this.renderPdfToImages(file, "image/jpeg");
  }

  /**
   * Word (.docx) to Excel (Extracts tables)
   */
  static async wordToExcel(file: File): Promise<Blob> {
    const html = await this.wordToHtml(file);
    
    // Parse HTML tables directly into an XLSX workbook
    const workbook = XLSX.read(html, { type: "string" });
    
    // If no tables were found, SheetNames might be empty or contain an empty sheet.
    if (!workbook.SheetNames.length) {
      throw new Error("No tables found in the Word document to extract.");
    }
    
    // Generate XLSX blob
    const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
    return new Blob([excelBuffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  }

  /**
   * PDF to Text
   */
  static async pdfToText(file: File): Promise<string> {
    const pdfjsLib = await import("pdfjs-dist");
    
    if (typeof window !== "undefined" && !pdfjsLib.GlobalWorkerOptions.workerSrc) {
      pdfjsLib.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
    }

    const buffer = await this.readFileAsBuffer(file);
    const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
    
    let text = "";
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const strings = content.items.map((item: any) => item.str);
      text += strings.join(" ") + "\n\n";
    }
    
    return text;
  }

  /**
   * PDF to DOCX
   */
  static async pdfToDocx(file: File): Promise<Blob> {
    const text = await this.pdfToText(file);
    const { Document, Packer, Paragraph, TextRun } = await import("docx");

    const paragraphs = text.split('\n').map(line => {
      return new Paragraph({
        children: [new TextRun(line)],
      });
    });

    const doc = new Document({
      sections: [{
        properties: {},
        children: paragraphs,
      }],
    });

    return await Packer.toBlob(doc);
  }

  /**
   * PDF to Excel (XLSX)
   */
  static async pdfToExcel(file: File): Promise<Blob> {
    const text = await this.pdfToText(file);
    const XLSX = await import("xlsx");

    // Split text into lines, then try to split lines into columns using 2+ spaces or tabs
    const rows = text.split('\n').map(line => {
      return line.trim().split(/\s{2,}|\t/);
    });

    const worksheet = XLSX.utils.aoa_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Extracted Data");

    const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
    return new Blob([excelBuffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
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
