import { z } from 'zod';
import { StudySession, Flashcard, QuizQuestion, KeyConcept } from './types';

// Zod schemas with lenient coercion and default fallbacks
export const FlashcardSchema = z.object({
  id: z.string().optional().default(() => `card_${Math.random().toString(36).substring(2, 9)}`),
  front: z.string().min(1, 'Card front cannot be empty').default('Key Concept'),
  back: z.string().min(1, 'Card back cannot be empty').default('Explanation unavailable.'),
  category: z.string().optional().default('General'),
  difficulty: z.enum(['easy', 'medium', 'hard']).catch('medium'),
  userStatus: z.enum(['learning', 'mastered']).default('learning'),
});

export const QuizQuestionSchema = z.object({
  id: z.string().optional().default(() => `quiz_${Math.random().toString(36).substring(2, 9)}`),
  question: z.string().min(1, 'Question text required').default('Review Question'),
  options: z.array(z.string()).min(2, 'At least two options required').catch([
    'True / Option A',
    'False / Option B',
    'Neither',
    'Both',
  ]),
  correctAnswerIndex: z.number().int().catch(0),
  explanation: z.string().optional().default('No detailed explanation provided by the model.'),
  userAnswerIndex: z.number().optional(),
});

export const KeyConceptSchema = z.object({
  id: z.string().optional().default(() => `concept_${Math.random().toString(36).substring(2, 9)}`),
  concept: z.string().min(1).default('Core Principle'),
  summary: z.string().min(1).default('Important takeaway from the material.'),
  mastered: z.boolean().default(false),
});

export const RawAIStudyPayloadSchema = z.object({
  title: z.string().optional().default('Study Session'),
  topic: z.string().optional().default('General Topic'),
  summary: z.string().optional().default('Auto-generated study review materials.'),
  keyConcepts: z.array(KeyConceptSchema).optional().default([]),
  flashcards: z.array(FlashcardSchema).min(1, 'At least one flashcard required'),
  quiz: z.array(QuizQuestionSchema).min(1, 'At least one quiz question required'),
});

export interface ValidationResult {
  session: StudySession;
  warnings: string[];
}

/**
 * Validates and heals the model output, guaranteeing the frontend receives
 * 100% type-safe, non-null data that will never crash the React render tree.
 */
export function validateAndHealAIOutput(rawData: unknown, fallbackTopic: string): ValidationResult {
  const warnings: string[] = [];

  if (!rawData || typeof rawData !== 'object') {
    throw new Error('Model returned non-object or null data');
  }

  const raw = rawData as Record<string, unknown>;

  // Attempt lenient schema parsing
  const parsed = RawAIStudyPayloadSchema.safeParse(raw);

  let data: z.infer<typeof RawAIStudyPayloadSchema>;

  if (parsed.success) {
    data = parsed.data;
  } else {
    // Collect specific field issues
    const issues = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`);
    warnings.push(`Schema deviations auto-healed: ${issues.join('; ')}`);

    // Fallback extraction with individual element salvaging
    const rawFlashcards = Array.isArray(raw.flashcards) ? raw.flashcards : [];
    const rawQuiz = Array.isArray(raw.quiz) ? raw.quiz : [];
    const rawConcepts = Array.isArray(raw.keyConcepts) ? raw.keyConcepts : [];

    const safeFlashcards: Flashcard[] = rawFlashcards
      .map((item, idx) => {
        const res = FlashcardSchema.safeParse(item);
        if (res.success) return res.data as Flashcard;
        if (item && typeof item === 'object') {
          const rec = item as Record<string, unknown>;
          return {
            id: `card_${idx}_${Date.now()}`,
            front: String(rec.front || rec.question || rec.term || `Concept #${idx + 1}`),
            back: String(rec.back || rec.answer || rec.definition || 'Details pending'),
            category: String(rec.category || 'General'),
            difficulty: 'medium' as const,
            userStatus: 'learning' as const,
          };
        }
        return null;
      })
      .filter((c): c is Flashcard => c !== null);

    const safeQuiz: QuizQuestion[] = rawQuiz
      .map((item, idx) => {
        const res = QuizQuestionSchema.safeParse(item);
        if (res.success) {
          // Normalize answer index if out of bounds
          const q = res.data;
          if (q.correctAnswerIndex < 0 || q.correctAnswerIndex >= q.options.length) {
            q.correctAnswerIndex = 0;
            warnings.push(`Question #${idx + 1} correctAnswerIndex was out of bounds; clamped to 0`);
          }
          return q as QuizQuestion;
        }
        if (item && typeof item === 'object') {
          const rec = item as Record<string, unknown>;
          const opts = Array.isArray(rec.options) ? rec.options.map(String) : ['True', 'False'];
          return {
            id: `quiz_${idx}_${Date.now()}`,
            question: String(rec.question || `Question #${idx + 1}`),
            options: opts,
            correctAnswerIndex: 0,
            explanation: String(rec.explanation || 'Review topic notes.'),
          };
        }
        return null;
      })
      .filter((q): q is QuizQuestion => q !== null);

    const safeConcepts: KeyConcept[] = rawConcepts.map((item, idx) => {
      if (typeof item === 'string') {
        return {
          id: `concept_${idx}_${Date.now()}`,
          concept: item,
          summary: item,
          mastered: false,
        };
      }
      const rec = (item || {}) as Record<string, unknown>;
      return {
        id: `concept_${idx}_${Date.now()}`,
        concept: String(rec.concept || rec.title || `Key Point ${idx + 1}`),
        summary: String(rec.summary || rec.description || 'Core study takeaway.'),
        mastered: Boolean(rec.mastered || false),
      };
    });

    data = {
      title: typeof raw.title === 'string' ? raw.title : `${fallbackTopic} Study Pack`,
      topic: typeof raw.topic === 'string' ? raw.topic : fallbackTopic,
      summary: typeof raw.summary === 'string' ? raw.summary : `Interactive study session for ${fallbackTopic}`,
      keyConcepts: safeConcepts,
      flashcards: safeFlashcards.length > 0 ? safeFlashcards : [
        {
          id: 'card_default_1',
          front: 'Primary Concept',
          back: `Key insights derived from ${fallbackTopic}`,
          category: 'Overview',
          difficulty: 'medium',
          userStatus: 'learning',
        },
      ],
      quiz: safeQuiz.length > 0 ? safeQuiz : [
        {
          id: 'quiz_default_1',
          question: `What is the central focus of ${fallbackTopic}?`,
          options: ['Core conceptual foundation', 'Secondary auxiliary detail', 'Historical anomaly', 'None of the above'],
          correctAnswerIndex: 0,
          explanation: 'The primary concept establishes the framework for this subject.',
        },
      ],
    };
  }

  // Ensure answer index is valid for every quiz question
  const validatedQuiz = data.quiz.map((q, idx) => {
    let correctIdx = q.correctAnswerIndex;
    if (correctIdx < 0 || correctIdx >= q.options.length) {
      warnings.push(`Quiz item #${idx + 1} correct index (${correctIdx}) was invalid. Reset to 0.`);
      correctIdx = 0;
    }
    return {
      ...q,
      correctAnswerIndex: correctIdx,
    };
  });

  const session: StudySession = {
    id: `session_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    title: data.title || `${fallbackTopic} Guide`,
    topic: data.topic || fallbackTopic,
    summary: data.summary,
    keyConcepts: data.keyConcepts,
    flashcards: data.flashcards,
    quiz: validatedQuiz,
    createdAt: new Date().toISOString(),
    lastModifiedAt: new Date().toISOString(),
  };

  return { session, warnings };
}
