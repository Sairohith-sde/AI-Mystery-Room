import { Router } from 'express';
import { z } from 'zod';
import { createCase, fetchCase, discoverClue, requestHint, accuse, getResult } from '../controllers/cases.js';
import { validateRequest } from '../middleware/validate.js';

const router = Router();

const createCaseSchema = z.object({
  premise: z.string().trim().min(10).max(300),
  difficulty: z.enum(['easy', 'medium', 'hard']),
});

const accuseSchema = z.object({
  suspectId: z.string().min(1),
});

router.post('/', validateRequest(createCaseSchema), createCase);
router.get('/:id', fetchCase);
router.post('/:id/clues/:clueId/discover', discoverClue);
router.post('/:id/hints', requestHint);
router.post('/:id/accuse', validateRequest(accuseSchema), accuse);
router.get('/:id/result', getResult);

export default router;