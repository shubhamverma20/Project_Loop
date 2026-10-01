import { GoogleGenAI } from "@google/genai"

export async function generateEmbedding(text: string): Promise<number[]> {
  const apiKey = (process.env.GEMINI_API_KEY || "").trim().replace(/^["']|["']$/g, "")
  if (!apiKey || apiKey.startsWith("your_")) {
    return generateFallbackEmbedding(text)
  }

  try {
    const ai = new GoogleGenAI({ apiKey })
    const response = await ai.models.embedContent({
      model: "text-embedding-004",
      contents: text
    })

    const values = (response as any).embedding?.values || (response as any).embeddings?.[0]?.values
    if (values && values.length === 768) {
      return values
    }
  } catch (error: any) {
    console.error("Gemini Embedding API Error:", error?.message || error)
  }

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
