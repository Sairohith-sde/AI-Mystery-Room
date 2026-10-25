import mongoose from 'mongoose';

const suspectSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    name: { type: String, required: true },
    role: { type: String, required: true },
    description: { type: String, required: true },
    alibi: { type: String, required: true },
  },
  { _id: false },
);

const clueSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    label: { type: String, required: true },
    text: { type: String, required: true },
    kind: { type: String, enum: ['incriminating', 'exculpatory', 'red_herring', 'neutral'], required: true },
    implicates: [{ type: String }],
    clears: [{ type: String }],
  },
  { _id: false },
);

const hintSchema = new mongoose.Schema(
  {
    level: { type: Number, required: true },
    text: { type: String, required: true },
  },
  { _id: false },
);

const solutionSchema = new mongoose.Schema(
  {
    culpritId: { type: String, required: true },
    explanation: { type: String, required: true },
    keyClueIds: [{ type: String, required: true }],
  },
  { _id: false },
);

const caseSchema = new mongoose.Schema(
  {
    publicId: { type: String, required: true, unique: true, index: true },
    title: { type: String, required: true },
    story: { type: String, required: true },
    premise: { type: String, required: true },
    difficulty: { type: String, enum: ['easy', 'medium', 'hard'], required: true },
    status: { type: String, enum: ['active', 'completed'], required: true, default: 'active' },
    suspects: { type: [suspectSchema], required: true },
    clues: { type: [clueSchema], required: true },
    hints: { type: [hintSchema], default: [] },
    solution: { type: solutionSchema, select: false },
    progress: {
      discoveredClueIds: [{ type: String, default: [] }],
      hintsUsed: { type: Number, default: 0 },
    },
    accusation: {
      suspectId: { type: String },
      submittedAt: { type: Date },
    },
    result: {
      correct: { type: Boolean },
      score: {
        base: { type: Number },
        clueBonus: { type: Number },
        hintPenalty: { type: Number },
        total: { type: Number },
      },
    },
  },
  {
    timestamps: true,
  },
);

caseSchema.index({ createdAt: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });

const Case = mongoose.model('Case', caseSchema);

export default Case;