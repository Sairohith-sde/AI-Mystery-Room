import { z } from 'zod';

export const DIFFICULTY_MATRIX = {
  easy: { suspects: 3, clues: 5, hints: 2, minIncriminatingClues: 2, minRedHerrings: 0 },
  medium: { suspects: 4, clues: 7, hints: 3, minIncriminatingClues: 3, minRedHerrings: 1 },
  hard: { suspects: 5, clues: 9, hints: 3, minIncriminatingClues: 3, minRedHerrings: 2 },
};

const suspectSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(80),
  role: z.string().min(1).max(120),
  description: z.string().min(20).max(500),
  alibi: z.string().min(1).max(300),
});

const clueSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1).max(60),
  text: z.string().min(20).max(2000),
  kind: z.enum(['incriminating', 'exculpatory', 'red_herring', 'neutral']),
  implicates: z.array(z.string()).default([]),
  clears: z.array(z.string()).default([]),
});

const hintSchema = z.object({
  level: z.number().int().positive(),
  text: z.string().min(1).max(400),
});

const solutionSchema = z.object({
  culpritId: z.string().min(1),
  explanation: z.string().min(20).max(2000),
  keyClueIds: z.array(z.string()).min(2),
});

const generatedCaseSchema = z.object({
  title: z.string().min(1).max(120),
  story: z.string().min(150).max(1200),
  suspects: z.array(suspectSchema).min(1),
  clues: z.array(clueSchema).min(1),
  hints: z.array(hintSchema).min(1),
  solution: solutionSchema,
});

function uniqueValues(values, fieldName) {
  const seen = new Set();
  const duplicates = [];

  for (const value of values) {
    if (seen.has(value)) {
      duplicates.push(value);
    }
    seen.add(value);
  }

  return duplicates.length === 0 ? [] : [...new Set(duplicates)].map((value) => `${fieldName} duplicate: ${value}`);
}

export function validateMystery(payload, difficulty) {
  const errors = [];

  if (!payload || typeof payload !== 'object') {
    return ['Payload must be an object.'];
  }

  const matrix = DIFFICULTY_MATRIX[difficulty];
  if (!matrix) {
    return [`Unsupported difficulty: ${difficulty}`];
  }

  const parsed = generatedCaseSchema.safeParse(payload);
  if (!parsed.success) {
    errors.push(...parsed.error.issues.map((issue) => `${issue.path.join('.') || 'payload'}: ${issue.message}`));
    return errors;
  }

  const { suspects, clues, hints, solution } = parsed.data;
  const suspectIds = suspects.map((suspect) => suspect.id);
  const clueIds = clues.map((clue) => clue.id);

  if (suspects.length !== matrix.suspects) {
    errors.push(`Wrong suspect count: expected ${matrix.suspects}, received ${suspects.length}.`);
  }

  if (clues.length !== matrix.clues) {
    errors.push(`Wrong clue count: expected ${matrix.clues}, received ${clues.length}.`);
  }

  if (hints.length !== matrix.hints) {
    errors.push(`Wrong hint count: expected ${matrix.hints}, received ${hints.length}.`);
  }

  errors.push(...uniqueValues(suspectIds, 'suspectId'));
  errors.push(...uniqueValues(clueIds, 'clueId'));

  const hintLevels = hints.map((hint) => hint.level);
  errors.push(...uniqueValues(hintLevels, 'hintLevel'));
  if (hintLevels.length !== new Set(hintLevels).size || hintLevels.some((level) => level < 1 || level > hints.length)) {
    errors.push('Hint levels must be unique integers from 1..N.');
  }

  const culprit = suspects.find((suspect) => suspect.id === solution.culpritId);
  if (!culprit) {
    errors.push(`Culprit id ${solution.culpritId} does not exist in suspects.`);
  }

  if (solution.keyClueIds.length < 2) {
    errors.push('solution.keyClueIds must contain at least 2 clue ids.');
  }

  for (const clue of clues) {
    for (const suspectId of clue.implicates) {
      if (!suspectIds.includes(suspectId)) {
        errors.push(`Clue ${clue.id} implicates missing suspect ${suspectId}.`);
      }
    }

    for (const suspectId of clue.clears) {
      if (!suspectIds.includes(suspectId)) {
        errors.push(`Clue ${clue.id} clears missing suspect ${suspectId}.`);
      }
    }

    if (clue.implicates.some((id) => clue.clears.includes(id))) {
      errors.push(`Clue ${clue.id} cannot both implicate and clear the same suspect.`);
    }
  }

  for (const clueId of solution.keyClueIds) {
    if (!clueIds.includes(clueId)) {
      errors.push(`solution.keyClueIds contains missing clue ${clueId}.`);
    }
  }

  const culpritImplies = clues.filter((clue) => clue.implicates.includes(solution.culpritId));
  if (culpritImplies.length < matrix.minIncriminatingClues) {
    errors.push(`Culprit must be implicated in at least ${matrix.minIncriminatingClues} clue(s).`);
  }

  if (solution.keyClueIds.length > 0) {
    const invalidKeyClues = solution.keyClueIds.filter((clueId) => {
      const clue = clues.find((item) => item.id === clueId);
      return !clue || !clue.implicates.includes(solution.culpritId);
    });

    if (invalidKeyClues.length > 0) {
      errors.push(`keyClueIds must reference only clues that implicate the culprit: ${invalidKeyClues.join(', ')}.`);
    }
  }

  const redHerringCount = clues.filter((clue) => clue.kind === 'red_herring').length;
  if (redHerringCount < matrix.minRedHerrings) {
    errors.push(`Red herring count must be at least ${matrix.minRedHerrings}.`);
  }

  const mentionedSuspects = new Set(
    clues.flatMap((clue) => [...clue.implicates, ...clue.clears]),
  );
  const unmentionedSuspects = suspects.filter((suspect) => !mentionedSuspects.has(suspect.id));
  if (unmentionedSuspects.length > 0) {
    errors.push(`Every suspect must be mentioned in at least one clue: ${unmentionedSuspects.map((s) => s.id).join(', ')}.`);
  }

  const culpritName = culprit?.name ?? '';
  const accusationTerms = ['culprit', 'killer', 'murderer', 'guilty', 'responsible'];
  for (const clue of clues) {
    const clueText = `${clue.label} ${clue.text}`.toLowerCase();
    if (culpritName && clueText.includes(culpritName.toLowerCase()) && accusationTerms.some((term) => clueText.includes(term))) {
      errors.push(`Clue label/text indirectly names the culprit: ${clue.id}.`);
    }
  }

  for (const hint of hints) {
    const hintText = hint.text.toLowerCase();
    if (culpritName && hintText.includes(culpritName.toLowerCase()) && accusationTerms.some((term) => hintText.includes(term))) {
      errors.push(`Hint directly accuses the culprit: ${hint.level}.`);
    }
  }

  return [...new Set(errors)];
}

export function assertValidMystery(payload, difficulty) {
  const errors = validateMystery(payload, difficulty);
  if (errors.length > 0) {
    throw new Error(errors.join(' | '));
  }

  return payload;
}

export default validateMystery;
