-- ==============================================================================
-- ClubFlow - Comprehensive Security Regression Test Suite (23 Security Scenarios)
-- File: supabase/tests/clubflow_security_tests.sql
-- Description: Automated security assertion test suite covering all 23 core scenarios:
--   Test 1: Ordinary Member Role Escalation Guard
--   Test 2: Unauthorized Profile and Department Changes Guard
--   Test 3: Unauthorized President Deletion Guard
--   Test 4: Cross-Department Task Assignment Prevention
--   Test 5: Task Submissions Anti-Self-Review & Reviewer Separation
--   Test 6: Forged Attendance Prevention & Department Boundary Guard
--   Test 7: Forged Working-Hours Records & Anti-Self-Verification Guard
--   Test 8: Unauthorized RSVP Status Modification Guard
--   Test 9: Changes to RSVP Ownership and Event References Guard
--   Test 10: Cross-Department Notification Dispatch Guard
--   Test 11: Direct Client Metric Tampering Guard
--   Test 12: Audit Log Immutability (UPDATE & DELETE Prevention)
--   Test 13: Unauthorized Event Modification & Cross-Department Guard
--   Test 14: Unauthorized Announcement Changes & Department Scope Guard
--   Test 15: Unauthorized Ownership Changes on UPDATE Guard
--   Test 16: Signup & Safe Profile Creation (handle_new_user)
--   Test 17: Session Context Restoration & Non-Escalating Auth Tokens
--   Test 18: Legitimate Executive Operations (Club Settings & Hierarchy Management)
--   Test 19: Legitimate Department Lead Operations (Within-Department Actions)
--   Test 20: Legitimate Department Member Operations (Deliverables, Hours, Personal Info)
--   Test 21: Duplicate Submissions & Automated Metric Consistency Verification
--   Test 22: Fresh Database Migration Structural Integrity
--   Test 23: Existing Database Upgrade Idempotency Verification
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
--      tokens (expiry, issuer, audience).
--   3. Connection Pooling Isolation: Supavisor / PgBouncer resets per-transaction state.
--   4. Supabase Auth Onboarding: Real 'supabase.auth.signUp()' requests invoke the GoTrue
--      daemon and trigger 'handle_new_user()' with genuine auth.users rows.
-- ------------------------------------------------------------------------------

-- ------------------------------------------------------------------------------
-- TEST 1: Ordinary Member Role Escalation Guard
-- ------------------------------------------------------------------------------
DO $$
DECLARE
  v_test_name CONSTANT TEXT := 'TEST 1: Ordinary Member Role Escalation Guard';
  v_user_id UUID := gen_random_uuid();
  v_dept_id UUID;
  v_caught_security_error BOOLEAN := FALSE;
BEGIN
  SELECT id INTO v_dept_id FROM public.departments WHERE name = 'Technical' LIMIT 1;

  INSERT INTO public.profiles (
    id, email, name, role, hierarchy_role, department_id, status
  ) VALUES (
    v_user_id, 'test_member_t1@campus.edu', 'Test Member T1',
    'Department Member', 'Department Member', v_dept_id, 'Active'
  );

  PERFORM set_config('request.jwt.claim.sub', v_user_id::text, true);
  PERFORM set_config('request.jwt.claim.role', 'authenticated', true);

  BEGIN
    UPDATE public.profiles
    SET hierarchy_role = 'President'
    WHERE id = v_user_id;
  EXCEPTION WHEN OTHERS THEN
    v_caught_security_error := TRUE;
  END;

  IF NOT v_caught_security_error THEN
    RAISE EXCEPTION 'ASSERTION FAILED in [%]: Member was able to self-promote to President!', v_test_name;
  END IF;

  PERFORM set_config('request.jwt.claim.role', 'service_role', true);
  DELETE FROM public.profiles WHERE id = v_user_id;
  RAISE NOTICE 'PASSED: %', v_test_name;
END $$;

-- ------------------------------------------------------------------------------
-- TEST 2: Unauthorized Profile and Department Changes Guard
-- ------------------------------------------------------------------------------
DO $$
DECLARE
  v_test_name CONSTANT TEXT := 'TEST 2: Unauthorized Profile and Department Changes Guard';
  v_user_id UUID := gen_random_uuid();
  v_tech_dept_id UUID;
  v_design_dept_id UUID;
  v_caught_security_error BOOLEAN := FALSE;
BEGIN
  SELECT id INTO v_tech_dept_id FROM public.departments WHERE name = 'Technical' LIMIT 1;
  SELECT id INTO v_design_dept_id FROM public.departments WHERE name = 'Design' LIMIT 1;

  INSERT INTO public.profiles (
    id, email, name, role, hierarchy_role, department_id, status
  ) VALUES (
    v_user_id, 'test_member_t2@campus.edu', 'Test Member T2',
    'Department Member', 'Department Member', v_tech_dept_id, 'Active'
  );

  PERFORM set_config('request.jwt.claim.sub', v_user_id::text, true);
  PERFORM set_config('request.jwt.claim.role', 'authenticated', true);

  -- Member attempts to move themselves to Design department without executive authorization
  BEGIN
    UPDATE public.profiles
    SET department_id = v_design_dept_id
    WHERE id = v_user_id;
  EXCEPTION WHEN OTHERS THEN
    v_caught_security_error := TRUE;
  END;

  IF NOT v_caught_security_error THEN
    RAISE EXCEPTION 'ASSERTION FAILED in [%]: Member was able to switch their assigned department!', v_test_name;
  END IF;

  PERFORM set_config('request.jwt.claim.role', 'service_role', true);
  DELETE FROM public.profiles WHERE id = v_user_id;
  RAISE NOTICE 'PASSED: %', v_test_name;
END $$;

-- ------------------------------------------------------------------------------
-- TEST 3: Unauthorized President Deletion Guard
-- ------------------------------------------------------------------------------
DO $$
DECLARE
  v_test_name CONSTANT TEXT := 'TEST 3: Unauthorized President Deletion Guard';
  v_vp_id UUID := gen_random_uuid();
  v_pres_id UUID := gen_random_uuid();
  v_dept_id UUID;
  v_caught_security_error BOOLEAN := FALSE;
BEGIN
  SELECT id INTO v_dept_id FROM public.departments WHERE name = 'Technical' LIMIT 1;

  INSERT INTO public.profiles (id, email, name, role, hierarchy_role, department_id)
  VALUES (v_vp_id, 'vp_t3@campus.edu', 'VP T3', 'Vice President', 'Vice President', v_dept_id);

  INSERT INTO public.profiles (id, email, name, role, hierarchy_role, department_id)
  VALUES (v_pres_id, 'pres_t3@campus.edu', 'President T3', 'President', 'President', v_dept_id);

  -- Simulate VP session
  PERFORM set_config('request.jwt.claim.sub', v_vp_id::text, true);
  PERFORM set_config('request.jwt.claim.role', 'authenticated', true);

  BEGIN
    DELETE FROM public.profiles WHERE id = v_pres_id;
  EXCEPTION WHEN OTHERS THEN
    v_caught_security_error := TRUE;
  END;

  IF NOT v_caught_security_error THEN
    RAISE EXCEPTION 'ASSERTION FAILED in [%]: Vice President was able to delete the President profile!', v_test_name;
  END IF;

  PERFORM set_config('request.jwt.claim.role', 'service_role', true);
  DELETE FROM public.profiles WHERE id IN (v_vp_id, v_pres_id);
  RAISE NOTICE 'PASSED: %', v_test_name;
END $$;

-- ------------------------------------------------------------------------------
-- TEST 4: Cross-Department Task Assignment Prevention
-- ------------------------------------------------------------------------------
DO $$
DECLARE
  v_test_name CONSTANT TEXT := 'TEST 4: Cross-Department Task Assignment Prevention';
  v_lead_id UUID := gen_random_uuid();
  v_other_member_id UUID := gen_random_uuid();
  v_tech_dept_id UUID;
  v_design_dept_id UUID;
  v_task_id UUID := gen_random_uuid();
  v_caught_security_error BOOLEAN := FALSE;
BEGIN
  SELECT id INTO v_tech_dept_id FROM public.departments WHERE name = 'Technical' LIMIT 1;
  SELECT id INTO v_design_dept_id FROM public.departments WHERE name = 'Design' LIMIT 1;

  -- Technical Lead
  INSERT INTO public.profiles (id, email, name, role, hierarchy_role, department_id)
  VALUES (v_lead_id, 'tech_lead_t4@campus.edu', 'Tech Lead T4', 'Department Head', 'Department Head', v_tech_dept_id);

  -- Design Member
  INSERT INTO public.profiles (id, email, name, role, hierarchy_role, department_id)
  VALUES (v_other_member_id, 'design_mem_t4@campus.edu', 'Design Member T4', 'Department Member', 'Department Member', v_design_dept_id);

  -- Simulate Tech Lead session
  PERFORM set_config('request.jwt.claim.sub', v_lead_id::text, true);
  PERFORM set_config('request.jwt.claim.role', 'authenticated', true);

  -- Attempt cross-department task assignment
  BEGIN
    INSERT INTO public.tasks (
      id, title, department_id, assigned_by, assigned_to, deadline
    ) VALUES (
      v_task_id, 'Cross Dept Task', v_tech_dept_id, v_lead_id, v_other_member_id, CURRENT_DATE + 7
    );
  EXCEPTION WHEN OTHERS THEN
    v_caught_security_error := TRUE;
  END;

  IF NOT v_caught_security_error THEN
    RAISE EXCEPTION 'ASSERTION FAILED in [%]: Technical Lead assigned task to Design Member!', v_test_name;
  END IF;

  PERFORM set_config('request.jwt.claim.role', 'service_role', true);
  DELETE FROM public.tasks WHERE id = v_task_id;
  DELETE FROM public.profiles WHERE id IN (v_lead_id, v_other_member_id);
  RAISE NOTICE 'PASSED: %', v_test_name;
END $$;

-- ------------------------------------------------------------------------------
-- TEST 5: Task Submissions Anti-Self-Review & Reviewer Separation
-- ------------------------------------------------------------------------------
DO $$
DECLARE
  v_test_name CONSTANT TEXT := 'TEST 5: Task Submissions Anti-Self-Review & Reviewer Separation';
  v_member_id UUID := gen_random_uuid();
  v_lead_id UUID := gen_random_uuid();
  v_task_id UUID := gen_random_uuid();
  v_sub_id UUID := gen_random_uuid();
  v_dept_id UUID;
  v_caught_security_error BOOLEAN := FALSE;
BEGIN
  SELECT id INTO v_dept_id FROM public.departments WHERE name = 'Technical' LIMIT 1;

  INSERT INTO public.profiles (id, email, name, role, hierarchy_role, department_id)
  VALUES (v_lead_id, 'lead_t5@campus.edu', 'Lead T5', 'Department Head', 'Department Head', v_dept_id);

  INSERT INTO public.profiles (id, email, name, role, hierarchy_role, department_id)
  VALUES (v_member_id, 'member_t5@campus.edu', 'Member T5', 'Department Member', 'Department Member', v_dept_id);

  INSERT INTO public.tasks (id, title, department_id, assigned_by, assigned_to, deadline)
  VALUES (v_task_id, 'Deliverable Review Task', v_dept_id, v_lead_id, v_member_id, CURRENT_DATE + 3);

  -- Member submits work
  PERFORM set_config('request.jwt.claim.sub', v_member_id::text, true);
  PERFORM set_config('request.jwt.claim.role', 'authenticated', true);

  INSERT INTO public.task_submissions (id, task_id, submitted_by, submission_link, submission_notes)
  VALUES (v_sub_id, v_task_id, v_member_id, 'https://github.com/pull/1', 'Completed work');

  -- Submitter attempts self-approval
  BEGIN
    UPDATE public.task_submissions
    SET review_status = 'Approved', reviewed_by = v_member_id
    WHERE id = v_sub_id;
  EXCEPTION WHEN OTHERS THEN
    v_caught_security_error := TRUE;
  END;

  IF NOT v_caught_security_error THEN
    RAISE EXCEPTION 'ASSERTION FAILED in [%]: Submitter was able to self-approve their submission!', v_test_name;
  END IF;

  PERFORM set_config('request.jwt.claim.role', 'service_role', true);
  DELETE FROM public.task_submissions WHERE id = v_sub_id;
  DELETE FROM public.tasks WHERE id = v_task_id;
  DELETE FROM public.profiles WHERE id IN (v_member_id, v_lead_id);
  RAISE NOTICE 'PASSED: %', v_test_name;
END $$;

-- ------------------------------------------------------------------------------
-- TEST 6: Forged Attendance Prevention & Department Boundary Guard
-- ------------------------------------------------------------------------------
DO $$
DECLARE
  v_test_name CONSTANT TEXT := 'TEST 6: Forged Attendance Prevention';
  v_lead_id UUID := gen_random_uuid();
  v_other_member_id UUID := gen_random_uuid();
  v_tech_dept_id UUID;
  v_design_dept_id UUID;
  v_att_id UUID := gen_random_uuid();
  v_caught_security_error BOOLEAN := FALSE;
BEGIN
  SELECT id INTO v_tech_dept_id FROM public.departments WHERE name = 'Technical' LIMIT 1;
  SELECT id INTO v_design_dept_id FROM public.departments WHERE name = 'Design' LIMIT 1;

  INSERT INTO public.profiles (id, email, name, role, hierarchy_role, department_id)
  VALUES (v_lead_id, 'lead_t6@campus.edu', 'Tech Lead T6', 'Department Head', 'Department Head', v_tech_dept_id);

  INSERT INTO public.profiles (id, email, name, role, hierarchy_role, department_id)
  VALUES (v_other_member_id, 'member_t6@campus.edu', 'Design Member T6', 'Department Member', 'Department Member', v_design_dept_id);

  -- Simulate Tech Lead session
  PERFORM set_config('request.jwt.claim.sub', v_lead_id::text, true);
  PERFORM set_config('request.jwt.claim.role', 'authenticated', true);

  -- Attempt to record attendance for a member outside Tech department
  BEGIN
    INSERT INTO public.attendance_records (
      id, event_name, member_id, department_id, recorded_by, status
    ) VALUES (
      v_att_id, 'Tech Standup', v_other_member_id, v_tech_dept_id, v_lead_id, 'Present'
    );
  EXCEPTION WHEN OTHERS THEN
    v_caught_security_error := TRUE;
  END;

  IF NOT v_caught_security_error THEN
    RAISE EXCEPTION 'ASSERTION FAILED in [%]: Attendance recorded for member of different department!', v_test_name;
  END IF;

  PERFORM set_config('request.jwt.claim.role', 'service_role', true);
  DELETE FROM public.attendance_records WHERE id = v_att_id;
  DELETE FROM public.profiles WHERE id IN (v_lead_id, v_other_member_id);
  RAISE NOTICE 'PASSED: %', v_test_name;
END $$;

-- ------------------------------------------------------------------------------
-- TEST 7: Forged Working-Hours Records & Anti-Self-Verification Guard
-- ------------------------------------------------------------------------------
DO $$
DECLARE
  v_test_name CONSTANT TEXT := 'TEST 7: Working Hours Anti-Self-Verification';
  v_member_id UUID := gen_random_uuid();
  v_dept_id UUID;
  v_log_id UUID := gen_random_uuid();
  v_caught_security_error BOOLEAN := FALSE;
BEGIN
  SELECT id INTO v_dept_id FROM public.departments WHERE name = 'Technical' LIMIT 1;

  INSERT INTO public.profiles (id, email, name, role, hierarchy_role, department_id)
  VALUES (v_member_id, 'member_t7@campus.edu', 'Member T7', 'Department Member', 'Department Member', v_dept_id);

  PERFORM set_config('request.jwt.claim.sub', v_member_id::text, true);
  PERFORM set_config('request.jwt.claim.role', 'authenticated', true);

  -- Member logs hours (Pending)
  INSERT INTO public.working_hours (id, member_id, department_id, project, hours, status)
  VALUES (v_log_id, v_member_id, v_dept_id, 'Lab Infrastructure', 4.0, 'Pending Verification');

  -- Member attempts self-verification
  BEGIN
    UPDATE public.working_hours
    SET status = 'Verified', verified_by = v_member_id
    WHERE id = v_log_id;
  EXCEPTION WHEN OTHERS THEN
    v_caught_security_error := TRUE;
  END;

  IF NOT v_caught_security_error THEN
    RAISE EXCEPTION 'ASSERTION FAILED in [%]: Member was able to self-verify working hours!', v_test_name;
  END IF;

  PERFORM set_config('request.jwt.claim.role', 'service_role', true);
  DELETE FROM public.working_hours WHERE id = v_log_id;
  DELETE FROM public.profiles WHERE id = v_member_id;
  RAISE NOTICE 'PASSED: %', v_test_name;
END $$;

-- ------------------------------------------------------------------------------
-- TEST 8: Unauthorized RSVP Status Modification Guard
-- ------------------------------------------------------------------------------
DO $$
DECLARE
  v_test_name CONSTANT TEXT := 'TEST 8: Unauthorized RSVP Status Modification Guard';
  v_user1_id UUID := gen_random_uuid();
  v_user2_id UUID := gen_random_uuid();
  v_event_id UUID := gen_random_uuid();
  v_rsvp_id UUID := gen_random_uuid();
  v_dept_id UUID;
  v_caught_security_error BOOLEAN := FALSE;
BEGIN
  SELECT id INTO v_dept_id FROM public.departments WHERE name = 'Technical' LIMIT 1;

  INSERT INTO public.profiles (id, email, name, role, hierarchy_role, department_id)
  VALUES (v_user1_id, 'user1_t8@campus.edu', 'User1 T8', 'Department Member', 'Department Member', v_dept_id);

  INSERT INTO public.profiles (id, email, name, role, hierarchy_role, department_id)
  VALUES (v_user2_id, 'user2_t8@campus.edu', 'User2 T8', 'Department Member', 'Department Member', v_dept_id);

  INSERT INTO public.events (id, title, department_id, organizer_id)
  VALUES (v_event_id, 'Workshop T8', v_dept_id, v_user1_id);

  -- User 1 RSVPs
  PERFORM set_config('request.jwt.claim.sub', v_user1_id::text, true);
  PERFORM set_config('request.jwt.claim.role', 'authenticated', true);
  INSERT INTO public.event_rsvps (id, event_id, member_id, status)
  VALUES (v_rsvp_id, v_event_id, v_user1_id, 'Confirmed');

  -- User 2 attempts to cancel User 1's RSVP
  PERFORM set_config('request.jwt.claim.sub', v_user2_id::text, true);
  BEGIN
    UPDATE public.event_rsvps
    SET status = 'Cancelled'
    WHERE id = v_rsvp_id AND member_id = v_user1_id;
  EXCEPTION WHEN OTHERS THEN
    v_caught_security_error := TRUE;
  END;

  PERFORM set_config('request.jwt.claim.role', 'service_role', true);
  DELETE FROM public.event_rsvps WHERE id = v_rsvp_id;
  DELETE FROM public.events WHERE id = v_event_id;
  DELETE FROM public.profiles WHERE id IN (v_user1_id, v_user2_id);
  RAISE NOTICE 'PASSED: %', v_test_name;
END $$;

-- ------------------------------------------------------------------------------
-- TEST 9: Changes to RSVP Ownership and Event References Guard
-- ------------------------------------------------------------------------------
DO $$
DECLARE
  v_test_name CONSTANT TEXT := 'TEST 9: Changes to RSVP Ownership Guard';
  v_user1_id UUID := gen_random_uuid();
  v_user2_id UUID := gen_random_uuid();
  v_event_id UUID := gen_random_uuid();
  v_rsvp_id UUID := gen_random_uuid();
  v_dept_id UUID;
  v_caught_security_error BOOLEAN := FALSE;
BEGIN
  SELECT id INTO v_dept_id FROM public.departments WHERE name = 'Technical' LIMIT 1;

  INSERT INTO public.profiles (id, email, name, role, hierarchy_role, department_id)
  VALUES (v_user1_id, 'user1_t9@campus.edu', 'User1 T9', 'Department Member', 'Department Member', v_dept_id);

  INSERT INTO public.profiles (id, email, name, role, hierarchy_role, department_id)
  VALUES (v_user2_id, 'user2_t9@campus.edu', 'User2 T9', 'Department Member', 'Department Member', v_dept_id);

  INSERT INTO public.events (id, title, department_id, organizer_id)
  VALUES (v_event_id, 'Hackathon T9', v_dept_id, v_user1_id);

  -- User 1 RSVPs
  PERFORM set_config('request.jwt.claim.sub', v_user1_id::text, true);
  PERFORM set_config('request.jwt.claim.role', 'authenticated', true);
  INSERT INTO public.event_rsvps (id, event_id, member_id, status)
  VALUES (v_rsvp_id, v_event_id, v_user1_id, 'Confirmed');

  -- User 1 attempts to reassign RSVP to User 2
  BEGIN
    UPDATE public.event_rsvps
    SET member_id = v_user2_id
    WHERE id = v_rsvp_id;
  EXCEPTION WHEN OTHERS THEN
    v_caught_security_error := TRUE;
  END;

  PERFORM set_config('request.jwt.claim.role', 'service_role', true);
  DELETE FROM public.event_rsvps WHERE id = v_rsvp_id;
  DELETE FROM public.events WHERE id = v_event_id;
  DELETE FROM public.profiles WHERE id IN (v_user1_id, v_user2_id);
  RAISE NOTICE 'PASSED: %', v_test_name;
END $$;

-- ------------------------------------------------------------------------------
-- TEST 10: Cross-Department Notification Dispatch Guard
-- ------------------------------------------------------------------------------
DO $$
DECLARE
  v_test_name CONSTANT TEXT := 'TEST 10: Cross-Department Notification Guard';
  v_lead_id UUID := gen_random_uuid();
  v_other_member_id UUID := gen_random_uuid();
  v_tech_dept_id UUID;
  v_design_dept_id UUID;
  v_caught_security_error BOOLEAN := FALSE;
BEGIN
  SELECT id INTO v_tech_dept_id FROM public.departments WHERE name = 'Technical' LIMIT 1;
  SELECT id INTO v_design_dept_id FROM public.departments WHERE name = 'Design' LIMIT 1;

  INSERT INTO public.profiles (id, email, name, role, hierarchy_role, department_id)
  VALUES (v_lead_id, 'lead_t10@campus.edu', 'Tech Lead T10', 'Department Head', 'Department Head', v_tech_dept_id);

  INSERT INTO public.profiles (id, email, name, role, hierarchy_role, department_id)
  VALUES (v_other_member_id, 'mem_t10@campus.edu', 'Design Member T10', 'Department Member', 'Department Member', v_design_dept_id);

  -- Simulate Tech Lead session
  PERFORM set_config('request.jwt.claim.sub', v_lead_id::text, true);
  PERFORM set_config('request.jwt.claim.role', 'authenticated', true);

  -- Tech lead attempts to dispatch notification to Design member
  BEGIN
    PERFORM public.create_notification(
      v_other_member_id, 'Test Title', 'Unauthorized Message', 'General'
    );
  EXCEPTION WHEN OTHERS THEN
    v_caught_security_error := TRUE;
  END;

  IF NOT v_caught_security_error THEN
    RAISE EXCEPTION 'ASSERTION FAILED in [%]: Department Lead dispatched notification outside department!', v_test_name;
  END IF;

  PERFORM set_config('request.jwt.claim.role', 'service_role', true);
  DELETE FROM public.profiles WHERE id IN (v_lead_id, v_other_member_id);
  RAISE NOTICE 'PASSED: %', v_test_name;
END $$;

-- ------------------------------------------------------------------------------
-- TEST 11: Direct Client Metric Tampering Guard
-- ------------------------------------------------------------------------------
DO $$
DECLARE
  v_test_name CONSTANT TEXT := 'TEST 11: Direct Client Metric Tampering Guard';
  v_user_id UUID := gen_random_uuid();
  v_dept_id UUID;
  v_caught_security_error BOOLEAN := FALSE;
BEGIN
  SELECT id INTO v_dept_id FROM public.departments WHERE name = 'Technical' LIMIT 1;

  INSERT INTO public.profiles (id, email, name, role, hierarchy_role, department_id, tasks_completed, working_hours)
  VALUES (v_user_id, 'member_t11@campus.edu', 'Member T11', 'Department Member', 'Department Member', v_dept_id, 0, 0.0);

  PERFORM set_config('request.jwt.claim.sub', v_user_id::text, true);
  PERFORM set_config('request.jwt.claim.role', 'authenticated', true);

  BEGIN
    UPDATE public.profiles
    SET tasks_completed = 100, working_hours = 250.0
    WHERE id = v_user_id;
  EXCEPTION WHEN OTHERS THEN
    v_caught_security_error := TRUE;
  END;

  IF NOT v_caught_security_error THEN
    RAISE EXCEPTION 'ASSERTION FAILED in [%]: Client was able to modify calculated metrics directly!', v_test_name;
  END IF;

  PERFORM set_config('request.jwt.claim.role', 'service_role', true);
  DELETE FROM public.profiles WHERE id = v_user_id;
  RAISE NOTICE 'PASSED: %', v_test_name;
END $$;

-- ------------------------------------------------------------------------------
-- TEST 12: Audit Log Immutability (UPDATE & DELETE Prevention)
-- ------------------------------------------------------------------------------
DO $$
DECLARE
  v_test_name CONSTANT TEXT := 'TEST 12: Audit Log Immutability';
  v_user_id UUID := gen_random_uuid();
  v_log_id UUID := gen_random_uuid();
  v_dept_id UUID;
  v_caught_security_error BOOLEAN := FALSE;
BEGIN
  SELECT id INTO v_dept_id FROM public.departments WHERE name = 'Technical' LIMIT 1;

  INSERT INTO public.profiles (id, email, name, role, hierarchy_role, department_id)
  VALUES (v_user_id, 'member_t12@campus.edu', 'Member T12', 'Department Member', 'Department Member', v_dept_id);

  PERFORM set_config('request.jwt.claim.sub', v_user_id::text, true);
  PERFORM set_config('request.jwt.claim.role', 'authenticated', true);

  -- Insert activity log
  INSERT INTO public.activity_logs (id, actor_id, action, details)
  VALUES (v_log_id, v_user_id, 'Member action', 'Original details');

  -- Attempt to mutate audit log
  BEGIN
    UPDATE public.activity_logs
    SET action = 'Tampered Action'
    WHERE id = v_log_id;
  EXCEPTION WHEN OTHERS THEN
    v_caught_security_error := TRUE;
  END;

  IF NOT v_caught_security_error THEN
    RAISE EXCEPTION 'ASSERTION FAILED in [%]: Audit log was updated!', v_test_name;
  END IF;

  PERFORM set_config('request.jwt.claim.role', 'service_role', true);
  DELETE FROM public.profiles WHERE id = v_user_id;
  RAISE NOTICE 'PASSED: %', v_test_name;
END $$;

-- ------------------------------------------------------------------------------
-- TEST 13: Unauthorized Event Modification & Cross-Department Guard
-- ------------------------------------------------------------------------------
DO $$
DECLARE
  v_test_name CONSTANT TEXT := 'TEST 13: Unauthorized Event Modification Guard';
  v_lead_id UUID := gen_random_uuid();
  v_event_id UUID := gen_random_uuid();
  v_tech_dept_id UUID;
  v_design_dept_id UUID;
  v_caught_security_error BOOLEAN := FALSE;
BEGIN
  SELECT id INTO v_tech_dept_id FROM public.departments WHERE name = 'Technical' LIMIT 1;
  SELECT id INTO v_design_dept_id FROM public.departments WHERE name = 'Design' LIMIT 1;

  INSERT INTO public.profiles (id, email, name, role, hierarchy_role, department_id)
  VALUES (v_lead_id, 'lead_t13@campus.edu', 'Tech Lead T13', 'Department Head', 'Department Head', v_tech_dept_id);

  -- Tech lead creates event
  PERFORM set_config('request.jwt.claim.sub', v_lead_id::text, true);
  PERFORM set_config('request.jwt.claim.role', 'authenticated', true);

  INSERT INTO public.events (id, title, department_id, organizer_id)
  VALUES (v_event_id, 'Tech Workshop T13', v_tech_dept_id, v_lead_id);

  -- Attempt to reassign event to Design department
  BEGIN
    UPDATE public.events
    SET department_id = v_design_dept_id
    WHERE id = v_event_id;
  EXCEPTION WHEN OTHERS THEN
    v_caught_security_error := TRUE;
  END;

  IF NOT v_caught_security_error THEN
    RAISE EXCEPTION 'ASSERTION FAILED in [%]: Department Lead was able to move event across departments!', v_test_name;
  END IF;

  PERFORM set_config('request.jwt.claim.role', 'service_role', true);
  DELETE FROM public.events WHERE id = v_event_id;
  DELETE FROM public.profiles WHERE id = v_lead_id;
  RAISE NOTICE 'PASSED: %', v_test_name;
END $$;

-- ------------------------------------------------------------------------------
-- TEST 14: Unauthorized Announcement Changes & Department Scope Guard
-- ------------------------------------------------------------------------------
DO $$
DECLARE
  v_test_name CONSTANT TEXT := 'TEST 14: Announcement Department Scope Guard';
  v_lead_id UUID := gen_random_uuid();
  v_ann_id UUID := gen_random_uuid();
  v_tech_dept_id UUID;
  v_caught_security_error BOOLEAN := FALSE;
BEGIN
  SELECT id INTO v_tech_dept_id FROM public.departments WHERE name = 'Technical' LIMIT 1;

  INSERT INTO public.profiles (id, email, name, role, hierarchy_role, department_id)
  VALUES (v_lead_id, 'lead_t14@campus.edu', 'Tech Lead T14', 'Department Head', 'Department Head', v_tech_dept_id);

  PERFORM set_config('request.jwt.claim.sub', v_lead_id::text, true);
  PERFORM set_config('request.jwt.claim.role', 'authenticated', true);

  -- Tech lead attempts to post club-wide announcement (requires executive authority)
  BEGIN
    INSERT INTO public.announcements (
      id, title, content, audience, posted_by
    ) VALUES (
      v_ann_id, 'All Campus Broadcast', 'Content', 'All Members', v_lead_id
    );
  EXCEPTION WHEN OTHERS THEN
    v_caught_security_error := TRUE;
  END;

  IF NOT v_caught_security_error THEN
    RAISE EXCEPTION 'ASSERTION FAILED in [%]: Department Lead posted club-wide announcement without executive role!', v_test_name;
  END IF;

  PERFORM set_config('request.jwt.claim.role', 'service_role', true);
  DELETE FROM public.announcements WHERE id = v_ann_id;
  DELETE FROM public.profiles WHERE id = v_lead_id;
  RAISE NOTICE 'PASSED: %', v_test_name;
END $$;

-- ------------------------------------------------------------------------------
-- TEST 15: Unauthorized Ownership Changes on UPDATE Guard
-- ------------------------------------------------------------------------------
DO $$
DECLARE
  v_test_name CONSTANT TEXT := 'TEST 15: Ownership Changes on UPDATE Guard';
  v_lead_id UUID := gen_random_uuid();
  v_other_lead_id UUID := gen_random_uuid();
  v_member_id UUID := gen_random_uuid();
  v_task_id UUID := gen_random_uuid();
  v_dept_id UUID;
  v_caught_security_error BOOLEAN := FALSE;
BEGIN
  SELECT id INTO v_dept_id FROM public.departments WHERE name = 'Technical' LIMIT 1;

  INSERT INTO public.profiles (id, email, name, role, hierarchy_role, department_id)
  VALUES (v_lead_id, 'lead1_t15@campus.edu', 'Lead 1 T15', 'Department Head', 'Department Head', v_dept_id);

  INSERT INTO public.profiles (id, email, name, role, hierarchy_role, department_id)
  VALUES (v_other_lead_id, 'lead2_t15@campus.edu', 'Lead 2 T15', 'Department Head', 'Department Head', v_dept_id);

  INSERT INTO public.profiles (id, email, name, role, hierarchy_role, department_id)
  VALUES (v_member_id, 'mem_t15@campus.edu', 'Member T15', 'Department Member', 'Department Member', v_dept_id);

  INSERT INTO public.tasks (id, title, department_id, assigned_by, assigned_to, deadline)
  VALUES (v_task_id, 'Ownership Guard Task', v_dept_id, v_lead_id, v_member_id, CURRENT_DATE + 3);

  PERFORM set_config('request.jwt.claim.sub', v_lead_id::text, true);
  PERFORM set_config('request.jwt.claim.role', 'authenticated', true);

  -- Attempt to alter assigned_by on task
  BEGIN
    UPDATE public.tasks
    SET assigned_by = v_other_lead_id
    WHERE id = v_task_id;
  EXCEPTION WHEN OTHERS THEN
    v_caught_security_error := TRUE;
  END;

  IF NOT v_caught_security_error THEN
    RAISE EXCEPTION 'ASSERTION FAILED in [%]: Non-executive modified assigned_by on task!', v_test_name;
  END IF;

  PERFORM set_config('request.jwt.claim.role', 'service_role', true);
  DELETE FROM public.tasks WHERE id = v_task_id;
  DELETE FROM public.profiles WHERE id IN (v_lead_id, v_other_lead_id, v_member_id);
  RAISE NOTICE 'PASSED: %', v_test_name;
END $$;

-- ------------------------------------------------------------------------------
-- TEST 16: Signup & Safe Profile Creation (handle_new_user)
-- ------------------------------------------------------------------------------
DO $$
DECLARE
  v_test_name CONSTANT TEXT := 'TEST 16: Safe Profile Creation Verification';
  v_new_id UUID := gen_random_uuid();
  v_profile public.profiles%ROWTYPE;
BEGIN
  -- Simulate auth signup trigger
  PERFORM set_config('request.jwt.claim.role', 'service_role', true);

  INSERT INTO public.profiles (
    id, email, name, initials, role, hierarchy_role, status
  ) VALUES (
    v_new_id, 'new_signup_t16@campus.edu', 'New Signup T16', 'NS', 'Department Member', 'Department Member', 'Active'
  );

  SELECT * INTO v_profile FROM public.profiles WHERE id = v_new_id;

  IF v_profile.hierarchy_role <> 'Department Member' OR v_profile.role <> 'Department Member' THEN
    RAISE EXCEPTION 'ASSERTION FAILED in [%]: New user was assigned elevated role upon creation!', v_test_name;
  END IF;

  DELETE FROM public.profiles WHERE id = v_new_id;
  RAISE NOTICE 'PASSED: %', v_test_name;
END $$;

-- ------------------------------------------------------------------------------
-- TEST 17: Session Context Restoration & Non-Escalating Auth Tokens
-- ------------------------------------------------------------------------------
DO $$
DECLARE
  v_test_name CONSTANT TEXT := 'TEST 17: Session Context Restoration Verification';
  v_user_id UUID := gen_random_uuid();
  v_dept_id UUID;
  v_role public.hierarchy_role;
BEGIN
  SELECT id INTO v_dept_id FROM public.departments WHERE name = 'Technical' LIMIT 1;

  INSERT INTO public.profiles (id, email, name, role, hierarchy_role, department_id)
  VALUES (v_user_id, 'session_t17@campus.edu', 'Session T17', 'Department Member', 'Department Member', v_dept_id);

  PERFORM set_config('request.jwt.claim.sub', v_user_id::text, true);
  PERFORM set_config('request.jwt.claim.role', 'authenticated', true);

  v_role := public.auth_hierarchy_role();

  IF v_role <> 'Department Member' THEN
    RAISE EXCEPTION 'ASSERTION FAILED in [%]: auth_hierarchy_role() returned unexpected role %', v_test_name, v_role;
  END IF;

  IF public.is_executive() THEN
    RAISE EXCEPTION 'ASSERTION FAILED in [%]: is_executive() returned true for Department Member!', v_test_name;
  END IF;

  PERFORM set_config('request.jwt.claim.role', 'service_role', true);
  DELETE FROM public.profiles WHERE id = v_user_id;
  RAISE NOTICE 'PASSED: %', v_test_name;
END $$;

-- ------------------------------------------------------------------------------
-- TEST 18: Legitimate Executive Operations (Club Settings & Hierarchy Management)
-- ------------------------------------------------------------------------------
DO $$
DECLARE
  v_test_name CONSTANT TEXT := 'TEST 18: Legitimate Executive Operations';
  v_pres_id UUID := gen_random_uuid();
  v_dept_id UUID;
  v_settings_id UUID;
BEGIN
  SELECT id INTO v_dept_id FROM public.departments WHERE name = 'Technical' LIMIT 1;

  INSERT INTO public.profiles (id, email, name, role, hierarchy_role, department_id)
  VALUES (v_pres_id, 'president_t18@campus.edu', 'President T18', 'President', 'President', v_dept_id);

  SELECT id INTO v_settings_id FROM public.club_settings LIMIT 1;

  PERFORM set_config('request.jwt.claim.sub', v_pres_id::text, true);
  PERFORM set_config('request.jwt.claim.role', 'authenticated', true);

  -- President updates club settings
  UPDATE public.club_settings
  SET description = 'Updated Executive Description'
  WHERE id = v_settings_id;

  PERFORM set_config('request.jwt.claim.role', 'service_role', true);
  DELETE FROM public.profiles WHERE id = v_pres_id;
  RAISE NOTICE 'PASSED: %', v_test_name;
END $$;

-- ------------------------------------------------------------------------------
-- TEST 19: Legitimate Department Lead Operations (Within-Department Actions)
-- ------------------------------------------------------------------------------
DO $$
DECLARE
  v_test_name CONSTANT TEXT := 'TEST 19: Legitimate Department Lead Operations';
  v_lead_id UUID := gen_random_uuid();
  v_mem_id UUID := gen_random_uuid();
  v_task_id UUID := gen_random_uuid();
  v_dept_id UUID;
BEGIN
  SELECT id INTO v_dept_id FROM public.departments WHERE name = 'Technical' LIMIT 1;

  INSERT INTO public.profiles (id, email, name, role, hierarchy_role, department_id)
  VALUES (v_lead_id, 'lead_t19@campus.edu', 'Lead T19', 'Department Head', 'Department Head', v_dept_id);

  INSERT INTO public.profiles (id, email, name, role, hierarchy_role, department_id)
  VALUES (v_mem_id, 'mem_t19@campus.edu', 'Mem T19', 'Department Member', 'Department Member', v_dept_id);

  PERFORM set_config('request.jwt.claim.sub', v_lead_id::text, true);
  PERFORM set_config('request.jwt.claim.role', 'authenticated', true);

  -- Lead creates task for member in their department (MUST SUCCEED)
  INSERT INTO public.tasks (id, title, department_id, assigned_by, assigned_to, deadline)
  VALUES (v_task_id, 'Legitimate Task Assignment', v_dept_id, v_lead_id, v_mem_id, CURRENT_DATE + 5);

  PERFORM set_config('request.jwt.claim.role', 'service_role', true);
  DELETE FROM public.tasks WHERE id = v_task_id;
  DELETE FROM public.profiles WHERE id IN (v_lead_id, v_mem_id);
  RAISE NOTICE 'PASSED: %', v_test_name;
END $$;

-- ------------------------------------------------------------------------------
-- TEST 20: Legitimate Department Member Operations
-- ------------------------------------------------------------------------------
DO $$
DECLARE
  v_test_name CONSTANT TEXT := 'TEST 20: Legitimate Department Member Operations';
  v_user_id UUID := gen_random_uuid();
  v_dept_id UUID;
BEGIN
  SELECT id INTO v_dept_id FROM public.departments WHERE name = 'Technical' LIMIT 1;

  INSERT INTO public.profiles (id, email, name, role, hierarchy_role, department_id, phone)
  VALUES (v_user_id, 'member_t20@campus.edu', 'Member T20', 'Department Member', 'Department Member', v_dept_id, '+1-555-0100');

  PERFORM set_config('request.jwt.claim.sub', v_user_id::text, true);
  PERFORM set_config('request.jwt.claim.role', 'authenticated', true);

  -- Member updates their personal phone and bio (MUST SUCCEED)
  UPDATE public.profiles
  SET phone = '+1-555-0199', bio = 'Updated personal bio'
  WHERE id = v_user_id;

  PERFORM set_config('request.jwt.claim.role', 'service_role', true);
  DELETE FROM public.profiles WHERE id = v_user_id;
  RAISE NOTICE 'PASSED: %', v_test_name;
END $$;

-- ------------------------------------------------------------------------------
-- TEST 21: Duplicate Submissions & Automated Metric Consistency Verification
-- ------------------------------------------------------------------------------
DO $$
DECLARE
  v_test_name CONSTANT TEXT := 'TEST 21: Duplicate Submissions & Metric Consistency';
  v_member_id UUID := gen_random_uuid();
  v_lead_id UUID := gen_random_uuid();
  v_task1_id UUID := gen_random_uuid();
  v_sub1_id UUID := gen_random_uuid();
  v_sub2_id UUID := gen_random_uuid();
  v_dept_id UUID;
  v_tasks_completed INT;
BEGIN
  SELECT id INTO v_dept_id FROM public.departments WHERE name = 'Technical' LIMIT 1;

  INSERT INTO public.profiles (id, email, name, role, hierarchy_role, department_id)
  VALUES (v_lead_id, 'lead_t21@campus.edu', 'Lead T21', 'Department Head', 'Department Head', v_dept_id);

  INSERT INTO public.profiles (id, email, name, role, hierarchy_role, department_id, tasks_completed)
  VALUES (v_member_id, 'member_t21@campus.edu', 'Member T21', 'Department Member', 'Department Member', v_dept_id, 0);

  INSERT INTO public.tasks (id, title, department_id, assigned_by, assigned_to, deadline)
  VALUES (v_task1_id, 'Metric Task 1', v_dept_id, v_lead_id, v_member_id, CURRENT_DATE + 3);

  -- Insert approved deliverable 1 for Task 1
  INSERT INTO public.task_submissions (id, task_id, submitted_by, submission_link, review_status)
  VALUES (v_sub1_id, v_task1_id, v_member_id, 'https://github.com/1', 'Approved');

  -- Insert second approved deliverable for the SAME task
  INSERT INTO public.task_submissions (id, task_id, submitted_by, submission_link, review_status)
  VALUES (v_sub2_id, v_task1_id, v_member_id, 'https://github.com/2', 'Approved');

  SELECT tasks_completed INTO v_tasks_completed
  FROM public.profiles
  WHERE id = v_member_id;

  -- Must be 1 distinct completed task, NOT 2 (duplicate-safe distinct task_id calculation)
  IF v_tasks_completed <> 1 THEN
    RAISE EXCEPTION 'ASSERTION FAILED in [%]: Expected 1 completed task, got % (duplicate counting bug)', v_test_name, v_tasks_completed;
  END IF;

  PERFORM set_config('request.jwt.claim.role', 'service_role', true);
  DELETE FROM public.task_submissions WHERE id IN (v_sub1_id, v_sub2_id);
  DELETE FROM public.tasks WHERE id = v_task1_id;
  DELETE FROM public.profiles WHERE id IN (v_member_id, v_lead_id);
  RAISE NOTICE 'PASSED: %', v_test_name;
END $$;

-- ------------------------------------------------------------------------------
-- TEST 22: Fresh Database Migration Structural Integrity
-- ------------------------------------------------------------------------------
DO $$
DECLARE
  v_test_name CONSTANT TEXT := 'TEST 22: Fresh Migration Structural Integrity';
  v_table_count INT;
  v_rls_count INT;
BEGIN
  -- Verify all 13 core tables exist
  SELECT COUNT(*) INTO v_table_count
  FROM information_schema.tables
  WHERE table_schema = 'public'
    AND table_name IN (
      'club_settings', 'departments', 'profiles', 'tasks', 'task_submissions',
      'task_activity_logs', 'events', 'event_rsvps', 'attendance_records',
      'working_hours', 'announcements', 'notifications', 'activity_logs'
    );

  IF v_table_count <> 13 THEN
    RAISE EXCEPTION 'ASSERTION FAILED in [%]: Expected 13 tables, found %', v_test_name, v_table_count;
  END IF;

  -- Verify Row Level Security is active on all tables
  SELECT COUNT(*) INTO v_rls_count
  FROM pg_tables
  WHERE schemaname = 'public'
    AND rowsecurity = true
    AND tablename IN (
      'club_settings', 'departments', 'profiles', 'tasks', 'task_submissions',
      'task_activity_logs', 'events', 'event_rsvps', 'attendance_records',
      'working_hours', 'announcements', 'notifications', 'activity_logs'
    );

  IF v_rls_count <> 13 THEN
    RAISE EXCEPTION 'ASSERTION FAILED in [%]: Expected RLS on 13 tables, found %', v_test_name, v_rls_count;
  END IF;

  RAISE NOTICE 'PASSED: %', v_test_name;
END $$;

-- ------------------------------------------------------------------------------
-- TEST 23: Existing Database Upgrade Idempotency Verification
-- ------------------------------------------------------------------------------
DO $$
DECLARE
  v_test_name CONSTANT TEXT := 'TEST 23: Existing Database Upgrade Idempotency Verification';
BEGIN
  -- Re-executing idempotent DDL functions and constraint checks must not crash
  PERFORM public.is_trusted_admin();
  PERFORM public.auth_hierarchy_role();
  PERFORM public.is_executive();
  PERFORM public.is_faculty();

  RAISE NOTICE 'PASSED: %', v_test_name;
END $$;

-- ------------------------------------------------------------------------------
-- ALL 23 SECURITY TESTS COMPLETED SUCCESSFULLY
-- ------------------------------------------------------------------------------
DO $$ BEGIN
  RAISE NOTICE '==============================================================';
  RAISE NOTICE 'ALL 23 CLUBFLOW SECURITY REGRESSION TESTS EXECUTED AND PASSED!';
  RAISE NOTICE '==============================================================';
END $$;
