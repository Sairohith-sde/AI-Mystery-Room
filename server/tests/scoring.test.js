import { describe, expect, it } from 'vitest';
import { computeScore } from '../src/services/scoring.js';

const cases = [
  { difficulty: 'easy', correct: true, cluesDiscovered: 0, hintsUsed: 0, expected: 100 },
  { difficulty: 'easy', correct: true, cluesDiscovered: 5, hintsUsed: 2, expected: 105 },
  { difficulty: 'medium', correct: true, cluesDiscovered: 7, hintsUsed: 3, expected: 155 },
  { difficulty: 'hard', correct: true, cluesDiscovered: 9, hintsUsed: 3, expected: 215 },
  { difficulty: 'hard', correct: true, cluesDiscovered: 3, hintsUsed: 0, expected: 215 },
  { difficulty: 'medium', correct: false, cluesDiscovered: 7, hintsUsed: 0, expected: 35 },
  { difficulty: 'easy', correct: false, cluesDiscovered: 1, hintsUsed: 2, expected: 0 },
];

describe('computeScore', () => {
  for (const testCase of cases) {
    it(`computes ${testCase.expected} for ${testCase.difficulty} ${testCase.correct ? 'correct' : 'wrong'} clues=${testCase.cluesDiscovered} hints=${testCase.hintsUsed}`, () => {
      expect(
        computeScore({
          difficulty: testCase.difficulty,
          correct: testCase.correct,
          cluesDiscovered: testCase.cluesDiscovered,
          hintsUsed: testCase.hintsUsed,
        }),
      ).toBe(testCase.expected);
    });
  }
});