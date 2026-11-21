/**
 * Chops a massive string of document text into smaller, overlapping segments.
 * Overlapping ensures that context isn't lost if an important term splits across chunks.
 */
export function splitTextIntoChunks(text, chunkSize = 800, overlap = 150) {
  const chunks = [];
  let currentIndex = 0;

  // Clean up excessive structural white spaces
  const cleanText = text.replace(/\s+/g, ' ').trim();

  while (currentIndex < cleanText.length) {
    const endIndex = currentIndex + chunkSize;
    const chunk = cleanText.substring(currentIndex, endIndex);
    
    chunks.push(chunk);
    
    // Move forward by chunk size minus overlap to retain context connection
    currentIndex += (chunkSize - overlap);
  }

  return chunks;
}
