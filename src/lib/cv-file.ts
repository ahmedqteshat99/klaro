import { GlobalWorkerOptions, getDocument } from "pdfjs-dist/legacy/build/pdf";
import pdfWorker from "pdfjs-dist/legacy/build/pdf.worker?url";
import mammoth from "mammoth";

GlobalWorkerOptions.workerSrc = pdfWorker;

const PDF_MIME = "application/pdf";
const DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

const normalizeText = (text: string) =>
  text
    .replace(/\r/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

const getFileExt = (file: File) => file.name.split(".").pop()?.toLowerCase() || "";

const readPdfText = async (file: File) => {
  const buffer = await file.arrayBuffer();
  const pdf = await getDocument({ data: buffer }).promise;
  const pages: string[] = [];

  for (let pageIndex = 1; pageIndex <= pdf.numPages; pageIndex += 1) {
    const page = await pdf.getPage(pageIndex);
    const content = await page.getTextContent();
    const pageText = content.items
      .map((item) => ("str" in item ? item.str : ""))
      .join(" ");
    pages.push(pageText);
  }

  return normalizeText(pages.join("\n\n"));
};

const readDocxText = async (file: File) => {
  const buffer = await file.arrayBuffer();
  const { value } = await mammoth.extractRawText({ arrayBuffer: buffer });
  return normalizeText(value || "");
};

export const readCvFile = async (file: File) => {
  const ext = getFileExt(file);
  if (file.type === PDF_MIME || ext === "pdf") {
    return readPdfText(file);
  }
  if (file.type === DOCX_MIME || ext === "docx") {
    return readDocxText(file);
  }
  if (file.type.startsWith("text/") || ext === "txt") {
    const text = await file.text();
    return normalizeText(text);
  }
  throw new Error("Dateiformat nicht unterstützt. Bitte PDF oder DOCX verwenden.");
};
