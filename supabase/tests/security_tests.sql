-- ==============================================================================
-- ClubFlow - Security Verification Test Suite (Hardened v4)
-- Description: Automated SQL test suite simulating various authenticated roles to verify:
--   Test 1: Profile Insert Privilege Escalation Guard (Client cannot insert arbitrary roles)
--   Test 2: Role Consistency Guard (hierarchy_role must equal role)
--   Test 3: Trusted Admin Protection (Authenticated callers cannot spoof admin via request settings)
--   Test 4: Task Submissions Boundary & Anti-Self-Review
--   Test 5: Task Submission Content vs Review Field Separation
--   Test 6: Cross-Department Attendance Management Guard
--   Test 7: Faculty Advisor Read-Only Governance Guard
--   Test 8: Working Hours Cross-Department & Anti-Self-Verification Guard
--   Test 9: Announcement Department Target Isolation
--   Test 10: Initial President Bootstrap Authorization Guard
-- ==============================================================================

-- All tests run within discrete DO blocks wrapped with ROLLBACK mechanisms.
-- They can be executed safely in a Supabase staging database or SQL Editor.

-- ------------------------------------------------------------------------------
-- TEST 1: Profile Direct Insertion by Client / Self-Elevation Guard
-- Requirement: Authenticated clients cannot perform direct INSERT of profiles
-- with executive or elevated roles. New profiles must flow through handle_new_user()
-- or authorized executive member creation.
-- ------------------------------------------------------------------------------
DO $$
DECLARE
  v_attacker_id UUID := gen_random_uuid();
  v_dept_id UUID;
  v_caught_exception BOOLEAN := FALSE;
BEGIN
  SELECT id INTO v_dept_id FROM public.departments WHERE name = 'Technical' LIMIT 1;

  -- Simulate an authenticated attacker session
  PERFORM set_config('request.jwt.claim.sub', v_attacker_id::text, true);
  PERFORM set_config('request.jwt.claim.role', 'authenticated', true);

  -- Attempt 1: Direct INSERT into profiles making themselves President
  BEGIN
    INSERT INTO public.profiles (
      id, email, name, role, hierarchy_role, department_id, status
    ) VALUES (
      v_attacker_id, 'attacker@campus.edu', 'Attacker',
      'President', 'President', v_dept_id, 'Active'
    );
  EXCEPTION WHEN OTHERS THEN
    v_caught_exception := TRUE;
  END;

  IF NOT v_caught_exception THEN
    RAISE EXCEPTION 'TEST 1 FAILED: Authenticated client was able to directly INSERT profile as President!';
  END IF;

  -- Attempt 2: Direct INSERT into profiles with mismatching hierarchy_role
  v_caught_exception := FALSE;
  BEGIN
    INSERT INTO public.profiles (
      id, email, name, role, hierarchy_role, department_id, status
    ) VALUES (
      v_attacker_id, 'attacker2@campus.edu', 'Attacker 2',
      'Department Member', 'President', v_dept_id, 'Active'
    );
  EXCEPTION WHEN OTHERS THEN
    v_caught_exception := TRUE;
  END;

  IF NOT v_caught_exception THEN
    RAISE EXCEPTION 'TEST 1 FAILED: Client inserted profile with role mismatch!';
  END IF;

  RAISE NOTICE 'TEST 1 PASSED: Direct client profile insertion and role escalation prevented.';
  RAISE EXCEPTION 'Rollback test transaction' USING ERRCODE = 'check_violation';
EXCEPTION WHEN check_violation THEN
END $$;

-- ------------------------------------------------------------------------------
-- TEST 2: Role Consistency Guard (hierarchy_role vs role)
-- Requirement: public.profiles must enforce consistency between hierarchy_role and role.
-- ------------------------------------------------------------------------------
DO $$
DECLARE
  v_user_id UUID := gen_random_uuid();
  v_dept_id UUID;
  v_caught_exception BOOLEAN := FALSE;
BEGIN
  SELECT id INTO v_dept_id FROM public.departments WHERE name = 'Technical' LIMIT 1;

  -- As superuser / migration executor, try to violate consistency constraint
  BEGIN
    INSERT INTO public.profiles (
      id, email, name, role, hierarchy_role, department_id
    ) VALUES (
      v_user_id, 'inconsistent@campus.edu', 'Inconsistent User',
      'Department Member', 'Vice President', v_dept_id
    );
  EXCEPTION WHEN OTHERS THEN
    v_caught_exception := TRUE;
  END;

  IF NOT v_caught_exception THEN
    RAISE EXCEPTION 'TEST 2 FAILED: Database allowed contradictory role and hierarchy_role!';
  END IF;

  RAISE NOTICE 'TEST 2 PASSED: Role consistency enforced.';
  RAISE EXCEPTION 'Rollback test transaction' USING ERRCODE = 'check_violation';
EXCEPTION WHEN check_violation THEN
END $$;

-- ------------------------------------------------------------------------------
-- TEST 3: Trusted Admin Check & Request-Header Spoofing Resistance
-- Requirement: is_trusted_admin() must return FALSE for authenticated PostgREST calls
-- even if an attacker attempts to set request headers or parameters.
-- ------------------------------------------------------------------------------
DO $$
DECLARE
  v_attacker_id UUID := gen_random_uuid();
  v_is_admin BOOLEAN;
BEGIN
  -- Simulate authenticated user session
  PERFORM set_config('request.jwt.claim.sub', v_attacker_id::text, true);
  PERFORM set_config('request.jwt.claim.role', 'authenticated', true);

  -- Call is_trusted_admin()
  v_is_admin := public.is_trusted_admin();

  IF v_is_admin THEN
    RAISE EXCEPTION 'TEST 3 FAILED: is_trusted_admin() returned TRUE for an authenticated JWT session!';
  END IF;

  RAISE NOTICE 'TEST 3 PASSED: is_trusted_admin() correctly identifies non-admin authenticated session.';
  RAISE EXCEPTION 'Rollback test transaction' USING ERRCODE = 'check_violation';
EXCEPTION WHEN check_violation THEN
END $$;

-- ------------------------------------------------------------------------------
-- TEST 4: Task Submissions Anti-Self-Review & Immutability
-- Requirement: Submitter cannot approve their own submission.
-- task_id and submitted_by are completely immutable.
-- ------------------------------------------------------------------------------
DO $$
DECLARE
  v_lead_id UUID := gen_random_uuid();
  v_task_id UUID := gen_random_uuid();
  v_sub_id UUID := gen_random_uuid();
  v_dept_id UUID;
  v_caught_exception BOOLEAN := FALSE;
BEGIN
  SELECT id INTO v_dept_id FROM public.departments WHERE name = 'Technical' LIMIT 1;

  -- Setup Department Head
  INSERT INTO public.profiles (id, email, name, role, hierarchy_role, department_id)
  VALUES (v_lead_id, 'tech_head@campus.edu', 'Tech Head', 'Department Head', 'Department Head', v_dept_id);

  INSERT INTO public.tasks (id, title, department_id, assigned_by, assigned_to, deadline)
  VALUES (v_task_id, 'Core Migration', v_dept_id, v_lead_id, v_lead_id, CURRENT_DATE + 7);

  INSERT INTO public.task_submissions (id, task_id, submitted_by, submission_link, review_status)
  VALUES (v_sub_id, v_task_id, v_lead_id, 'https://github.com/deliverable', 'Pending');

  -- Simulate Lead session
  PERFORM set_config('request.jwt.claim.sub', v_lead_id::text, true);
  PERFORM set_config('request.jwt.claim.role', 'authenticated', true);

  -- Attempt 1: Self-approval
  BEGIN
    UPDATE public.task_submissions
    SET review_status = 'Approved', review_comment = 'Approved by myself'
    WHERE id = v_sub_id;
  EXCEPTION WHEN OTHERS THEN
    v_caught_exception := TRUE;
  END;

  IF NOT v_caught_exception THEN
    RAISE EXCEPTION 'TEST 4 FAILED: Submitter was able to self-approve their own task submission!';
  END IF;

  -- Attempt 2: Alter submitted_by
  v_caught_exception := FALSE;
  BEGIN
    UPDATE public.task_submissions
    SET submitted_by = gen_random_uuid()
    WHERE id = v_sub_id;
  EXCEPTION WHEN OTHERS THEN
    v_caught_exception := TRUE;
  END;

  IF NOT v_caught_exception THEN
    RAISE EXCEPTION 'TEST 4 FAILED: Submitter was able to tamper with submitted_by field!';
  END IF;

  RAISE NOTICE 'TEST 4 PASSED: Task self-approval and identity alteration prevented.';
  RAISE EXCEPTION 'Rollback test transaction' USING ERRCODE = 'check_violation';
EXCEPTION WHEN check_violation THEN
END $$;

-- ------------------------------------------------------------------------------
-- TEST 5: Task Submissions Separation of Roles: Content vs Review Fields
-- Requirement:
-- - Submitter CAN update submission_link/notes, CANNOT update review fields.
-- - Reviewer CAN update review fields, CANNOT alter submission content.
-- ------------------------------------------------------------------------------
DO $$
DECLARE
  v_reviewer_id UUID := gen_random_uuid();
  v_member_id UUID := gen_random_uuid();
  v_task_id UUID := gen_random_uuid();
  v_sub_id UUID := gen_random_uuid();
  v_dept_id UUID;
  v_caught_exception BOOLEAN := FALSE;
BEGIN
  SELECT id INTO v_dept_id FROM public.departments WHERE name = 'Technical' LIMIT 1;

  INSERT INTO public.profiles (id, email, name, role, hierarchy_role, department_id)
  VALUES (v_reviewer_id, 'reviewer@campus.edu', 'Reviewer Head', 'Department Head', 'Department Head', v_dept_id);

  INSERT INTO public.profiles (id, email, name, role, hierarchy_role, department_id)
  VALUES (v_member_id, 'member@campus.edu', 'Dept Member', 'Department Member', 'Department Member', v_dept_id);

  INSERT INTO public.tasks (id, title, department_id, assigned_by, assigned_to, deadline)
  VALUES (v_task_id, 'Implement Auth', v_dept_id, v_reviewer_id, v_member_id, CURRENT_DATE + 5);

  INSERT INTO public.task_submissions (id, task_id, submitted_by, submission_link, review_status)
  VALUES (v_sub_id, v_task_id, v_member_id, 'https://github.com/member/repo', 'Pending');

  -- Case A: Submitter updates link (MUST SUCCEED)
  PERFORM set_config('request.jwt.claim.sub', v_member_id::text, true);
  PERFORM set_config('request.jwt.claim.role', 'authenticated', true);

  UPDATE public.task_submissions
  SET submission_link = 'https://github.com/member/repo-v2'
  WHERE id = v_sub_id;

  -- Case B: Submitter tries to change review_status (MUST FAIL)
  BEGIN
    UPDATE public.task_submissions
    SET review_status = 'Approved'
    WHERE id = v_sub_id;
  EXCEPTION WHEN OTHERS THEN
    v_caught_exception := TRUE;
  END;

  IF NOT v_caught_exception THEN
    RAISE EXCEPTION 'TEST 5 FAILED: Submitter updated review_status!';
  END IF;

  -- Case C: Reviewer tries to change submission_link (MUST FAIL)
  PERFORM set_config('request.jwt.claim.sub', v_reviewer_id::text, true);
  PERFORM set_config('request.jwt.claim.role', 'authenticated', true);

  v_caught_exception := FALSE;
  BEGIN
    UPDATE public.task_submissions
    SET submission_link = 'https://malicious.com/fake'
    WHERE id = v_sub_id;
  EXCEPTION WHEN OTHERS THEN
    v_caught_exception := TRUE;
  END;

  IF NOT v_caught_exception THEN
    RAISE EXCEPTION 'TEST 5 FAILED: Reviewer was able to tamper with submitter content!';
  END IF;

  -- Case D: Reviewer updates review fields (MUST SUCCEED)
  UPDATE public.task_submissions
  SET review_status = 'Approved', review_comment = 'Great job'
  WHERE id = v_sub_id;

  RAISE NOTICE 'TEST 5 PASSED: Strict separation between submitter content and reviewer fields enforced.';
  RAISE EXCEPTION 'Rollback test transaction' USING ERRCODE = 'check_violation';
EXCEPTION WHEN check_violation THEN
END $$;

-- ------------------------------------------------------------------------------
-- TEST 6: Cross-Department Attendance Management Boundary
-- Requirement: Department lead can manage attendance ONLY for their own department.
-- ------------------------------------------------------------------------------
DO $$
DECLARE
  v_lead_id UUID := gen_random_uuid();
  v_design_mem_id UUID := gen_random_uuid();
  v_tech_dept_id UUID;
  v_design_dept_id UUID;
  v_caught_exception BOOLEAN := FALSE;
BEGIN
  SELECT id INTO v_tech_dept_id FROM public.departments WHERE name = 'Technical' LIMIT 1;
  SELECT id INTO v_design_dept_id FROM public.departments WHERE name = 'Design' LIMIT 1;

  INSERT INTO public.profiles (id, email, name, role, hierarchy_role, department_id)
  VALUES (v_lead_id, 'tech_head2@campus.edu', 'Tech Head 2', 'Department Head', 'Department Head', v_tech_dept_id);

  INSERT INTO public.profiles (id, email, name, role, hierarchy_role, department_id)
  VALUES (v_design_mem_id, 'design_mem2@campus.edu', 'Design Member 2', 'Department Member', 'Department Member', v_design_dept_id);

  -- Simulate Technical Lead session
  PERFORM set_config('request.jwt.claim.sub', v_lead_id::text, true);
  PERFORM set_config('request.jwt.claim.role', 'authenticated', true);

  BEGIN
    INSERT INTO public.attendance_records (
      event_name, member_id, department_id, recorded_by, status
    ) VALUES (
      'Design Sprint', v_design_mem_id, v_design_dept_id, v_lead_id, 'Present'
    );
  EXCEPTION WHEN OTHERS THEN
    v_caught_exception := TRUE;
  END;

  IF NOT v_caught_exception THEN
    RAISE EXCEPTION 'TEST 6 FAILED: Technical Head inserted attendance for Design Department!';
  END IF;

  RAISE NOTICE 'TEST 6 PASSED: Cross-department attendance logging rejected.';
  RAISE EXCEPTION 'Rollback test transaction' USING ERRCODE = 'check_violation';
EXCEPTION WHEN check_violation THEN
END $$;

-- ------------------------------------------------------------------------------
-- TEST 7: Faculty Advisor Read-Only Governance Guard
-- Requirement: Faculty Advisor has read access across club data, but CANNOT insert or update.
-- ------------------------------------------------------------------------------
DO $$
DECLARE
  v_advisor_id UUID := gen_random_uuid();
  v_student_id UUID := gen_random_uuid();
  v_dept_id UUID;
  v_caught_exception BOOLEAN := FALSE;
BEGIN
  SELECT id INTO v_dept_id FROM public.departments WHERE name = 'Technical' LIMIT 1;

  INSERT INTO public.profiles (id, email, name, role, hierarchy_role, department_id)
  VALUES (v_advisor_id, 'advisor@campus.edu', 'Faculty Advisor Dr. Patel', 'Faculty Advisor', 'Faculty Advisor', NULL);

  INSERT INTO public.profiles (id, email, name, role, hierarchy_role, department_id)
  VALUES (v_student_id, 'student_test@campus.edu', 'Student Member', 'Department Member', 'Department Member', v_dept_id);

  -- Simulate Faculty Advisor session
  PERFORM set_config('request.jwt.claim.sub', v_advisor_id::text, true);
  PERFORM set_config('request.jwt.claim.role', 'authenticated', true);

  -- Attempt to insert attendance
  BEGIN
    INSERT INTO public.attendance_records (
      event_name, member_id, department_id, recorded_by, status
    ) VALUES (
      'Advisory Session', v_student_id, v_dept_id, v_advisor_id, 'Present'
    );
  EXCEPTION WHEN OTHERS THEN
    v_caught_exception := TRUE;
  END;

  IF NOT v_caught_exception THEN
    RAISE EXCEPTION 'TEST 7 FAILED: Faculty Advisor was able to insert an attendance record!';
  END IF;

  RAISE NOTICE 'TEST 7 PASSED: Faculty Advisor read-only boundary enforced.';
  RAISE EXCEPTION 'Rollback test transaction' USING ERRCODE = 'check_violation';
EXCEPTION WHEN check_violation THEN
END $$;

-- ------------------------------------------------------------------------------
-- TEST 8: Working Hours Anti-Self-Verification & Cross-Department Guard
-- Requirement: Member cannot self-verify hours; Dept Head cannot verify cross-dept hours.
-- ------------------------------------------------------------------------------
DO $$
DECLARE
  v_tech_lead_id UUID := gen_random_uuid();
  v_design_lead_id UUID := gen_random_uuid();
  v_member_id UUID := gen_random_uuid();
  v_log_id UUID := gen_random_uuid();
  v_tech_dept_id UUID;
  v_design_dept_id UUID;
  v_caught_exception BOOLEAN := FALSE;
BEGIN
  SELECT id INTO v_tech_dept_id FROM public.departments WHERE name = 'Technical' LIMIT 1;
  SELECT id INTO v_design_dept_id FROM public.departments WHERE name = 'Design' LIMIT 1;

  INSERT INTO public.profiles (id, email, name, role, hierarchy_role, department_id)
  VALUES (v_tech_lead_id, 'tech_lead_wh@campus.edu', 'Tech Lead WH', 'Department Head', 'Department Head', v_tech_dept_id);

  INSERT INTO public.profiles (id, email, name, role, hierarchy_role, department_id)
  VALUES (v_design_lead_id, 'design_lead_wh@campus.edu', 'Design Lead WH', 'Department Head', 'Department Head', v_design_dept_id);

  INSERT INTO public.profiles (id, email, name, role, hierarchy_role, department_id)
  VALUES (v_member_id, 'tech_member_wh@campus.edu', 'Tech Member WH', 'Department Member', 'Department Member', v_tech_dept_id);

  INSERT INTO public.working_hours (id, member_id, department_id, project, hours, status)
  VALUES (v_log_id, v_member_id, v_tech_dept_id, 'Supabase Security', 5.0, 'Pending Verification');

  -- Attempt 1: Member self-verification
  PERFORM set_config('request.jwt.claim.sub', v_member_id::text, true);
  PERFORM set_config('request.jwt.claim.role', 'authenticated', true);

  BEGIN
    UPDATE public.working_hours
    SET status = 'Verified', verified_by = v_member_id
    WHERE id = v_log_id;
  EXCEPTION WHEN OTHERS THEN
    v_caught_exception := TRUE;
  END;

  IF NOT v_caught_exception THEN
    RAISE EXCEPTION 'TEST 8 FAILED: Member was able to self-verify working hours!';
  END IF;

  -- Attempt 2: Design Lead verifies Technical member's hours
  PERFORM set_config('request.jwt.claim.sub', v_design_lead_id::text, true);
  PERFORM set_config('request.jwt.claim.role', 'authenticated', true);

  v_caught_exception := FALSE;
  BEGIN
    UPDATE public.working_hours
    SET status = 'Verified', verified_by = v_design_lead_id
    WHERE id = v_log_id;
  EXCEPTION WHEN OTHERS THEN
    v_caught_exception := TRUE;
  END;

  IF NOT v_caught_exception THEN
    RAISE EXCEPTION 'TEST 8 FAILED: Cross-department Lead was able to verify working hours!';
  END IF;

  -- Attempt 3: Technical Lead verifies own department member's hours (MUST SUCCEED)
  PERFORM set_config('request.jwt.claim.sub', v_tech_lead_id::text, true);
  PERFORM set_config('request.jwt.claim.role', 'authenticated', true);

  UPDATE public.working_hours
  SET status = 'Verified', verified_by = v_tech_lead_id
  WHERE id = v_log_id;

  RAISE NOTICE 'TEST 8 PASSED: Working hours self-verification and cross-department boundaries enforced.';
  RAISE EXCEPTION 'Rollback test transaction' USING ERRCODE = 'check_violation';
EXCEPTION WHEN check_violation THEN
END $$;

-- ------------------------------------------------------------------------------
-- TEST 9: Announcement Department Target Isolation
-- Requirement: Department-specific announcements cannot be created for other departments
-- by a department lead.
-- ------------------------------------------------------------------------------
DO $$
DECLARE
  v_tech_lead_id UUID := gen_random_uuid();
  v_tech_dept_id UUID;
  v_design_dept_id UUID;
  v_caught_exception BOOLEAN := FALSE;
BEGIN
  SELECT id INTO v_tech_dept_id FROM public.departments WHERE name = 'Technical' LIMIT 1;
  SELECT id INTO v_design_dept_id FROM public.departments WHERE name = 'Design' LIMIT 1;

  INSERT INTO public.profiles (id, email, name, role, hierarchy_role, department_id)
  VALUES (v_tech_lead_id, 'tech_ann@campus.edu', 'Tech Lead Ann', 'Department Head', 'Department Head', v_tech_dept_id);

  -- Simulate Technical Lead
  PERFORM set_config('request.jwt.claim.sub', v_tech_lead_id::text, true);
  PERFORM set_config('request.jwt.claim.role', 'authenticated', true);

  BEGIN
    INSERT INTO public.announcements (
      title, content, author_id, target, department_id
    ) VALUES (
      'Design Notice', 'Design workshop at 3 PM', v_tech_lead_id, 'Department Specific', v_design_dept_id
    );
  EXCEPTION WHEN OTHERS THEN
    v_caught_exception := TRUE;
  END;

  IF NOT v_caught_exception THEN
    RAISE EXCEPTION 'TEST 9 FAILED: Technical Lead was able to publish announcement targeted to Design department!';
  END IF;

  RAISE NOTICE 'TEST 9 PASSED: Announcement department targeting isolated.';
  RAISE EXCEPTION 'Rollback test transaction' USING ERRCODE = 'check_violation';
EXCEPTION WHEN check_violation THEN
END $$;

-- ------------------------------------------------------------------------------
-- TEST 10: Initial President Bootstrap Authorization Guard
-- Requirement: Ordinary authenticated users cannot execute bootstrap_initial_president().
-- ------------------------------------------------------------------------------
DO $$
DECLARE
  v_regular_user_id UUID := gen_random_uuid();
  v_caught_exception BOOLEAN := FALSE;
BEGIN
  -- Simulate regular authenticated user
  PERFORM set_config('request.jwt.claim.sub', v_regular_user_id::text, true);
  PERFORM set_config('request.jwt.claim.role', 'authenticated', true);

  BEGIN
    PERFORM public.bootstrap_initial_president(v_regular_user_id, 'rogue_president@campus.edu', 'Rogue President');
  EXCEPTION WHEN OTHERS THEN
    v_caught_exception := TRUE;
  END;

  IF NOT v_caught_exception THEN
    RAISE EXCEPTION 'TEST 10 FAILED: Ordinary authenticated user was able to execute bootstrap_initial_president()!';
  END IF;

  RAISE NOTICE 'TEST 10 PASSED: bootstrap_initial_president() authorization check enforced.';
  RAISE EXCEPTION 'Rollback test transaction' USING ERRCODE = 'check_violation';
EXCEPTION WHEN check_violation THEN
END $$;
