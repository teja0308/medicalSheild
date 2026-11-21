import { PDFParse } from 'pdf-parse';

export async function extractTextFromPDFBuffer(pdfBuffer) {
  let parser;

  try {
    parser = new PDFParse({ data: pdfBuffer });
    const result = await parser.getText();

    return {
      text: result.text,
      pages: result.total,
    };
  } catch (error) {
    console.error('Error parsing PDF:', error);
    throw new Error('Failed to parse the uploaded PDF file.');
  } finally {
    if (parser) {
      await parser.destroy();
    }
  }
}
