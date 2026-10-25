import { describe, expect, it } from 'vitest';
import { publicView } from '../src/services/publicView.js';

describe('publicView', () => {
  it('strips private data and hidden clue text from the public output', () => {
    const doc = {
      publicId: 'case-123',
      title: 'The Last Toast',
      story: 'A quiet dinner turns into a mystery.',
      difficulty: 'medium',
      status: 'active',
      suspects: [{ id: 's1', name: 'Mara', role: 'Host', description: 'Keeps the house.', alibi: 'At the bar' }],
      clues: [
        { id: 'c1', label: 'Torn letter', text: 'Mara forged a cheque.', kind: 'incriminating', implicates: ['s1'], clears: [] },
        { id: 'c2', label: 'Glass shard', text: 'The window was broken from inside.', kind: 'neutral', implicates: [], clears: [] },
      ],
      hints: [
        { level: 1, text: 'The culprit had a motive.' },
        { level: 2, text: 'The culprit was the host.' },
      ],
      progress: { discoveredClueIds: ['c2'], hintsUsed: 1 },
      createdAt: new Date('2024-01-01T00:00:00Z'),
      solution: {
        culpritId: 's1',
        explanation: 'Mara did it because of the cheque.',
        keyClueIds: ['c1'],
      },
    };

    const output = JSON.stringify(publicView(doc));

    expect(output).toContain('Torn letter');
    expect(output).toContain('Glass shard');
    expect(output).not.toContain('culpritId');
    expect(output).not.toContain('Mara did it because of the cheque');
    expect(output).not.toContain('keyClueIds');
    expect(output).not.toContain('kind');
    expect(output).not.toContain('implicates');
    expect(output).not.toContain('clears');
    expect(output).not.toContain('The culprit was the host');
    expect(output).not.toContain('forged a cheque');
  });
});