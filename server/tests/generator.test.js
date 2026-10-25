import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../src/services/gemini.js', () => ({
  callGeminiJson: vi.fn(),
}));

import { callGeminiJson } from '../src/services/gemini.js';
import { generateMystery } from '../src/services/generator.js';

const makeCase = (difficulty) => {
  const matrix = {
    easy: { suspects: 3, clues: 5, hints: 2 },
    medium: { suspects: 4, clues: 7, hints: 3 },
    hard: { suspects: 5, clues: 9, hints: 3 },
  }[difficulty];

  const suspects = Array.from({ length: matrix.suspects }, (_, idx) => ({
    id: `s${idx + 1}`,
    name: `Suspect ${idx + 1}`,
    role: `Role ${idx + 1}`,
    description: `Description for suspect ${idx + 1} with enough detail to be believable.`,
    alibi: `Alibi ${idx + 1} is consistent with the scene and timeline.`,
  }));

  const clues = Array.from({ length: matrix.clues }, (_, idx) => ({
    id: `c${idx + 1}`,
    label: `Clue ${idx + 1}`,
    text: `This is clue ${idx + 1} and it contains enough information for the player to reason.`,
    kind: idx % 2 === 0 ? 'incriminating' : idx === matrix.clues - 1 ? 'red_herring' : 'neutral',
    implicates: idx === 0 ? ['s1'] : idx === 1 ? ['s2'] : idx === 2 ? ['s3'] : [],
    clears: idx === 3 ? ['s1'] : [],
  }));

  if (difficulty === 'easy') {
    clues[0].implicates = ['s3'];
    clues[1].implicates = ['s3'];
    clues[2].implicates = ['s1'];
    clues[3].kind = 'red_herring';
    clues[4].kind = 'exculpatory';
    clues[4].clears = ['s2'];
  }

  if (difficulty === 'medium') {
    clues[0].implicates = ['s4'];
    clues[1].implicates = ['s4'];
    clues[2].implicates = ['s4'];
    clues[3].kind = 'red_herring';
    clues[4].clears = ['s1'];
    clues[5].implicates = ['s2'];
    clues[6].text = 'This clue is important and should remain visible enough to verify solver confidence.';
    clues[6].implicates = ['s3'];
  }

  if (difficulty === 'hard') {
    clues[0].implicates = ['s5'];
    clues[1].implicates = ['s5'];
    clues[2].implicates = ['s5'];
    clues[3].kind = 'red_herring';
    clues[4].kind = 'red_herring';
    clues[5].clears = ['s2'];
    clues[6].implicates = ['s1'];
    clues[7].text = 'This clue is a secondary thread that creates ambiguity without revealing the culprit directly.';
    clues[7].implicates = ['s3'];
    clues[8].text = 'This final clue closes the loop while still keeping the deduction fair and inspectable.';
    clues[8].implicates = ['s4'];
  }

  const culpritId = difficulty === 'easy' ? 's3' : difficulty === 'medium' ? 's4' : 's5';

  const hintedClues = clues.filter((clue) => clue.implicates.includes(culpritId));
  const keyClueIds = hintedClues.slice(0, Math.min(3, hintedClues.length)).map((clue) => clue.id);

  if (keyClueIds.length < 2) {
    keyClueIds.push(clues[0].id);
  }

  return {
    title: `Case ${difficulty}`,
    story: `A quiet evening becomes a puzzle when one guest vanishes after a narrow escape from a locked room. The house staff have inconsistent stories, the window is open, and every suspect seems to have a motive. The scene is carefully staged to look ordinary, but the evidence is all there for a careful investigator to follow. A careful reader will notice the contradictions before the final accusation is made.`,
    suspects,
    clues,
    hints: Array.from({ length: matrix.hints }, (_, idx) => ({
      level: idx + 1,
      text: `Hint ${idx + 1} is a gentle progression toward the final answer but does not name the culprit.`,
    })),
    solution: {
      culpritId,
      explanation: `The culprit is ${culpritId} because the clues line up and the timeline fits the final deduction.`,
      keyClueIds,
    },
  };
};

describe('generateMystery', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('generates a valid easy case', async () => {
    const caseData = makeCase('easy');
    callGeminiJson
      .mockResolvedValueOnce(JSON.stringify(caseData))
      .mockResolvedValueOnce(JSON.stringify({ culpritId: caseData.solution.culpritId, confidence: 0.98 }));

    const generated = await generateMystery({ premise: 'A locked-room mystery in a seaside manor', difficulty: 'easy' });

    expect(generated.suspects).toHaveLength(3);
    expect(generated.clues).toHaveLength(5);
    expect(generated.hints).toHaveLength(2);
    expect(generated.story.length).toBeGreaterThan(150);
    expect(callGeminiJson).toHaveBeenCalledTimes(2);
    expect(callGeminiJson.mock.calls[0][1].responseJsonSchema.properties.clues.items.properties.kind.enum)
      .toEqual(['incriminating', 'exculpatory', 'red_herring', 'neutral']);
  });

  it('generates a valid medium case', async () => {
    const caseData = makeCase('medium');
    callGeminiJson
      .mockResolvedValueOnce(JSON.stringify(caseData))
      .mockResolvedValueOnce(JSON.stringify({ culpritId: caseData.solution.culpritId, confidence: 0.94 }));

    const generated = await generateMystery({ premise: 'A missing financier and a family estate', difficulty: 'medium' });

    expect(generated.suspects).toHaveLength(4);
    expect(generated.clues).toHaveLength(7);
    expect(generated.hints).toHaveLength(3);
    expect(generated.solution.culpritId).toBeDefined();
    expect(callGeminiJson).toHaveBeenCalledTimes(2);
  });

  it('generates a valid hard case', async () => {
    const caseData = makeCase('hard');
    callGeminiJson
      .mockResolvedValueOnce(JSON.stringify(caseData))
      .mockResolvedValueOnce(JSON.stringify({ culpritId: caseData.solution.culpritId, confidence: 0.96 }));

    const generated = await generateMystery({ premise: 'A theatre heir disappears during opening night', difficulty: 'hard' });

    expect(generated.suspects).toHaveLength(5);
    expect(generated.clues).toHaveLength(9);
    expect(generated.hints).toHaveLength(3);
    expect(generated.solution.keyClueIds.length).toBeGreaterThanOrEqual(2);
    expect(callGeminiJson).toHaveBeenCalledTimes(2);
  });

  it('fails after three attempts when the verifier disagrees', async () => {
    const caseData = makeCase('easy');
    const verifierFailure = JSON.stringify({ culpritId: 's2', confidence: 0.7 });

    callGeminiJson
      .mockResolvedValueOnce(JSON.stringify(caseData))
      .mockResolvedValueOnce(verifierFailure)
      .mockResolvedValueOnce(JSON.stringify(caseData))
      .mockResolvedValueOnce(verifierFailure)
      .mockResolvedValueOnce(JSON.stringify(caseData))
      .mockResolvedValueOnce(verifierFailure);

    await expect(generateMystery({ premise: 'A locked-room mystery in a seaside manor', difficulty: 'easy' }))
      .rejects.toThrow(/Generation failed after 3 attempts|Solvability verifier disagreed/);
  });

  it('includes the previous validation error in the next generation prompt', async () => {
    const caseData = makeCase('easy');
    callGeminiJson
      .mockResolvedValueOnce('{"title":')
      .mockResolvedValueOnce(JSON.stringify(caseData))
      .mockResolvedValueOnce(JSON.stringify({ culpritId: caseData.solution.culpritId, confidence: 0.98 }));

    await generateMystery({ premise: 'A locked-room mystery in a seaside manor', difficulty: 'easy' });

    expect(callGeminiJson.mock.calls[1][0]).toContain('Your previous response was rejected');
    expect(callGeminiJson.mock.calls[1][0]).toContain('Unexpected end of JSON input');
  });
});
