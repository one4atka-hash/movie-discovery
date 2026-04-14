const EMBEDDING_DIM = 1536;

function fnv1a32(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

function xorshift32(state: number): number {
  // uint32 xorshift
  let x = state >>> 0;
  x ^= x << 13;
  x ^= x >>> 17;
  x ^= x << 5;
  return x >>> 0;
}

export function deterministicEmbedding(input: {
  tmdbId: number;
  title?: string | null;
  overview?: string | null;
  lang?: string | null;
}): number[] {
  const seedStr = `${input.tmdbId}|${input.lang ?? ''}|${input.title ?? ''}|${
    input.overview ?? ''
  }`;
  let state = fnv1a32(seedStr) || 1;

  const v = new Array<number>(EMBEDDING_DIM);
  let sumSq = 0;
  for (let i = 0; i < EMBEDDING_DIM; i += 1) {
    state = xorshift32(state);
    // map uint32 -> (-1..1)
    const x = (state / 0xffffffff) * 2 - 1;
    v[i] = x;
    sumSq += x * x;
  }
  const norm = Math.sqrt(sumSq) || 1;
  for (let i = 0; i < EMBEDDING_DIM; i += 1) v[i] = (v[i] ?? 0) / norm;
  return v;
}

export function toPgVectorLiteral(v: readonly number[]): string {
  // pgvector accepts: '[1,2,3]'::vector
  // Keep precision moderate to reduce payload.
  return `[${v.map((x) => Number(x).toFixed(6)).join(',')}]`;
}

export function parsePgVectorLiteral(raw: unknown): number[] | null {
  if (typeof raw !== 'string') return null;
  const s = raw.trim();
  if (!s.startsWith('[') || !s.endsWith(']')) return null;
  const inner = s.slice(1, -1).trim();
  if (!inner) return [];
  const parts = inner.split(',');
  const out: number[] = [];
  for (const p of parts) {
    const n = Number(p);
    if (!Number.isFinite(n)) return null;
    out.push(n);
  }
  return out;
}

export function meanNormalized(vectors: readonly number[][]): number[] | null {
  if (!vectors.length) return null;
  const dim = vectors[0]?.length ?? 0;
  if (!dim) return null;
  for (const v of vectors) if (v.length !== dim) return null;

  const out = new Array<number>(dim).fill(0);
  for (const v of vectors) {
    for (let i = 0; i < dim; i += 1) out[i] += v[i] ?? 0;
  }
  for (let i = 0; i < dim; i += 1) out[i] /= vectors.length;

  let sumSq = 0;
  for (let i = 0; i < dim; i += 1) sumSq += (out[i] ?? 0) * (out[i] ?? 0);
  const norm = Math.sqrt(sumSq) || 1;
  for (let i = 0; i < dim; i += 1) out[i] /= norm;
  return out;
}

export function cosineSimilarity(
  a: readonly number[],
  b: readonly number[],
): number {
  if (a.length === 0 || b.length === 0) return 0;
  if (a.length !== b.length) return 0;
  let dot = 0;
  let aa = 0;
  let bb = 0;
  for (let i = 0; i < a.length; i += 1) {
    const x = a[i] ?? 0;
    const y = b[i] ?? 0;
    dot += x * y;
    aa += x * x;
    bb += y * y;
  }
  const denom = Math.sqrt(aa) * Math.sqrt(bb);
  return denom ? dot / denom : 0;
}
