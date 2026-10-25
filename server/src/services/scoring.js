export function computeScore({ difficulty, correct, cluesDiscovered, hintsUsed }) {
  const baseByDifficulty = {
    easy: 100,
    medium: 150,
    hard: 200,
  };

  const base = correct ? baseByDifficulty[difficulty] ?? 0 : 0;
  const clueBonus = 5 * Number(cluesDiscovered || 0);
  const hintPenalty = 10 * Number(hintsUsed || 0);

  return Math.max(0, base + clueBonus - hintPenalty);
}