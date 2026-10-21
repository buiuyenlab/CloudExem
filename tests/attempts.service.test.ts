import { describe, it, expect } from 'vitest';
import { evaluateQuestion } from '../server/src/modules/attempts/attempts.service';

describe('Exam Scoring Engine - evaluateQuestion', () => {
  describe('Single Choice Question', () => {
    it('should award points when single correct answer is selected', () => {
      const result = evaluateQuestion('single_choice', ['opt_b'], ['opt_b']);
      expect(result).toBe(true);
    });

    it('should NOT award points when incorrect answer is selected', () => {
      const result = evaluateQuestion('single_choice', ['opt_a'], ['opt_b']);
      expect(result).toBe(false);
    });

    it('should NOT award points when multiple answers are submitted for single choice', () => {
      const result = evaluateQuestion('single_choice', ['opt_a', 'opt_b'], ['opt_b']);
      expect(result).toBe(false);
    });

    it('should NOT award points when no answer is provided', () => {
      const result = evaluateQuestion('single_choice', [], ['opt_b']);
      expect(result).toBe(false);
    });
  });

  describe('Multiple Choice Question (Strict Match)', () => {
    it('should award points when EXACT set of correct answers is selected', () => {
      const result = evaluateQuestion('multiple_choice', ['opt_a', 'opt_b', 'opt_d'], ['opt_a', 'opt_b', 'opt_d']);
      expect(result).toBe(true);
    });

    it('should award points regardless of answer selection order', () => {
      const result = evaluateQuestion('multiple_choice', ['opt_d', 'opt_a', 'opt_b'], ['opt_a', 'opt_b', 'opt_d']);
      expect(result).toBe(true);
    });

    it('should NOT award points when there is an extra incorrect option selected', () => {
      // User selected a, b, d and also c (which is wrong)
      const result = evaluateQuestion('multiple_choice', ['opt_a', 'opt_b', 'opt_c', 'opt_d'], ['opt_a', 'opt_b', 'opt_d']);
      expect(result).toBe(false);
    });

    it('should NOT award points when a correct option is missing', () => {
      // User selected only a and b, missed d
      const result = evaluateQuestion('multiple_choice', ['opt_a', 'opt_b'], ['opt_a', 'opt_b', 'opt_d']);
      expect(result).toBe(false);
    });

    it('should NOT award points when empty array is provided', () => {
      const result = evaluateQuestion('multiple_choice', [], ['opt_a', 'opt_b']);
      expect(result).toBe(false);
    });
  });

  describe('True / False Question', () => {
    it('should award points when correct boolean option is selected', () => {
      const result = evaluateQuestion('true_false', ['opt_f'], ['opt_f']);
      expect(result).toBe(true);
    });

    it('should NOT award points when opposite boolean is selected', () => {
      const result = evaluateQuestion('true_false', ['opt_t'], ['opt_f']);
      expect(result).toBe(false);
    });
  });
});

