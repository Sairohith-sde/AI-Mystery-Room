export function publicView(doc) {
  const discoveredIds = new Set(doc.progress?.discoveredClueIds ?? []);
  const hintsUsed = doc.progress?.hintsUsed ?? 0;

  return {
    id: doc.publicId ?? doc._id?.toString(),
    title: doc.title,
    story: doc.story,
    difficulty: doc.difficulty,
    status: doc.status,
    suspects: (doc.suspects ?? []).map((suspect) => ({
      id: suspect.id,
      name: suspect.name,
      role: suspect.role,
      description: suspect.description,
      alibi: suspect.alibi,
    })),
    clues: (doc.clues ?? []).map((clue) => {
      const discovered = discoveredIds.has(clue.id);
      return {
        id: clue.id,
        label: clue.label,
        ...(discovered ? { text: clue.text } : {}),
        discovered,
      };
    }),
    hints: {
      used: hintsUsed,
      total: (doc.hints ?? []).length,
      revealed: (doc.hints ?? [])
        .filter((hint) => hint.level <= hintsUsed)
        .map((hint) => ({ level: hint.level, text: hint.text })),
    },
    progress: {
      cluesDiscovered: (doc.progress?.discoveredClueIds ?? []).length,
      cluesTotal: (doc.clues ?? []).length,
    },
    createdAt: doc.createdAt ? new Date(doc.createdAt).toISOString() : undefined,
  };
}