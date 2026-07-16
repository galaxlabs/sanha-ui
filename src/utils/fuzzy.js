/* Levenshtein distance */
export function levenshtein(a, b) {
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

/* similarity ratio 0-1 */
export function similarity(a, b) {
  if (!a || !b) return 0;
  const al = a.toLowerCase().trim(), bl = b.toLowerCase().trim();
  if (al === bl) return 1;
  const maxLen = Math.max(al.length, bl.length);
  if (maxLen === 0) return 1;
  return 1 - levenshtein(al, bl) / maxLen;
}

/* Find best matches above threshold */
export function fuzzyFind(input, candidates, { threshold = 0.5, maxResults = 5 } = {}) {
  if (!input || !candidates?.length) return [];
  const q = input.toLowerCase().trim();
  const scored = candidates.map(c => {
    const s = similarity(q, c);
    const substr = c.toLowerCase().includes(q) ? 0.1 : 0;
    return { value: c, score: Math.min(1, s + substr) };
  });
  return scored
    .filter(x => x.score >= threshold)
    .sort((a, b) => b.score - a.score)
    .slice(0, maxResults);
}
