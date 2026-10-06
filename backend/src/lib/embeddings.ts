export async function generateEmbedding(text: string): Promise<number[]> {
  return generateFallbackEmbedding(text)
}

function generateFallbackEmbedding(text: string): number[] {
  const vector = new Array(768).fill(0)
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i)
    vector[i % 768] += code / 255
  }
  const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0)) || 1
  return vector.map(v => v / magnitude)
}
