import { describe, expect, it } from 'vitest';
import { validateMystery } from '../src/services/validator.js';

const buildValidCase = (overrides = {}) => ({
  title: 'The Last Toast',
  story: 'A private dinner went wrong when a famous collector vanished after a quiet toast. The house smelled of rain and old paper while servants rushed between the kitchen and the study. The guests gathered near a window overlooked by the garden, each pretending to be calm while a single suspect kept glancing at the locked study door. The scene felt almost theatrical, as though the victim had prepared for an audience and the wrong person had arrived too late to stop it.',
  suspects: [
    { id: 's1', name: 'Mara', role: 'Hostess', description: 'Lives at the estate and manages the household with sharp discipline.', alibi: 'She was seen in the kitchen arranging flowers.' },
    { id: 's2', name: 'Dorian', role: 'Editor', description: 'A famous editor who wanted the victim to sign a risky contract.', alibi: 'He was in the library reading the ledger.' },
    { id: 's3', name: 'Lena', role: 'Gardener', description: 'The gardener kept a grudge after being dismissed for theft.', alibi: 'She was pruning roses by the back gate.' },
    { id: 's4', name: 'Theo', role: 'Accountant', description: 'Knows the family finances and hides a gambling debt.', alibi: 'He was tallying invoices in the office.' },
  ],
  clues: [
    { id: 'c1', label: 'Torn letter', text: 'A torn letter from the victim mentions a meeting with Dorian in the study.', kind: 'incriminating', implicates: ['s2'], clears: ['s1'] },
    { id: 'c2', label: 'The ledger', text: 'The ledger shows Theo paid a large debt the evening before the event.', kind: 'incriminating', implicates: ['s4'], clears: [] },
    { id: 'c3', label: 'Wet footprints', text: 'Wet footprints lead from the garden to the study and point away from the front hall.', kind: 'incriminating', implicates: ['s3'], clears: ['s1'] },
    { id: 'c4', label: 'Broken watch', text: 'The victim’s broken watch was found beside a chair no one else used.', kind: 'incriminating', implicates: ['s4'], clears: ['s3'] },
    { id: 'c5', label: 'House keys', text: 'The house keys were missing from the tray and later found in Mara’s apron pocket.', kind: 'exculpatory', implicates: [], clears: ['s1'] },
    { id: 'c6', label: 'Snapped stem', text: 'A snapped flower stem lies near the back gate and matches the flowers in the kitchen arrangement.', kind: 'red_herring', implicates: ['s1'], clears: [] },
    { id: 'c7', label: 'Ink stain', text: 'A fresh ink stain on the ledger suggests someone rushed from the study to the office.', kind: 'incriminating', implicates: ['s4'], clears: [] },
  ],
  hints: [
    { level: 1, text: 'The culprit had a clear reason, but not the first one you suspect.' },
    { level: 2, text: 'The decisive clue points toward the person who was already in the room.' },
    { level: 3, text: 'Follow the evidence that ties the suspect to the study and the missing time.' },
  ],
  solution: {
    culpritId: 's4',
    explanation: 'Theo had a gambling debt and the ledger evidence placed him in the study. The ink stain and debt records line up with the victim’s final moments, and the timing of the missing ledger points to the culprit.',
    keyClueIds: ['c2', 'c4', 'c7'],
  },
  ...overrides,
});

describe('validateMystery', () => {
  it('accepts a valid payload', () => {
    expect(validateMystery(buildValidCase(), 'medium')).toEqual([]);
  });

  it('rejects wrong suspect counts', () => {
    const payload = buildValidCase({ suspects: buildValidCase().suspects.slice(0, 3) });
    expect(validateMystery(payload, 'medium').some((error) => error.includes('Wrong suspect count'))).toBe(true);
  });

  it('rejects duplicate clue ids', () => {
    const payload = buildValidCase({ clues: [buildValidCase().clues[0], buildValidCase().clues[0]] });
    expect(validateMystery(payload, 'medium').some((error) => error.includes('clueId duplicate'))).toBe(true);
  });

  it('rejects missing culprit in suspect list', () => {
    const payload = buildValidCase({ solution: { ...buildValidCase().solution, culpritId: 'missing' } });
    expect(validateMystery(payload, 'medium').some((error) => error.includes('does not exist in suspects'))).toBe(true);
  });

  it('rejects missing key clue ids', () => {
    const payload = buildValidCase({ solution: { ...buildValidCase().solution, keyClueIds: ['missing'] } });
    const issues = validateMystery(payload, 'medium');
    expect(issues.some((error) => /keyClueIds/i.test(error) && /(at least 2|missing)/i.test(error))).toBe(true);
  });

  it('requires culprit to be implicated in key clues', () => {
    const payload = buildValidCase({ solution: { ...buildValidCase().solution, keyClueIds: ['c5', 'c1'] } });
    expect(
      validateMystery(payload, 'medium').some((error) =>
        error.includes('keyClueIds must reference only clues that implicate the culprit'),
      ),
    ).toBe(true);
  });

  it('requires every suspect to be mentioned in at least one clue', () => {
    const payload = buildValidCase({
      clues: buildValidCase().clues.map((clue) => ({
        ...clue,
        implicates: clue.implicates.filter((id) => id !== 's1'),
        clears: clue.clears.filter((id) => id !== 's1'),
      })),
    });
    expect(
      validateMystery(payload, 'medium').some((error) =>
        error.includes('Every suspect must be mentioned in at least one clue'),
      ),
    ).toBe(true);
  });

  it('rejects direct naming of culprit in clue or hint text', () => {
    const payload = buildValidCase({ clues: buildValidCase().clues.map((clue) => clue.id === 'c2' ? { ...clue, text: 'Theo is the killer and he hid the ledger.' } : clue) });
    expect(validateMystery(payload, 'medium').some((error) => error.includes('indirectly names the culprit'))).toBe(true);
  });
});
