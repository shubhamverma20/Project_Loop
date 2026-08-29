import { pipeline } from '@xenova/transformers';

// Singleton for the pipeline
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let extractor: any = null;

export async function generateEmbedding(text: string): Promise<number[]> {
  if (!extractor) {
    // Lazy load the pipeline
    extractor = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2', {
      quantized: true, // Use quantized model for faster CPU inference
    });
  }

  // Generate embedding
  const output = await extractor(text, { pooling: 'mean', normalize: true });
  
  // Return as a standard array of numbers
  return Array.from(output.data);
}
