import crypto from 'node:crypto';
import { z } from 'zod';
import Case from '../models/Case.js';
import { computeScore } from '../services/scoring.js';
import { generateMystery } from '../services/generator.js';
import { publicView } from '../services/publicView.js';
import { createError } from '../utils/AppError.js';

const getCaseByPublicId = async (id, includeSolution = false) => {
  const query = Case.findOne({ publicId: id });
  if (includeSolution) {
    query.select('+solution');
  }
  return query.exec ? await query.exec() : await query;
};

export async function createCase(req, res, next) {
  try {
    const { premise, difficulty } = req.body;

    const generated = await generateMystery({ premise, difficulty });
    const record = await Case.create({
      publicId: crypto.randomUUID(),
      title: generated.title,
      story: generated.story,
      premise: premise.trim(),
      difficulty,
      status: 'active',
      suspects: generated.suspects,
      clues: generated.clues,
      hints: generated.hints,
      solution: generated.solution,
      progress: {
        discoveredClueIds: [],
        hintsUsed: 0,
      },
      accusation: null,
      result: null,
    });

    return res.status(201).json({ case: publicView(record.toObject ? record.toObject() : record) });
  } catch (error) {
    if (error?.message?.includes('Generation failed')) {
      return next(createError(502, 'GENERATION_FAILED', 'Mystery generation failed after several attempts. Please try again.', null));
    }
    return next(error);
  }
}

export async function fetchCase(req, res, next) {
  try {
    const caseDoc = await getCaseByPublicId(req.params.id, false);
    if (!caseDoc) {
      return next(createError(404, 'CASE_NOT_FOUND', 'Case not found.', null));
    }

    return res.status(200).json({ case: publicView(caseDoc.toObject ? caseDoc.toObject() : caseDoc) });
  } catch (error) {
    return next(error);
  }
}

export async function discoverClue(req, res, next) {
  try {
    const caseDoc = await getCaseByPublicId(req.params.id, false);
    if (!caseDoc) {
      return next(createError(404, 'CASE_NOT_FOUND', 'Case not found.', null));
    }
    if (caseDoc.status === 'completed') {
      return next(createError(409, 'CASE_ALREADY_COMPLETED', 'This case has already been completed.', null));
    }

    const clue = caseDoc.clues.find((item) => item.id === req.params.clueId);
    if (!clue) {
      return next(createError(404, 'CLUE_NOT_FOUND', 'Clue not found.', null));
    }

    const discovered = new Set(caseDoc.progress?.discoveredClueIds ?? []);
    discovered.add(clue.id);
    caseDoc.progress = caseDoc.progress || { discoveredClueIds: [], hintsUsed: 0 };
    caseDoc.progress.discoveredClueIds = [...discovered];
    await caseDoc.save();

    return res.status(200).json({
      clue: { id: clue.id, label: clue.label, text: clue.text },
      progress: {
        cluesDiscovered: caseDoc.progress.discoveredClueIds.length,
        cluesTotal: caseDoc.clues.length,
      },
    });
  } catch (error) {
    return next(error);
  }
}

export async function requestHint(req, res, next) {
  try {
    const caseDoc = await getCaseByPublicId(req.params.id, false);
    if (!caseDoc) {
      return next(createError(404, 'CASE_NOT_FOUND', 'Case not found.', null));
    }
    if (caseDoc.status === 'completed') {
      return next(createError(409, 'CASE_ALREADY_COMPLETED', 'This case has already been completed.', null));
    }

    if (caseDoc.progress.hintsUsed >= caseDoc.hints.length) {
      return next(createError(409, 'HINTS_EXHAUSTED', 'No hints left.', null));
    }

    const nextHint = caseDoc.hints[caseDoc.progress.hintsUsed];
    caseDoc.progress.hintsUsed += 1;
    await caseDoc.save();

    return res.status(200).json({
      hint: { level: nextHint.level, text: nextHint.text },
      hints: {
        used: caseDoc.progress.hintsUsed,
        total: caseDoc.hints.length,
      },
    });
  } catch (error) {
    return next(error);
  }
}

export async function accuse(req, res, next) {
  try {
    const caseDoc = await getCaseByPublicId(req.params.id, true);
    if (!caseDoc) {
      return next(createError(404, 'CASE_NOT_FOUND', 'Case not found.', null));
    }
    if (caseDoc.status === 'completed') {
      return next(createError(409, 'CASE_ALREADY_COMPLETED', 'This case has already been completed.', null));
    }

    const suspectExists = caseDoc.suspects.some((suspect) => suspect.id === req.body.suspectId);
    if (!suspectExists) {
      return next(createError(400, 'VALIDATION_ERROR', 'Unknown suspect.', null));
    }

    const correct = caseDoc.solution.culpritId === req.body.suspectId;
    const score = computeScore({
      difficulty: caseDoc.difficulty,
      correct,
      cluesDiscovered: caseDoc.progress.discoveredClueIds.length,
      hintsUsed: caseDoc.progress.hintsUsed,
    });

    caseDoc.accusation = { suspectId: req.body.suspectId, submittedAt: new Date() };
    caseDoc.result = {
      correct,
      score: {
        base: correct ? { easy: 100, medium: 150, hard: 200 }[caseDoc.difficulty] : 0,
        clueBonus: 5 * caseDoc.progress.discoveredClueIds.length,
        hintPenalty: 10 * caseDoc.progress.hintsUsed,
        total: score,
      },
    };
    caseDoc.status = 'completed';
    await caseDoc.save();

    return res.status(200).json({
      correct,
      score: { total: score },
      resultUrl: `/case/${req.params.id}/result`,
    });
  } catch (error) {
    return next(error);
  }
}

export async function getResult(req, res, next) {
  try {
    const caseDoc = await getCaseByPublicId(req.params.id, true);
    if (!caseDoc) {
      return next(createError(404, 'CASE_NOT_FOUND', 'Case not found.', null));
    }
    if (caseDoc.status !== 'completed') {
      return next(createError(403, 'RESULT_NOT_AVAILABLE', 'Result is not available yet.', null));
    }

    const culprit = caseDoc.suspects.find((suspect) => suspect.id === caseDoc.solution.culpritId);
    const keyClues = caseDoc.solution.keyClueIds.map((id) => {
      const clue = caseDoc.clues.find((item) => item.id === id);
      if (!clue) return null;
      return {
        id: clue.id,
        label: clue.label,
        text: clue.text,
      };
    }).filter(Boolean);

    return res.status(200).json({
      result: {
        correct: caseDoc.result.correct,
        accusedSuspectId: caseDoc.accusation?.suspectId,
        culprit: { id: culprit.id, name: culprit.name },
        explanation: caseDoc.solution.explanation,
        keyClues,
        score: caseDoc.result.score,
        difficulty: caseDoc.difficulty,
      },
    });
  } catch (error) {
    return next(error);
  }
}