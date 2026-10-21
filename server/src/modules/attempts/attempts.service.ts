import { getSupabaseAdmin } from '../../config/supabase';
import { AppError } from '../../utils/response';

export interface GradeResult {
  score: number;
  totalPoints: number;
  correctCount: number;
  totalQuestions: number;
}

export function evaluateQuestion(
  questionType: 'single_choice' | 'multiple_choice' | 'true_false',
  studentAnswers: string[],
  correctAnswers: string[]
): boolean {
  if (!studentAnswers || studentAnswers.length === 0) return false;
  if (!correctAnswers || correctAnswers.length === 0) return false;

  if (questionType === 'single_choice' || questionType === 'true_false') {
    return studentAnswers.length === 1 && correctAnswers.includes(studentAnswers[0]);
  }

  if (questionType === 'multiple_choice') {
    // Strict match requirement: student must select all correct options and NO extra options
    if (studentAnswers.length !== correctAnswers.length) return false;
    const correctSet = new Set(correctAnswers);
    return studentAnswers.every(ans => correctSet.has(ans));
  }

  return false;
}

export async function gradeExamAttempt(attemptId: string): Promise<any> {
  const supabase = getSupabaseAdmin();

  // 1. Fetch attempt and exam
  const { data: attempt, error: attemptErr } = await supabase
    .from('exam_attempts')
    .select('*, exams(*)')
    .eq('id', attemptId)
    .single();

  if (attemptErr || !attempt) {
    throw new AppError(404, 'Không tìm thấy lượt làm bài.');
  }

  // Idempotency: if already submitted, return current record
  if (attempt.status === 'submitted') {
    return attempt;
  }

  // 2. Fetch exam questions with points and correct_answers (admin client)
  const { data: examQuestions, error: eqErr } = await supabase
    .from('exam_questions')
    .select('points, position, questions(id, question_type, correct_answers)')
    .eq('exam_id', attempt.exam_id);

  if (eqErr || !examQuestions) {
    throw new AppError(500, 'Không thể tải câu hỏi đề thi để chấm điểm.');
  }

  // 3. Fetch student's submitted answers
  const { data: studentAnswers } = await supabase
    .from('attempt_answers')
    .select('*')
    .eq('attempt_id', attemptId);

  const answerMap = new Map((studentAnswers || []).map(a => [a.question_id, a.answer_data]));

  let totalScore = 0;
  let totalPoints = 0;
  let correctCount = 0;

  for (const eq of examQuestions) {
    const q = eq.questions as any;
    const points = Number(eq.points) || 1.0;
    totalPoints += points;

    const studentChoice: string[] = answerMap.get(q.id) || [];
    const correctAnswers: string[] = q.correct_answers || [];

    const isCorrect = evaluateQuestion(q.question_type, studentChoice, correctAnswers);
    const awarded = isCorrect ? points : 0;

    if (isCorrect) correctCount++;
    totalScore += awarded;

    // Persist per-question score
    await supabase
      .from('attempt_answers')
      .upsert({
        attempt_id: attemptId,
        question_id: q.id,
        answer_data: studentChoice,
        is_correct: isCorrect,
        awarded_points: awarded,
        updated_at: new Date().toISOString()
      }, { onConflict: 'attempt_id,question_id' });
  }

  // 4. Mark attempt as submitted & graded atomically
  const { data: finalAttempt, error: updateErr } = await supabase
    .from('exam_attempts')
    .update({
      score: totalScore,
      total_points: totalPoints,
      status: 'submitted',
      grading_status: 'graded',
      submitted_at: new Date().toISOString()
    })
    .eq('id', attemptId)
    .select()
    .single();

  if (updateErr) {
    throw new AppError(500, 'Lỗi khi lưu kết quả bài thi: ' + updateErr.message);
  }

  return finalAttempt;
}

