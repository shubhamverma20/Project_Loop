export async function generateEmbedding(text: string): Promise<number[]> {
  const vector = new Array(384).fill(0)
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i)
    vector[i % 384] += code / 255
  }
  const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0)) || 1
  return vector.map(v => v / magnitude)
}
