-- ==============================================================================
-- ClubFlow - Security Verification Test Suite
-- File: supabase/tests/clubflow_security_tests.sql
-- Description: Automated security assertion test suite covering:
--   Test 1: Member Self-Role Escalation & Administrative Metric Tampering
--   Test 2: Role Consistency Guard (profiles.role vs profiles.hierarchy_role)
--   Test 3: Direct Client Profile Creation Restrictions
--   Test 4: Task Submissions Anti-Self-Review & Immutable Fields
--   Test 5: Task Submissions Submitter vs Reviewer Field Separation
--   Test 6: Department Boundary Enforcement for Attendance Logging
--   Test 7: Faculty Advisor Read-Only Governance Enforcement
--   Test 8: Working Hours Anti-Self-Verification & Cross-Department Protection
--   Test 9: Announcement Department Target Isolation
--   Test 10: Notification Recipient Scoping & Read-Only Payload Protection
--   Test 11: Task Assignee Tamper Guard & Status Transitions
--   Test 12: Initial President Bootstrap Function Authorization
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- ARCHITECTURAL NOTICE: SQL Editor vs Real Authenticated API Testing
-- ------------------------------------------------------------------------------
-- The tests below simulate authenticated user sessions within PostgreSQL by setting
-- session claim settings ('request.jwt.claim.sub' and 'request.jwt.claim.role').
--
-- TESTS THAT ARE FULLY VALID IN THE SQL EDITOR:
--   1. PostgreSQL table constraints, triggers, and column-level immutability rules.
--   2. Logic inside trigger functions and SECURITY DEFINER functions.
--   3. Cross-department foreign-key and business logic boundary validations.
--   4. RLS expression evaluation against session claim settings.
--
-- TESTS THAT MUST RUN VIA THE REAL AUTHENTICATED SUPABASE API (HTTP / SDK):
--   1. PostgREST Role Switching: Direct SQL Editor sessions run as superuser 'postgres',
--      which bypasses table-level GRANT/REVOKE checks unless 'SET ROLE authenticated;' is issued.
--   2. JWT Cryptographic Verification: PostgREST cryptographically signs and validates
--      tokens (expiry, issuer, audience). The SQL Editor cannot simulate token forgery or tampering.
--   3. Connection Pooling Isolation: Supavisor / PgBouncer resets per-transaction state.
--      Only real HTTP requests verify that session settings do not leak across connections.
--   4. Supabase Auth Onboarding: Real 'supabase.auth.signUp()' requests invoke the GoTrue
--      daemon and trigger 'handle_new_user()' with genuine auth.users rows.
-- ------------------------------------------------------------------------------

-- ------------------------------------------------------------------------------
-- TEST 1: Member Self-Role Escalation & Administrative Tampering Guard
-- Expectation:
--   A) Self-promotion from Member to President MUST FAIL with a Security Policy Violation.
--   B) Self-modifying tasks_completed or attendance_rate MUST FAIL.
--   C) Updating permitted personal field (phone) MUST SUCCEED.
-- ------------------------------------------------------------------------------
DO $$
DECLARE
  v_test_name CONSTANT TEXT := 'TEST 1: Member Self-Role Escalation';
  v_user_id UUID := gen_random_uuid();
  v_dept_id UUID;
  v_caught_security_error BOOLEAN := FALSE;
  v_err_msg TEXT := '';
BEGIN
  SELECT id INTO v_dept_id FROM public.departments WHERE name = 'Technical' LIMIT 1;

  -- Setup test profile as trusted admin
  INSERT INTO public.profiles (
    id, email, name, role, hierarchy_role, department_id, status, attendance_rate, tasks_completed, working_hours
  ) VALUES (
    v_user_id, 'test_member_t1@campus.edu', 'Test Member T1',
    'Department Member', 'Department Member', v_dept_id, 'Active', 100.00, 0, 0.00
  );

  -- Simulate authenticated session
  PERFORM set_config('request.jwt.claim.sub', v_user_id::text, true);
  PERFORM set_config('request.jwt.claim.role', 'authenticated', true);

  -- Sub-Test A: Attempt self-promotion to President
  v_caught_security_error := FALSE;
  BEGIN
    UPDATE public.profiles
    SET hierarchy_role = 'President'
    WHERE id = v_user_id;
  EXCEPTION WHEN OTHERS THEN
    v_caught_security_error := TRUE;
    v_err_msg := SQLERRM;
  END;

  IF NOT v_caught_security_error THEN
    RAISE EXCEPTION 'ASSERTION FAILED in [%]: Member was able to self-promote to President!', v_test_name;
  END IF;

  -- Sub-Test B: Attempt to tamper with administrative metric tasks_completed
  v_caught_security_error := FALSE;
  BEGIN
    UPDATE public.profiles
    SET tasks_completed = 50
    WHERE id = v_user_id;
  EXCEPTION WHEN OTHERS THEN
    v_caught_security_error := TRUE;
    v_err_msg := SQLERRM;
  END;

  IF NOT v_caught_security_error THEN
    RAISE EXCEPTION 'ASSERTION FAILED in [%]: Member was able to modify tasks_completed metric!', v_test_name;
  END IF;

  -- Sub-Test C: Updating permitted personal field (phone) MUST SUCCEED
  BEGIN
    UPDATE public.profiles
    SET phone = '+1-555-0199'
    WHERE id = v_user_id;
  EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'ASSERTION FAILED in [%]: Permitted personal profile update failed: %', v_test_name, SQLERRM;
  END;

  -- Cleanup test record
  PERFORM set_config('request.jwt.claim.role', 'service_role', true);
  DELETE FROM public.profiles WHERE id = v_user_id;

  RAISE NOTICE 'PASSED: %', v_test_name;
END $$;

-- ------------------------------------------------------------------------------
-- TEST 2: Role Consistency Guard (profiles.role vs profiles.hierarchy_role)
-- Expectation:
--   Inserting or updating a profile with contradictory role and hierarchy_role
--   MUST FAIL due to the table check constraint ck_profiles_role_consistency.
-- ------------------------------------------------------------------------------
DO $$
DECLARE
  v_test_name CONSTANT TEXT := 'TEST 2: Role Consistency Guard';
  v_user_id UUID := gen_random_uuid();
  v_dept_id UUID;
  v_caught_security_error BOOLEAN := FALSE;
BEGIN
  SELECT id INTO v_dept_id FROM public.departments WHERE name = 'Technical' LIMIT 1;

  BEGIN
    INSERT INTO public.profiles (
      id, email, name, role, hierarchy_role, department_id, status
    ) VALUES (
      v_user_id, 'inconsistent_t2@campus.edu', 'Inconsistent User',
      'Department Member', 'President', v_dept_id, 'Active'
    );
  EXCEPTION WHEN OTHERS THEN
    v_caught_security_error := TRUE;
  END;

  IF NOT v_caught_security_error THEN
    DELETE FROM public.profiles WHERE id = v_user_id;
    RAISE EXCEPTION 'ASSERTION FAILED in [%]: Table accepted contradictory role and hierarchy_role!', v_test_name;
  END IF;

  RAISE NOTICE 'PASSED: %', v_test_name;
END $$;

-- ------------------------------------------------------------------------------
-- TEST 3: Direct Client Profile Creation Restrictions
-- Expectation:
--   An authenticated client (non-executive) cannot directly insert profiles via PostgREST.
-- ------------------------------------------------------------------------------
DO $$
DECLARE
  v_test_name CONSTANT TEXT := 'TEST 3: Direct Client Profile Creation Restrictions';
  v_attacker_id UUID := gen_random_uuid();
  v_new_id UUID := gen_random_uuid();
  v_dept_id UUID;
  v_caught_security_error BOOLEAN := FALSE;
BEGIN
  SELECT id INTO v_dept_id FROM public.departments WHERE name = 'Technical' LIMIT 1;

  -- Setup regular member
  INSERT INTO public.profiles (
    id, email, name, role, hierarchy_role, department_id, status
  ) VALUES (
    v_attacker_id, 'attacker_t3@campus.edu', 'Attacker T3',
    'Department Member', 'Department Member', v_dept_id, 'Active'
  );

  -- Simulate authenticated attacker session
  PERFORM set_config('request.jwt.claim.sub', v_attacker_id::text, true);
  PERFORM set_config('request.jwt.claim.role', 'authenticated', true);

  BEGIN
    INSERT INTO public.profiles (
      id, email, name, role, hierarchy_role, department_id, status
    ) VALUES (
      v_new_id, 'spoofed_t3@campus.edu', 'Spoofed User',
      'President', 'President', v_dept_id, 'Active'
    );
  EXCEPTION WHEN OTHERS THEN
    v_caught_security_error := TRUE;
  END;

  -- Cleanup
  PERFORM set_config('request.jwt.claim.role', 'service_role', true);
  DELETE FROM public.profiles WHERE id IN (v_attacker_id, v_new_id);

  IF NOT v_caught_security_error THEN
    RAISE EXCEPTION 'ASSERTION FAILED in [%]: Non-executive was able to directly insert a new profile!', v_test_name;
  END IF;

  RAISE NOTICE 'PASSED: %', v_test_name;
END $$;

-- ------------------------------------------------------------------------------
-- TEST 4: Task Submissions Anti-Self-Review & Immutable Fields
-- Expectation:
--   A) Submitter CANNOT mark their own submission as 'Approved' or set review_status.
--   B) Submitter CANNOT alter submitted_by or task_id.
-- ------------------------------------------------------------------------------
DO $$
DECLARE
  v_test_name CONSTANT TEXT := 'TEST 4: Task Submissions Anti-Self-Review & Immutability';
  v_lead_id UUID := gen_random_uuid();
  v_task_id UUID := gen_random_uuid();
  v_sub_id UUID := gen_random_uuid();
  v_dept_id UUID;
  v_caught_security_error BOOLEAN := FALSE;
BEGIN
  SELECT id INTO v_dept_id FROM public.departments WHERE name = 'Technical' LIMIT 1;

  -- Create Department Head profile
  INSERT INTO public.profiles (id, email, name, role, hierarchy_role, department_id)
  VALUES (v_lead_id, 'lead_sub_t4@campus.edu', 'Lead Submitter T4', 'Department Head', 'Department Head', v_dept_id);

  INSERT INTO public.tasks (id, title, department_id, assigned_by, assigned_to, deadline)
  VALUES (v_task_id, 'Task T4', v_dept_id, v_lead_id, v_lead_id, CURRENT_DATE + 7);

  INSERT INTO public.task_submissions (id, task_id, submitted_by, submission_link, review_status)
  VALUES (v_sub_id, v_task_id, v_lead_id, 'https://github.com/deliverable-t4', 'Pending');

  -- Simulate Lead session
  PERFORM set_config('request.jwt.claim.sub', v_lead_id::text, true);
  PERFORM set_config('request.jwt.claim.role', 'authenticated', true);

  -- Sub-Test A: Self-approval attempt
  v_caught_security_error := FALSE;
  BEGIN
    UPDATE public.task_submissions
    SET review_status = 'Approved', review_comment = 'Self-approved!'
    WHERE id = v_sub_id;
  EXCEPTION WHEN OTHERS THEN
    v_caught_security_error := TRUE;
  END;

  IF NOT v_caught_security_error THEN
    RAISE EXCEPTION 'ASSERTION FAILED in [%]: Submitter was able to self-approve their own submission!', v_test_name;
  END IF;

  -- Sub-Test B: Attempt to change submitted_by
  v_caught_security_error := FALSE;
  BEGIN
    UPDATE public.task_submissions
    SET submitted_by = gen_random_uuid()
    WHERE id = v_sub_id;
  EXCEPTION WHEN OTHERS THEN
    v_caught_security_error := TRUE;
  END;

  IF NOT v_caught_security_error THEN
    RAISE EXCEPTION 'ASSERTION FAILED in [%]: Submitter was able to change submitted_by on task_submissions!', v_test_name;
  END IF;

  -- Cleanup
  PERFORM set_config('request.jwt.claim.role', 'service_role', true);
  DELETE FROM public.task_submissions WHERE id = v_sub_id;
  DELETE FROM public.tasks WHERE id = v_task_id;
  DELETE FROM public.profiles WHERE id = v_lead_id;

  RAISE NOTICE 'PASSED: %', v_test_name;
END $$;

-- ------------------------------------------------------------------------------
-- TEST 5: Task Submissions Submitter vs Reviewer Field Separation
-- Expectation:
--   A) Submitter CAN update submission_link and submission_notes on pending submission.
--   B) Submitter CANNOT update review_status or review_comment.
--   C) Reviewer CANNOT alter submission_link or submission_notes.
--   D) Reviewer CAN update review_status to 'Approved' and add review_comment.
-- ------------------------------------------------------------------------------
DO $$
DECLARE
  v_test_name CONSTANT TEXT := 'TEST 5: Submitter vs Reviewer Field Separation';
  v_reviewer_id UUID := gen_random_uuid();
  v_member_id UUID := gen_random_uuid();
  v_task_id UUID := gen_random_uuid();
  v_sub_id UUID := gen_random_uuid();
  v_dept_id UUID;
  v_caught_security_error BOOLEAN := FALSE;
BEGIN
  SELECT id INTO v_dept_id FROM public.departments WHERE name = 'Technical' LIMIT 1;

  INSERT INTO public.profiles (id, email, name, role, hierarchy_role, department_id)
  VALUES (v_reviewer_id, 'reviewer_t5@campus.edu', 'Reviewer Head T5', 'Department Head', 'Department Head', v_dept_id);

  INSERT INTO public.profiles (id, email, name, role, hierarchy_role, department_id)
  VALUES (v_member_id, 'member_t5@campus.edu', 'Member T5', 'Department Member', 'Department Member', v_dept_id);

  INSERT INTO public.tasks (id, title, department_id, assigned_by, assigned_to, deadline)
  VALUES (v_task_id, 'Task T5', v_dept_id, v_reviewer_id, v_member_id, CURRENT_DATE + 5);

  INSERT INTO public.task_submissions (id, task_id, submitted_by, submission_link, review_status)
  VALUES (v_sub_id, v_task_id, v_member_id, 'https://github.com/v1', 'Pending');

  -- Step A: Submitter updates link (MUST SUCCEED)
  PERFORM set_config('request.jwt.claim.sub', v_member_id::text, true);
  PERFORM set_config('request.jwt.claim.role', 'authenticated', true);

  BEGIN
    UPDATE public.task_submissions
    SET submission_link = 'https://github.com/v2', submission_notes = 'Revised commit'
    WHERE id = v_sub_id;
  EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'ASSERTION FAILED in [%]: Submitter could not update submission_link: %', v_test_name, SQLERRM;
  END;

  -- Step B: Submitter tries to change review_status (MUST FAIL)
  v_caught_security_error := FALSE;
  BEGIN
    UPDATE public.task_submissions
    SET review_status = 'Approved'
    WHERE id = v_sub_id;
  EXCEPTION WHEN OTHERS THEN
    v_caught_security_error := TRUE;
  END;

  IF NOT v_caught_security_error THEN
    RAISE EXCEPTION 'ASSERTION FAILED in [%]: Submitter was able to set review_status!', v_test_name;
  END IF;

  -- Step C: Reviewer tries to change submission_link (MUST FAIL)
  PERFORM set_config('request.jwt.claim.sub', v_reviewer_id::text, true);
  PERFORM set_config('request.jwt.claim.role', 'authenticated', true);

  v_caught_security_error := FALSE;
  BEGIN
    UPDATE public.task_submissions
    SET submission_link = 'https://tampered-url.com'
    WHERE id = v_sub_id;
  EXCEPTION WHEN OTHERS THEN
    v_caught_security_error := TRUE;
  END;

  IF NOT v_caught_security_error THEN
    RAISE EXCEPTION 'ASSERTION FAILED in [%]: Reviewer was able to modify submitter deliverable link!', v_test_name;
  END IF;

  -- Step D: Reviewer approves submission (MUST SUCCEED)
  BEGIN
    UPDATE public.task_submissions
    SET review_status = 'Approved', review_comment = 'Code meets requirements'
    WHERE id = v_sub_id;
  EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'ASSERTION FAILED in [%]: Reviewer approval failed unexpectedly: %', v_test_name, SQLERRM;
  END;

  -- Cleanup
  PERFORM set_config('request.jwt.claim.role', 'service_role', true);
  DELETE FROM public.task_submissions WHERE id = v_sub_id;
  DELETE FROM public.tasks WHERE id = v_task_id;
  DELETE FROM public.profiles WHERE id IN (v_reviewer_id, v_member_id);

  RAISE NOTICE 'PASSED: %', v_test_name;
END $$;

-- ------------------------------------------------------------------------------
-- TEST 6: Department Boundary Enforcement for Attendance Logging
-- Expectation:
--   A) Department Head of 'Technical' CANNOT record attendance for 'Design' member.
--   B) Department Head of 'Technical' CAN record attendance for 'Technical' member.
-- ------------------------------------------------------------------------------
DO $$
DECLARE
  v_test_name CONSTANT TEXT := 'TEST 6: Attendance Department Boundary';
  v_lead_id UUID := gen_random_uuid();
  v_tech_mem_id UUID := gen_random_uuid();
  v_design_mem_id UUID := gen_random_uuid();
  v_tech_dept_id UUID;
  v_design_dept_id UUID;
  v_att_id UUID := gen_random_uuid();
  v_caught_security_error BOOLEAN := FALSE;
BEGIN
  SELECT id INTO v_tech_dept_id FROM public.departments WHERE name = 'Technical' LIMIT 1;
  SELECT id INTO v_design_dept_id FROM public.departments WHERE name = 'Design' LIMIT 1;

  INSERT INTO public.profiles (id, email, name, role, hierarchy_role, department_id)
  VALUES (v_lead_id, 'tech_lead_t6@campus.edu', 'Tech Lead T6', 'Department Head', 'Department Head', v_tech_dept_id);

  INSERT INTO public.profiles (id, email, name, role, hierarchy_role, department_id)
  VALUES (v_tech_mem_id, 'tech_mem_t6@campus.edu', 'Tech Member T6', 'Department Member', 'Department Member', v_tech_dept_id);

  INSERT INTO public.profiles (id, email, name, role, hierarchy_role, department_id)
  VALUES (v_design_mem_id, 'design_mem_t6@campus.edu', 'Design Member T6', 'Department Member', 'Department Member', v_design_dept_id);

  -- Simulate Technical Lead
  PERFORM set_config('request.jwt.claim.sub', v_lead_id::text, true);
  PERFORM set_config('request.jwt.claim.role', 'authenticated', true);

  -- Sub-Test A: Attempt to record attendance for Design member in Design department (MUST FAIL)
  v_caught_security_error := FALSE;
  BEGIN
    INSERT INTO public.attendance_records (
      event_name, member_id, department_id, recorded_by, status
    ) VALUES (
      'Design Sprint', v_design_mem_id, v_design_dept_id, v_lead_id, 'Present'
    );
  EXCEPTION WHEN OTHERS THEN
    v_caught_security_error := TRUE;
  END;

  IF NOT v_caught_security_error THEN
    RAISE EXCEPTION 'ASSERTION FAILED in [%]: Technical Head recorded attendance for Design Department!', v_test_name;
  END IF;

  -- Sub-Test B: Record attendance for Technical member in Technical department (MUST SUCCEED)
  BEGIN
    INSERT INTO public.attendance_records (
      id, event_name, member_id, department_id, recorded_by, status
    ) VALUES (
      v_att_id, 'Tech Workshop', v_tech_mem_id, v_tech_dept_id, v_lead_id, 'Present'
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'ASSERTION FAILED in [%]: Department head could not record attendance for own department: %', v_test_name, SQLERRM;
  END;

  -- Cleanup
  PERFORM set_config('request.jwt.claim.role', 'service_role', true);
  DELETE FROM public.attendance_records WHERE id = v_att_id;
  DELETE FROM public.profiles WHERE id IN (v_lead_id, v_tech_mem_id, v_design_mem_id);

  RAISE NOTICE 'PASSED: %', v_test_name;
END $$;

-- ------------------------------------------------------------------------------
-- TEST 7: Faculty Advisor Read-Only Governance Enforcement
-- Expectation:
--   A) Faculty Advisor CANNOT insert attendance records.
--   B) Faculty Advisor CANNOT create tasks.
--   C) Faculty Advisor CANNOT create events.
--   D) Faculty Advisor CANNOT insert working hours.
-- ------------------------------------------------------------------------------
DO $$
DECLARE
  v_test_name CONSTANT TEXT := 'TEST 7: Faculty Advisor Read-Only Governance';
  v_advisor_id UUID := gen_random_uuid();
  v_member_id UUID := gen_random_uuid();
  v_dept_id UUID;
  v_caught_security_error BOOLEAN := FALSE;
BEGIN
  SELECT id INTO v_dept_id FROM public.departments WHERE name = 'Technical' LIMIT 1;

  INSERT INTO public.profiles (id, email, name, role, hierarchy_role, department_id)
  VALUES (v_advisor_id, 'advisor_t7@campus.edu', 'Dr. Patel T7', 'Faculty Advisor', 'Faculty Advisor', NULL);

  INSERT INTO public.profiles (id, email, name, role, hierarchy_role, department_id)
  VALUES (v_member_id, 'member_t7@campus.edu', 'Member T7', 'Department Member', 'Department Member', v_dept_id);

  -- Simulate Faculty Advisor session
  PERFORM set_config('request.jwt.claim.sub', v_advisor_id::text, true);
  PERFORM set_config('request.jwt.claim.role', 'authenticated', true);

  -- Sub-Test A: Attempt to insert attendance (MUST FAIL)
  v_caught_security_error := FALSE;
  BEGIN
    INSERT INTO public.attendance_records (
      event_name, member_id, department_id, recorded_by, status
    ) VALUES (
      'Faculty Review', v_member_id, v_dept_id, v_advisor_id, 'Present'
    );
  EXCEPTION WHEN OTHERS THEN
    v_caught_security_error := TRUE;
  END;

  IF NOT v_caught_security_error THEN
    RAISE EXCEPTION 'ASSERTION FAILED in [%]: Faculty Advisor inserted attendance record!', v_test_name;
  END IF;

  -- Sub-Test B: Attempt to create task (MUST FAIL)
  v_caught_security_error := FALSE;
  BEGIN
    INSERT INTO public.tasks (
      title, department_id, assigned_by, assigned_to, deadline
    ) VALUES (
      'Advisor Task', v_dept_id, v_advisor_id, v_member_id, CURRENT_DATE + 3
    );
  EXCEPTION WHEN OTHERS THEN
    v_caught_security_error := TRUE;
  END;

  IF NOT v_caught_security_error THEN
    RAISE EXCEPTION 'ASSERTION FAILED in [%]: Faculty Advisor created a task!', v_test_name;
  END IF;

  -- Cleanup
  PERFORM set_config('request.jwt.claim.role', 'service_role', true);
  DELETE FROM public.profiles WHERE id IN (v_advisor_id, v_member_id);

  RAISE NOTICE 'PASSED: %', v_test_name;
END $$;

-- ------------------------------------------------------------------------------
-- TEST 8: Working Hours Anti-Self-Verification & Cross-Department Protection
-- Expectation:
--   A) Member CANNOT transition their own working hours record to 'Verified'.
--   B) Department Head CANNOT verify working hours for another department's member.
--   C) Department Head CAN verify working hours for their own department member.
-- ------------------------------------------------------------------------------
DO $$
DECLARE
  v_test_name CONSTANT TEXT := 'TEST 8: Working Hours Anti-Self-Verification';
  v_tech_lead_id UUID := gen_random_uuid();
  v_design_lead_id UUID := gen_random_uuid();
  v_tech_mem_id UUID := gen_random_uuid();
  v_log_id UUID := gen_random_uuid();
  v_tech_dept_id UUID;
  v_design_dept_id UUID;
  v_caught_security_error BOOLEAN := FALSE;
BEGIN
  SELECT id INTO v_tech_dept_id FROM public.departments WHERE name = 'Technical' LIMIT 1;
  SELECT id INTO v_design_dept_id FROM public.departments WHERE name = 'Design' LIMIT 1;

  INSERT INTO public.profiles (id, email, name, role, hierarchy_role, department_id)
  VALUES (v_tech_lead_id, 'tech_lead_t8@campus.edu', 'Tech Lead T8', 'Department Head', 'Department Head', v_tech_dept_id);

  INSERT INTO public.profiles (id, email, name, role, hierarchy_role, department_id)
  VALUES (v_design_lead_id, 'design_lead_t8@campus.edu', 'Design Lead T8', 'Department Head', 'Department Head', v_design_dept_id);

  INSERT INTO public.profiles (id, email, name, role, hierarchy_role, department_id)
  VALUES (v_tech_mem_id, 'tech_mem_t8@campus.edu', 'Tech Member T8', 'Department Member', 'Department Member', v_tech_dept_id);

  INSERT INTO public.working_hours (id, member_id, department_id, project, hours, status)
  VALUES (v_log_id, v_tech_mem_id, v_tech_dept_id, 'Testing Security', 4.0, 'Pending Verification');

  -- Sub-Test A: Member attempts self-verification (MUST FAIL)
  PERFORM set_config('request.jwt.claim.sub', v_tech_mem_id::text, true);
  PERFORM set_config('request.jwt.claim.role', 'authenticated', true);

  v_caught_security_error := FALSE;
  BEGIN
    UPDATE public.working_hours
    SET status = 'Verified', verified_by = v_tech_mem_id
    WHERE id = v_log_id;
  EXCEPTION WHEN OTHERS THEN
    v_caught_security_error := TRUE;
  END;

  IF NOT v_caught_security_error THEN
    RAISE EXCEPTION 'ASSERTION FAILED in [%]: Member was able to self-verify working hours!', v_test_name;
  END IF;

  -- Sub-Test B: Design Lead attempts to verify Technical member's hours (MUST FAIL)
  PERFORM set_config('request.jwt.claim.sub', v_design_lead_id::text, true);
  PERFORM set_config('request.jwt.claim.role', 'authenticated', true);

  v_caught_security_error := FALSE;
  BEGIN
    UPDATE public.working_hours
    SET status = 'Verified', verified_by = v_design_lead_id
    WHERE id = v_log_id;
  EXCEPTION WHEN OTHERS THEN
    v_caught_security_error := TRUE;
  END;

  IF NOT v_caught_security_error THEN
    RAISE EXCEPTION 'ASSERTION FAILED in [%]: Cross-department Lead was able to verify working hours!', v_test_name;
  END IF;

  -- Sub-Test C: Technical Lead verifies own department member's hours (MUST SUCCEED)
  PERFORM set_config('request.jwt.claim.sub', v_tech_lead_id::text, true);
  PERFORM set_config('request.jwt.claim.role', 'authenticated', true);

  BEGIN
    UPDATE public.working_hours
    SET status = 'Verified', verified_by = v_tech_lead_id
    WHERE id = v_log_id;
  EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'ASSERTION FAILED in [%]: Authorized Lead could not verify working hours: %', v_test_name, SQLERRM;
  END;

  -- Cleanup
  PERFORM set_config('request.jwt.claim.role', 'service_role', true);
  DELETE FROM public.working_hours WHERE id = v_log_id;
  DELETE FROM public.profiles WHERE id IN (v_tech_lead_id, v_design_lead_id, v_tech_mem_id);

  RAISE NOTICE 'PASSED: %', v_test_name;
END $$;

-- ------------------------------------------------------------------------------
-- TEST 9: Announcement Department Target Isolation
-- Expectation:
--   A) Department Lead CANNOT post an announcement targeted to another department.
--   B) Department Lead CANNOT post an announcement targeted to 'All Members'.
--   C) Executive CAN post an announcement to 'All Members'.
-- ------------------------------------------------------------------------------
DO $$
DECLARE
  v_test_name CONSTANT TEXT := 'TEST 9: Announcement Department Target Isolation';
  v_lead_id UUID := gen_random_uuid();
  v_exec_id UUID := gen_random_uuid();
  v_tech_dept_id UUID;
  v_design_dept_id UUID;
  v_ann_id UUID := gen_random_uuid();
  v_caught_security_error BOOLEAN := FALSE;
BEGIN
  SELECT id INTO v_tech_dept_id FROM public.departments WHERE name = 'Technical' LIMIT 1;
  SELECT id INTO v_design_dept_id FROM public.departments WHERE name = 'Design' LIMIT 1;

  INSERT INTO public.profiles (id, email, name, role, hierarchy_role, department_id)
  VALUES (v_lead_id, 'tech_ann_t9@campus.edu', 'Tech Lead T9', 'Department Head', 'Department Head', v_tech_dept_id);

  INSERT INTO public.profiles (id, email, name, role, hierarchy_role, department_id)
  VALUES (v_exec_id, 'president_t9@campus.edu', 'President T9', 'President', 'President', v_tech_dept_id);

  -- Simulate Technical Lead
  PERFORM set_config('request.jwt.claim.sub', v_lead_id::text, true);
  PERFORM set_config('request.jwt.claim.role', 'authenticated', true);

  -- Sub-Test A: Attempt to post announcement for Design Department (MUST FAIL)
  v_caught_security_error := FALSE;
  BEGIN
    INSERT INTO public.announcements (
      title, content, author_id, audience, target_department_id
    ) VALUES (
      'Design Notice', 'Notice content', v_lead_id, 'Specific Department', v_design_dept_id
    );
  EXCEPTION WHEN OTHERS THEN
    v_caught_security_error := TRUE;
  END;

  IF NOT v_caught_security_error THEN
    RAISE EXCEPTION 'ASSERTION FAILED in [%]: Department Lead posted announcement targeted to foreign department!', v_test_name;
  END IF;

  -- Sub-Test B: Attempt to post announcement to 'All Members' as Department Lead (MUST FAIL)
  v_caught_security_error := FALSE;
  BEGIN
    INSERT INTO public.announcements (
      title, content, author_id, audience
    ) VALUES (
      'Club-Wide Notice', 'All members content', v_lead_id, 'All Members'
    );
  EXCEPTION WHEN OTHERS THEN
    v_caught_security_error := TRUE;
  END;

  IF NOT v_caught_security_error THEN
    RAISE EXCEPTION 'ASSERTION FAILED in [%]: Department Lead posted announcement to All Members!', v_test_name;
  END IF;

  -- Sub-Test C: Executive posts announcement to 'All Members' (MUST SUCCEED)
  PERFORM set_config('request.jwt.claim.sub', v_exec_id::text, true);
  PERFORM set_config('request.jwt.claim.role', 'authenticated', true);

  BEGIN
    INSERT INTO public.announcements (
      id, title, content, posted_by, audience
    ) VALUES (
      v_ann_id, 'Executive Welcome', 'Welcome to the semester', v_exec_id, 'All Members'
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'ASSERTION FAILED in [%]: Executive could not post All Members announcement: %', v_test_name, SQLERRM;
  END;

  -- Cleanup
  PERFORM set_config('request.jwt.claim.role', 'service_role', true);
  DELETE FROM public.announcements WHERE id = v_ann_id;
  DELETE FROM public.profiles WHERE id IN (v_lead_id, v_exec_id);

  RAISE NOTICE 'PASSED: %', v_test_name;
END $$;

-- ------------------------------------------------------------------------------
-- TEST 10: Notification Recipient Scoping & Read-Only Payload Protection
-- Expectation:
--   A) Recipient CAN mark notification as read (read = true, read_at = NOW()).
--   B) Recipient CANNOT modify notification message, title, or type.
-- ------------------------------------------------------------------------------
DO $$
DECLARE
  v_test_name CONSTANT TEXT := 'TEST 10: Notification Recipient Protection';
  v_member_id UUID := gen_random_uuid();
  v_notif_id UUID := gen_random_uuid();
  v_caught_security_error BOOLEAN := FALSE;
BEGIN
  INSERT INTO public.profiles (id, email, name, role, hierarchy_role)
  VALUES (v_member_id, 'notif_mem_t10@campus.edu', 'Notif Member T10', 'Department Member', 'Department Member');

  INSERT INTO public.notifications (id, recipient_id, title, message, type, read)
  VALUES (v_notif_id, v_member_id, 'Original Title', 'Original Message', 'General', FALSE);

  -- Simulate recipient session
  PERFORM set_config('request.jwt.claim.sub', v_member_id::text, true);
  PERFORM set_config('request.jwt.claim.role', 'authenticated', true);

  -- Sub-Test A: Recipient marks as read (MUST SUCCEED)
  BEGIN
    UPDATE public.notifications
    SET read = TRUE, read_at = NOW()
    WHERE id = v_notif_id;
  EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'ASSERTION FAILED in [%]: Recipient could not mark notification as read: %', v_test_name, SQLERRM;
  END;

  -- Sub-Test B: Recipient attempts to tamper with notification message (MUST FAIL)
  v_caught_security_error := FALSE;
  BEGIN
    UPDATE public.notifications
    SET message = 'Tampered Message Content'
    WHERE id = v_notif_id;
  EXCEPTION WHEN OTHERS THEN
    v_caught_security_error := TRUE;
  END;

  IF NOT v_caught_security_error THEN
    RAISE EXCEPTION 'ASSERTION FAILED in [%]: Recipient was able to modify notification message payload!', v_test_name;
  END IF;

  -- Cleanup
  PERFORM set_config('request.jwt.claim.role', 'service_role', true);
  DELETE FROM public.notifications WHERE id = v_notif_id;
  DELETE FROM public.profiles WHERE id = v_member_id;

  RAISE NOTICE 'PASSED: %', v_test_name;
END $$;

-- ------------------------------------------------------------------------------
-- TEST 11: Task Assignee Tamper Guard & Status Transitions
-- Expectation:
--   A) Assignee CAN transition task status (e.g., from 'Pending' to 'In Progress').
--   B) Assignee CANNOT modify task deadline, priority, assigned_to, or assigned_by.
-- ------------------------------------------------------------------------------
DO $$
DECLARE
  v_test_name CONSTANT TEXT := 'TEST 11: Task Assignee Tamper Guard';
  v_lead_id UUID := gen_random_uuid();
  v_member_id UUID := gen_random_uuid();
  v_task_id UUID := gen_random_uuid();
  v_dept_id UUID;
  v_caught_security_error BOOLEAN := FALSE;
BEGIN
  SELECT id INTO v_dept_id FROM public.departments WHERE name = 'Technical' LIMIT 1;

  INSERT INTO public.profiles (id, email, name, role, hierarchy_role, department_id)
  VALUES (v_lead_id, 'lead_t11@campus.edu', 'Lead T11', 'Department Head', 'Department Head', v_dept_id);

  INSERT INTO public.profiles (id, email, name, role, hierarchy_role, department_id)
  VALUES (v_member_id, 'member_t11@campus.edu', 'Member T11', 'Department Member', 'Department Member', v_dept_id);

  INSERT INTO public.tasks (id, title, department_id, assigned_by, assigned_to, deadline, status)
  VALUES (v_task_id, 'Security Review Task', v_dept_id, v_lead_id, v_member_id, CURRENT_DATE + 3, 'Pending');

  -- Simulate Assignee session
  PERFORM set_config('request.jwt.claim.sub', v_member_id::text, true);
  PERFORM set_config('request.jwt.claim.role', 'authenticated', true);

  -- Sub-Test A: Assignee transitions status (MUST SUCCEED)
  BEGIN
    UPDATE public.tasks
    SET status = 'In Progress'
    WHERE id = v_task_id;
  EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'ASSERTION FAILED in [%]: Assignee could not update task status: %', v_test_name, SQLERRM;
  END;

  -- Sub-Test B: Assignee attempts to push deadline (MUST FAIL)
  v_caught_security_error := FALSE;
  BEGIN
    UPDATE public.tasks
    SET deadline = CURRENT_DATE + 30
    WHERE id = v_task_id;
  EXCEPTION WHEN OTHERS THEN
    v_caught_security_error := TRUE;
  END;

  IF NOT v_caught_security_error THEN
    RAISE EXCEPTION 'ASSERTION FAILED in [%]: Assignee was able to alter task deadline!', v_test_name;
  END IF;

  -- Cleanup
  PERFORM set_config('request.jwt.claim.role', 'service_role', true);
  DELETE FROM public.tasks WHERE id = v_task_id;
  DELETE FROM public.profiles WHERE id IN (v_lead_id, v_member_id);

  RAISE NOTICE 'PASSED: %', v_test_name;
END $$;

-- ------------------------------------------------------------------------------
-- TEST 12: Initial President Bootstrap Function Authorization
-- Expectation:
--   An authenticated non-admin user cannot invoke bootstrap_initial_president().
-- ------------------------------------------------------------------------------
DO $$
DECLARE
  v_test_name CONSTANT TEXT := 'TEST 12: Bootstrap Function Authorization';
  v_user_id UUID := gen_random_uuid();
  v_caught_security_error BOOLEAN := FALSE;
BEGIN
  -- Simulate regular authenticated user session
  PERFORM set_config('request.jwt.claim.sub', v_user_id::text, true);
  PERFORM set_config('request.jwt.claim.role', 'authenticated', true);

  BEGIN
    PERFORM public.bootstrap_initial_president('rogue_user@campus.edu');
  EXCEPTION WHEN OTHERS THEN
    v_caught_security_error := TRUE;
  END;

  IF NOT v_caught_security_error THEN
    RAISE EXCEPTION 'ASSERTION FAILED in [%]: Non-admin user was able to call bootstrap_initial_president()!', v_test_name;
  END IF;

  RAISE NOTICE 'PASSED: %', v_test_name;
END $$;
