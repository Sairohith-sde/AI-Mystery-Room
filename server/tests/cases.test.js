import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';

const mockCaseStore = [];

const mockSave = vi.fn(function () {
  return this;
});

vi.mock('../src/models/Case.js', () => {
  const create = vi.fn(async (payload) => {
    const doc = {
      ...payload,
      _id: String(mockCaseStore.length + 1),
      toObject() {
        return { ...this };
      },
      save: mockSave,
    };
    mockCaseStore.push(doc);
    return doc;
  });

  const findOne = vi.fn((query) => {
    const publicId = query.publicId;
    const doc = mockCaseStore.find((item) => item.publicId === publicId);
    if (!doc) {
      return { exec: async () => null, select: () => ({ exec: async () => null }) };
    }

    const result = {
      ...doc,
      save: mockSave,
      toObject() {
        return { ...this };
      },
      select() {
        return { exec: async () => result };
      },
      exec: async () => result,
    };

    return result;
  });

  return {
    default: {
      create,
      findOne,
    },
  };
});

vi.mock('../src/services/generator.js', () => ({
  generateMystery: vi.fn(async ({ premise, difficulty }) => ({
    title: `Case ${difficulty}`,
    story: 'A full story description of the mystery, long enough to feel complete and atmospheric.',
    suspects: [
      { id: 's1', name: 'Mara', role: 'Host', description: 'A careful host with a sharp eye.', alibi: 'She was in the kitchen.' },
      { id: 's2', name: 'Dorian', role: 'Editor', description: 'An editor with a motive for revenge.', alibi: 'He was in the library.' },
    ],
    clues: [
      { id: 'c1', label: 'The letter', text: 'The letter reveals the motive.', kind: 'incriminating', implicates: ['s2'], clears: [] },
      { id: 'c2', label: 'The ledger', text: 'The ledger proves the author was in the study.', kind: 'incriminating', implicates: ['s1'], clears: [] },
    ],
    hints: [
      { level: 1, text: 'The culprit was close to the victim.' },
      { level: 2, text: 'The clue suggests the culprit was in the study.' },
    ],
    solution: {
      culpritId: 's1',
      explanation: 'The culprit is Mara because the study clue matches her role.',
      keyClueIds: ['c2'],
    },
  })),
}));

describe('cases API', () => {
  beforeEach(() => {
    mockCaseStore.length = 0;
    vi.clearAllMocks();
  });

  afterEach(() => {
    mockCaseStore.length = 0;
  });

  it('creates a case and returns the public payload', async () => {
    const res = await request(app)
      .post('/api/cases')
      .send({ premise: 'A locked-room mystery in a manor house', difficulty: 'easy' });

    expect(res.status).toBe(201);
    expect(res.body.case).toHaveProperty('id');
    expect(res.body.case.status).toBe('active');
  });

  it('fetches an active case', async () => {
    const createRes = await request(app)
      .post('/api/cases')
      .send({ premise: 'A locked-room mystery in a manor house', difficulty: 'easy' });

    const res = await request(app).get(`/api/cases/${createRes.body.case.id}`);
    expect(res.status).toBe(200);
    expect(res.body.case.id).toBe(createRes.body.case.id);
  });

  it('discovers a clue idempotently', async () => {
    const createRes = await request(app)
      .post('/api/cases')
      .send({ premise: 'A locked-room mystery in a manor house', difficulty: 'easy' });

    const res = await request(app)
      .post(`/api/cases/${createRes.body.case.id}/clues/c1/discover`);

    expect(res.status).toBe(200);
    expect(res.body.clue.text).toBe('The letter reveals the motive.');

    const second = await request(app)
      .post(`/api/cases/${createRes.body.case.id}/clues/c1/discover`);
    expect(second.status).toBe(200);
    expect(second.body.progress.cluesDiscovered).toBe(1);
  });

  it('returns 403 when result is requested before completion', async () => {
    const createRes = await request(app)
      .post('/api/cases')
      .send({ premise: 'A locked-room mystery in a manor house', difficulty: 'easy' });

    const res = await request(app).get(`/api/cases/${createRes.body.case.id}/result`);
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('RESULT_NOT_AVAILABLE');
  });
});
