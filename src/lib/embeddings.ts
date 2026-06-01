// Embeddings are stored for future vector search but not actively used —
// all matching runs through the Python pipeline (izhaar-agents).
// Returning zero vectors so ingest routes work without an embedding provider.

export const EMBEDDING_DIM = 1536;

export async function embed(_text: string): Promise<number[]> {
  return new Array(EMBEDDING_DIM).fill(0);
}

export async function embedBatch(texts: string[]): Promise<number[][]> {
  return texts.map(() => new Array(EMBEDDING_DIM).fill(0));
}

export function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}

export function serializeEmbedding(vec: number[]): string {
  return `[${vec.join(",")}]`;
}

export function deserializeEmbedding(str: string): number[] {
  return JSON.parse(str) as number[];
}
