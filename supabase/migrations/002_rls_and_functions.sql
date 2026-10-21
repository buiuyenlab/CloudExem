-- ==============================================================================
-- CLOUDEXAM RLS POLICIES, FUNCTIONS & TRIGGERS - MIGRATION 002
-- ==============================================================================

-- 1. ENABLE ROW LEVEL SECURITY
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE class_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE question_banks ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE exam_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE exam_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE attempt_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- 2. HELPER FUNCTIONS FOR SECURITY
CREATE OR REPLACE FUNCTION auth_user_role()
RETURNS user_role AS $$
    SELECT role FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() AND role = 'admin' AND status = 'active'
    );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_teacher()
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() AND role = 'teacher' AND status = 'active'
    );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- 3. TRIGGER: AUTO-CREATE PROFILE ON NEW USER SIGNUP
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, full_name, avatar_url, role, status)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
        NEW.raw_user_meta_data->>'avatar_url',
        'student', -- Always default to student
        'active'
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- 4. PREVENT PRIVILEGE ESCALATION TRIGGER
CREATE OR REPLACE FUNCTION check_profile_update()
RETURNS TRIGGER AS $$
BEGIN
    -- Only admin can change role or status
    IF NOT is_admin() THEN
        IF OLD.role IS DISTINCT FROM NEW.role THEN
            RAISE EXCEPTION 'Only administrators can modify user roles.';
        END IF;
        IF OLD.status IS DISTINCT FROM NEW.status THEN
            RAISE EXCEPTION 'Only administrators can modify user status.';
        END IF;
    END IF;
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_check_profile_update ON profiles;
CREATE TRIGGER trg_check_profile_update
    BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION check_profile_update();

-- 5. POLICIES: PROFILES
CREATE POLICY "Public profile viewing for authenticated users" ON profiles
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can update their own non-sensitive profile info" ON profiles
    FOR UPDATE TO authenticated USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

CREATE POLICY "Admin full management of profiles" ON profiles
    FOR ALL TO authenticated USING (is_admin());

-- 6. POLICIES: CLASSES
CREATE POLICY "Teachers can view and manage their own classes" ON classes
    FOR ALL TO authenticated USING (teacher_id = auth.uid() OR is_admin());

CREATE POLICY "Students can view enrolled classes" ON classes
    FOR SELECT TO authenticated USING (
        id IN (SELECT class_id FROM class_members WHERE student_id = auth.uid())
    );

-- 7. POLICIES: CLASS_MEMBERS
CREATE POLICY "Teachers can view and manage members in their classes" ON class_members
    FOR ALL TO authenticated USING (
        class_id IN (SELECT id FROM classes WHERE teacher_id = auth.uid())
        OR is_admin()
    );

CREATE POLICY "Students can view their own class memberships" ON class_members
    FOR SELECT TO authenticated USING (student_id = auth.uid());

CREATE POLICY "Students can join classes via valid join" ON class_members
    FOR INSERT TO authenticated WITH CHECK (student_id = auth.uid());

-- 8. POLICIES: QUESTION_BANKS
CREATE POLICY "Teachers can manage their own question banks" ON question_banks
    FOR ALL TO authenticated USING (teacher_id = auth.uid() OR is_admin());

-- 9. POLICIES: QUESTIONS
-- Direct student access to questions table is BLOCKED to ensure correct_answers are never leaked.
CREATE POLICY "Teachers can manage their questions" ON questions
    FOR ALL TO authenticated USING (
        bank_id IN (SELECT id FROM question_banks WHERE teacher_id = auth.uid())
        OR is_admin()
    );

-- 10. POLICIES: EXAMS
CREATE POLICY "Teachers can manage their exams" ON exams
    FOR ALL TO authenticated USING (teacher_id = auth.uid() OR is_admin());

CREATE POLICY "Students can view published exams in enrolled classes" ON exams
    FOR SELECT TO authenticated USING (
        status = 'published' AND 
        class_id IN (SELECT class_id FROM class_members WHERE student_id = auth.uid())
    );

-- 11. POLICIES: EXAM_QUESTIONS
CREATE POLICY "Teachers can manage exam questions" ON exam_questions
    FOR ALL TO authenticated USING (
        exam_id IN (SELECT id FROM exams WHERE teacher_id = auth.uid())
        OR is_admin()
    );

-- 12. POLICIES: EXAM_ATTEMPTS
CREATE POLICY "Students can view and create their own exam attempts" ON exam_attempts
    FOR SELECT TO authenticated USING (student_id = auth.uid());

CREATE POLICY "Students can insert their own exam attempts" ON exam_attempts
    FOR INSERT TO authenticated WITH CHECK (student_id = auth.uid());

CREATE POLICY "Teachers can view attempts of their exams" ON exam_attempts
    FOR SELECT TO authenticated USING (
        exam_id IN (SELECT id FROM exams WHERE teacher_id = auth.uid())
        OR is_admin()
    );

CREATE POLICY "Admin can view all attempts" ON exam_attempts
    FOR SELECT TO authenticated USING (is_admin());

-- 13. POLICIES: ATTEMPT_ANSWERS
CREATE POLICY "Students can view and edit their answers during attempt" ON attempt_answers
    FOR ALL TO authenticated USING (
        attempt_id IN (
            SELECT id FROM exam_attempts 
            WHERE student_id = auth.uid()
        )
    );

CREATE POLICY "Teachers can view answers of their exams" ON attempt_answers
    FOR SELECT TO authenticated USING (
        attempt_id IN (
            SELECT a.id FROM exam_attempts a
            JOIN exams e ON e.id = a.exam_id
            WHERE e.teacher_id = auth.uid()
        )
        OR is_admin()
    );

-- 14. POLICIES: AUDIT_LOGS
CREATE POLICY "Admin can view audit logs" ON audit_logs
    FOR SELECT TO authenticated USING (is_admin());

CREATE POLICY "System can insert audit logs" ON audit_logs
    FOR INSERT TO authenticated WITH CHECK (true);

-- 15. ATOMIC RPC FUNCTION: START EXAM ATTEMPT
CREATE OR REPLACE FUNCTION start_exam_attempt(p_exam_id UUID, p_student_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_exam exams%ROWTYPE;
    v_attempt_count INT;
    v_active_attempt exam_attempts%ROWTYPE;
    v_new_attempt exam_attempts%ROWTYPE;
    v_deadline TIMESTAMPTZ;
    v_now TIMESTAMPTZ := NOW();
BEGIN
    -- 1. Fetch exam with row lock
    SELECT * INTO v_exam FROM exams WHERE id = p_exam_id FOR UPDATE;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Kỳ thi không tồn tại.');
    END IF;

    -- 2. Verify status
    IF v_exam.status <> 'published' THEN
        RETURN jsonb_build_object('success', false, 'message', 'Kỳ thi chưa được xuất bản hoặc đã kết thúc.');
    END IF;

    -- 3. Verify date window
    IF v_now < v_exam.start_at THEN
        RETURN jsonb_build_object('success', false, 'message', 'Kỳ thi chưa đến giờ bắt đầu.');
    END IF;

    IF v_now > v_exam.end_at THEN
        RETURN jsonb_build_object('success', false, 'message', 'Kỳ thi đã kết thúc thời gian mở.');
    END IF;

    -- 4. Check if student is member of class
    IF NOT EXISTS (
        SELECT 1 FROM class_members 
        WHERE class_id = v_exam.class_id AND student_id = p_student_id
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Bạn chưa tham gia lớp học có kỳ thi này.');
    END IF;

    -- 5. Check if there is an in_progress attempt
    SELECT * INTO v_active_attempt 
    FROM exam_attempts 
    WHERE exam_id = p_exam_id AND student_id = p_student_id AND status = 'in_progress'
    ORDER BY attempt_number DESC LIMIT 1;

    IF FOUND THEN
        -- If already expired, auto timeout it
        IF v_now > v_active_attempt.deadline_at + INTERVAL '30 seconds' THEN
            UPDATE exam_attempts SET status = 'timed_out' WHERE id = v_active_attempt.id;
        ELSE
            -- Return active attempt to resume
            RETURN jsonb_build_object(
                'success', true, 
                'resumed', true,
                'attempt', row_to_json(v_active_attempt)
            );
        END IF;
    END IF;

    -- 6. Count total previous attempts
    SELECT COUNT(*) INTO v_attempt_count 
    FROM exam_attempts 
    WHERE exam_id = p_exam_id AND student_id = p_student_id;

    IF v_attempt_count >= v_exam.max_attempts THEN
        RETURN jsonb_build_object('success', false, 'message', 'Bạn đã sử dụng hết số lần làm bài cho phép (' || v_exam.max_attempts || ' lần).');
    END IF;

    -- 7. Calculate server-enforced deadline
    -- Deadline is the earlier of: started_at + duration_minutes OR exam.end_at
    v_deadline := LEAST(v_now + (v_exam.duration_minutes || ' minutes')::INTERVAL, v_exam.end_at);

    -- 8. Insert new attempt
    INSERT INTO exam_attempts (
        exam_id,
        student_id,
        attempt_number,
        started_at,
        deadline_at,
        status,
        grading_status
    ) VALUES (
        p_exam_id,
        p_student_id,
        v_attempt_count + 1,
        v_now,
        v_deadline,
        'in_progress',
        'pending'
    ) RETURNING * INTO v_new_attempt;

    RETURN jsonb_build_object(
        'success', true,
        'resumed', false,
        'attempt', row_to_json(v_new_attempt)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

