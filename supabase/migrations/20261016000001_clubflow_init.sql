-- ==============================================================================
-- ClubFlow - Comprehensive Supabase Database Migration (Security Hardened)
-- Version: 20261016000001_clubflow_init.sql
-- Description: Core schema, enums, tables, foreign keys, security triggers,
--              hardened SECURITY DEFINER helper functions, and Row Level Security
--              (RLS) policies enforcing the 8-tier hierarchy and department isolation.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. EXTENSIONS
-- ------------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ------------------------------------------------------------------------------
-- 2. ENUMS & DOMAINS
-- ------------------------------------------------------------------------------
-- 8-Tier Hierarchy Roles defined by the governance matrix
DO $$ BEGIN
  CREATE TYPE hierarchy_role AS ENUM (
    'Faculty Advisor',      -- Tier 1: Institutional Governance & Read-Only Oversight
    'President',            -- Tier 2: Executive Leadership & Club Administration
    'Vice President',       -- Tier 3: Cross-Functional Operations & Executive Lead
    'Head',                 -- Tier 4: Operations Leadership & Milestone Coordination
    'Co-Head',              -- Tier 5: Operations Logistics & Execution Support
    'Department Head',      -- Tier 6: Department Deliverables & Mentorship
    'Department Co-Head',   -- Tier 7: Department Technical Execution
    'Department Member'     -- Tier 8: Project Execution & General Member
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE member_status AS ENUM (
    'Active',
    'Core Lead',
    'On Leave',
    'Probation',
    'Inactive'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE task_status AS ENUM (
    'Pending',
    'In Progress',
    'Submitted',
    'Approved',
    'Rejected',
    'Completed',
    'Overdue'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE task_priority AS ENUM ('Low', 'Medium', 'High', 'Urgent');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE event_status AS ENUM ('Upcoming', 'Ongoing', 'Completed', 'Cancelled');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE attendance_status AS ENUM ('Present', 'Absent', 'Late', 'Excused');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE working_hour_status AS ENUM ('Verified', 'Pending Verification');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE announcement_priority AS ENUM ('Normal', 'Important', 'Urgent');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE announcement_audience AS ENUM ('All Members', 'Specific Department');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ------------------------------------------------------------------------------
-- 3. TABLES DEFINITION (Ordered to satisfy Foreign Key constraints)
-- ------------------------------------------------------------------------------

-- 3.1. Club Settings (Organizational Singleton)
CREATE TABLE IF NOT EXISTS public.club_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL DEFAULT 'ClubFlow Campus Hub',
  description TEXT DEFAULT 'Centralized platform for managing student organization operations, tasks, events, and rosters.',
  academic_year TEXT NOT NULL DEFAULT '2026-2027',
  contact_email TEXT NOT NULL DEFAULT 'contact@clubflow.edu',
  logo_url TEXT,
  brand_tag TEXT DEFAULT 'CF',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3.2. Departments (Functional Committees)
CREATE TABLE IF NOT EXISTS public.departments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT UNIQUE NOT NULL,
  short_desc TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  tools TEXT[] NOT NULL DEFAULT '{}',
  color_theme TEXT NOT NULL DEFAULT 'indigo',
  lead_id UUID,
  co_lead_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3.3. Profiles (User dossier linked 1:1 with auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  initials TEXT NOT NULL DEFAULT 'CM',
  avatar_url TEXT,
  role TEXT NOT NULL DEFAULT 'Department Member',
  hierarchy_role hierarchy_role NOT NULL DEFAULT 'Department Member',
  department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
  student_id TEXT,
  year TEXT DEFAULT 'Sophomore · Year 2',
  bio TEXT,
  status member_status NOT NULL DEFAULT 'Active',
  attendance_rate NUMERIC(5,2) NOT NULL DEFAULT 100.00 CHECK (attendance_rate >= 0 AND attendance_rate <= 100),
  tasks_completed INT NOT NULL DEFAULT 0 CHECK (tasks_completed >= 0),
  working_hours NUMERIC(6,2) NOT NULL DEFAULT 0.00 CHECK (working_hours >= 0),
  join_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add deferred Foreign Key constraints from departments to profiles
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_departments_lead'
  ) THEN
    ALTER TABLE public.departments
      ADD CONSTRAINT fk_departments_lead
      FOREIGN KEY (lead_id) REFERENCES public.profiles(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_departments_co_lead'
  ) THEN
    ALTER TABLE public.departments
      ADD CONSTRAINT fk_departments_co_lead
      FOREIGN KEY (co_lead_id) REFERENCES public.profiles(id) ON DELETE SET NULL;
  END IF;
END $$;

-- 3.4. Tasks
CREATE TABLE IF NOT EXISTS public.tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  department_id UUID NOT NULL REFERENCES public.departments(id) ON DELETE RESTRICT,
  assigned_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  assigned_to UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  deadline DATE NOT NULL,
  priority task_priority NOT NULL DEFAULT 'Medium',
  status task_status NOT NULL DEFAULT 'Pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3.5. Task Submissions
CREATE TABLE IF NOT EXISTS public.task_submissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id UUID UNIQUE NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  submitted_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  submission_link TEXT,
  submission_notes TEXT,
  review_status TEXT CHECK (review_status IN ('Pending', 'Approved', 'Rejected')),
  reviewed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  review_comment TEXT,
  reviewed_at TIMESTAMPTZ
);

-- 3.6. Task Activity Logs (History Timeline)
CREATE TABLE IF NOT EXISTS public.task_activity_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  actor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  action TEXT NOT NULL,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3.7. Events
CREATE TABLE IF NOT EXISTS public.events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  event_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  venue TEXT NOT NULL,
  organizer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  department_id UUID NOT NULL REFERENCES public.departments(id) ON DELETE RESTRICT,
  status event_status NOT NULL DEFAULT 'Upcoming',
  capacity INT NOT NULL DEFAULT 100 CHECK (capacity > 0),
  tags TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3.8. Event RSVPs (Many-to-Many between Events and Members)
CREATE TABLE IF NOT EXISTS public.event_rsvps (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (event_id, member_id)
);

-- 3.9. Attendance Records
CREATE TABLE IF NOT EXISTS public.attendance_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID REFERENCES public.events(id) ON DELETE SET NULL,
  event_name TEXT NOT NULL,
  record_date DATE NOT NULL DEFAULT CURRENT_DATE,
  member_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  department_id UUID NOT NULL REFERENCES public.departments(id) ON DELETE RESTRICT,
  check_in_time TEXT NOT NULL DEFAULT '—',
  status attendance_status NOT NULL DEFAULT 'Present',
  recorded_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  session_type TEXT DEFAULT 'General Meeting',
  duration_hours NUMERIC(4,2) CHECK (duration_hours IS NULL OR duration_hours >= 0),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3.10. Working Hours Records
CREATE TABLE IF NOT EXISTS public.working_hours (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  member_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  department_id UUID NOT NULL REFERENCES public.departments(id) ON DELETE RESTRICT,
  project TEXT NOT NULL,
  log_date DATE NOT NULL DEFAULT CURRENT_DATE,
  start_time TEXT,
  end_time TEXT,
  description TEXT NOT NULL DEFAULT '',
  hours NUMERIC(4,2) NOT NULL CHECK (hours > 0),
  verified_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  status working_hour_status NOT NULL DEFAULT 'Pending Verification',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3.11. Announcements
CREATE TABLE IF NOT EXISTS public.announcements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  posted_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  audience announcement_audience NOT NULL DEFAULT 'All Members',
  target_department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
  priority announcement_priority NOT NULL DEFAULT 'Normal',
  pinned BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3.12. Notifications (User Scoped)
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  recipient_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL, -- 'task', 'event', 'announcement', 'attendance', 'hours'
  link_tab TEXT,
  item_id UUID,
  read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3.13. General Activity Audit Logs (Live Activity Feed)
CREATE TABLE IF NOT EXISTS public.activity_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  actor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  action TEXT NOT NULL,
  related_item TEXT NOT NULL,
  category TEXT NOT NULL, -- 'task', 'event', 'attendance', 'hours'
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 4. UTILITY FUNCTIONS & TIMESTAMP TRIGGERS
-- ------------------------------------------------------------------------------

-- Generic updated_at timestamp trigger function
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Attach updated_at triggers
DROP TRIGGER IF EXISTS tr_club_settings_updated_at ON public.club_settings;
CREATE TRIGGER tr_club_settings_updated_at
  BEFORE UPDATE ON public.club_settings
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS tr_departments_updated_at ON public.departments;
CREATE TRIGGER tr_departments_updated_at
  BEFORE UPDATE ON public.departments
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS tr_profiles_updated_at ON public.profiles;
CREATE TRIGGER tr_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS tr_tasks_updated_at ON public.tasks;
CREATE TRIGGER tr_tasks_updated_at
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS tr_events_updated_at ON public.events;
CREATE TRIGGER tr_events_updated_at
  BEFORE UPDATE ON public.events
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS tr_attendance_updated_at ON public.attendance_records;
CREATE TRIGGER tr_attendance_updated_at
  BEFORE UPDATE ON public.attendance_records
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS tr_working_hours_updated_at ON public.working_hours;
CREATE TRIGGER tr_working_hours_updated_at
  BEFORE UPDATE ON public.working_hours
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS tr_announcements_updated_at ON public.announcements;
CREATE TRIGGER tr_announcements_updated_at
  BEFORE UPDATE ON public.announcements
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ------------------------------------------------------------------------------
-- 5. RLS HELPER FUNCTIONS (HARDENED SECURITY DEFINER)
-- ------------------------------------------------------------------------------
-- All helper functions explicitly set search_path = public, pg_temp to prevent
-- search_path hijacking vulnerabilities and schema search poisoning.

-- 5.1. Retrieve hierarchy role of authenticated user
CREATE OR REPLACE FUNCTION public.auth_hierarchy_role()
RETURNS public.hierarchy_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT hierarchy_role FROM public.profiles WHERE id = auth.uid();
$$;

-- 5.2. Check if authenticated user belongs to executive leadership (Tiers 2-5)
CREATE OR REPLACE FUNCTION public.is_executive()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT COALESCE(
    (SELECT hierarchy_role IN ('President', 'Vice President', 'Head', 'Co-Head')
     FROM public.profiles
     WHERE id = auth.uid()),
    FALSE
  );
$$;

-- 5.3. Check if authenticated user is Faculty Advisor (Tier 1: Read-Only Governance)
CREATE OR REPLACE FUNCTION public.is_faculty()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT COALESCE(
    (SELECT hierarchy_role = 'Faculty Advisor'
     FROM public.profiles
     WHERE id = auth.uid()),
    FALSE
  );
$$;

-- 5.4. Retrieve department_id of authenticated user
CREATE OR REPLACE FUNCTION public.auth_department_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT department_id FROM public.profiles WHERE id = auth.uid();
$$;

-- 5.5. Check if authenticated user is Head or Co-Head of a specific department
CREATE OR REPLACE FUNCTION public.is_department_lead(target_dept_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT COALESCE(
    (SELECT (hierarchy_role IN ('Department Head', 'Department Co-Head')) AND (department_id = target_dept_id)
     FROM public.profiles
     WHERE id = auth.uid()),
    FALSE
  );
$$;

-- Restrict function execution privileges
REVOKE ALL ON FUNCTION public.auth_hierarchy_role() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.auth_hierarchy_role() TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.is_executive() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_executive() TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.is_faculty() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_faculty() TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.auth_department_id() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.auth_department_id() TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.is_department_lead(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_department_lead(UUID) TO authenticated, service_role;

-- ------------------------------------------------------------------------------
-- 6. SECURITY TRIGGERS: TAMPER RESISTANCE & PRIVILEGE ENFORCEMENT
-- ------------------------------------------------------------------------------

-- 6.1. Comprehensive Profile Tamper & Privilege Escalation Guard
-- Prevents users from changing their own hierarchy_role, role, department_id,
-- status, student_id, attendance_rate, tasks_completed, working_hours, join_date, or email.
-- Only authorized executives can update member administrative fields, and no one can self-promote.
CREATE OR REPLACE FUNCTION public.validate_profile_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_caller_role public.hierarchy_role;
  v_is_exec BOOLEAN;
BEGIN
  -- Allow service_role, postgres superuser, and background migrations (where auth.uid() IS NULL)
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  -- Rule 1: No user (including President or Executives) can alter their OWN hierarchy_role
  IF OLD.id = auth.uid() AND (OLD.hierarchy_role IS DISTINCT FROM NEW.hierarchy_role) THEN
    RAISE EXCEPTION 'Security Policy Violation: You cannot modify your own hierarchy role.';
  END IF;

  v_caller_role := public.auth_hierarchy_role();
  v_is_exec := (v_caller_role IN ('President', 'Vice President', 'Head', 'Co-Head'));

  -- Rule 2: Member updating their OWN profile
  IF OLD.id = auth.uid() THEN
    -- If caller is NOT executive, strictly restrict modification of administrative fields
    IF NOT v_is_exec THEN
      IF OLD.hierarchy_role IS DISTINCT FROM NEW.hierarchy_role OR
         OLD.role IS DISTINCT FROM NEW.role OR
         OLD.department_id IS DISTINCT FROM NEW.department_id OR
         OLD.status IS DISTINCT FROM NEW.status OR
         OLD.student_id IS DISTINCT FROM NEW.student_id OR
         OLD.attendance_rate IS DISTINCT FROM NEW.attendance_rate OR
         OLD.tasks_completed IS DISTINCT FROM NEW.tasks_completed OR
         OLD.working_hours IS DISTINCT FROM NEW.working_hours OR
         OLD.join_date IS DISTINCT FROM NEW.join_date OR
         OLD.email IS DISTINCT FROM NEW.email THEN
        RAISE EXCEPTION 'Security Policy Violation: Members may only modify personal profile fields (name, initials, avatar_url, bio, year).';
      END IF;
    ELSE
      -- Executive updating their own record cannot manually manipulate metrics or email
      IF OLD.email IS DISTINCT FROM NEW.email OR
         OLD.attendance_rate IS DISTINCT FROM NEW.attendance_rate OR
         OLD.tasks_completed IS DISTINCT FROM NEW.tasks_completed OR
         OLD.working_hours IS DISTINCT FROM NEW.working_hours THEN
        RAISE EXCEPTION 'Security Policy Violation: Direct modification of calculated metrics or email is restricted.';
      END IF;
    END IF;

  -- Rule 3: Updating ANOTHER member's profile
  ELSE
    IF NOT v_is_exec THEN
      RAISE EXCEPTION 'Security Policy Violation: Only executive leadership may modify other members profiles.';
    END IF;

    -- Only the current President can appoint or alter another President
    IF NEW.hierarchy_role = 'President' AND v_caller_role <> 'President' THEN
      RAISE EXCEPTION 'Security Policy Violation: Only the President can appoint a President.';
    END IF;

    IF OLD.hierarchy_role = 'President' AND v_caller_role <> 'President' THEN
      RAISE EXCEPTION 'Security Policy Violation: Only the President can modify President profile records.';
    END IF;

    -- Email is bound to auth.users and cannot be updated via profile table
    IF OLD.email IS DISTINCT FROM NEW.email THEN
      RAISE EXCEPTION 'Security Policy Violation: Profile email must match the linked authentication account.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_prevent_self_role_escalation ON public.profiles;
DROP TRIGGER IF EXISTS tr_validate_profile_update ON public.profiles;
CREATE TRIGGER tr_validate_profile_update
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_profile_update();

-- 6.2. Task Submission Guard
-- Prevents submitters from altering review statuses or spoofing submitter identity.
-- Prevents reviewers from altering student submission links or content.
CREATE OR REPLACE FUNCTION public.validate_task_submission()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_is_reviewer BOOLEAN;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  -- INSERT validation
  IF TG_OP = 'INSERT' THEN
    -- Ensure submitted_by matches authenticated user
    IF NEW.submitted_by <> auth.uid() THEN
      RAISE EXCEPTION 'Security Policy Violation: Submissions can only be submitted by the authenticated user.';
    END IF;

    -- Force initial review state to Pending; members cannot self-approve on creation
    IF NOT public.is_executive() THEN
      NEW.review_status := 'Pending';
      NEW.reviewed_by := NULL;
      NEW.reviewed_at := NULL;
      NEW.review_comment := NULL;
    END IF;

    NEW.submitted_at := NOW();
    RETURN NEW;
  END IF;

  -- UPDATE validation
  IF TG_OP = 'UPDATE' THEN
    -- task_id and submitted_by are strictly immutable
    IF NEW.task_id <> OLD.task_id OR NEW.submitted_by <> OLD.submitted_by THEN
      RAISE EXCEPTION 'Security Policy Violation: task_id and submitted_by cannot be changed.';
    END IF;

    -- Determine if caller is an authorized reviewer (Executive or Department Lead of the task)
    SELECT (
      public.is_executive() OR
      EXISTS (
        SELECT 1 FROM public.tasks t
        WHERE t.id = OLD.task_id AND (
          t.assigned_by = auth.uid() OR
          (t.department_id = public.auth_department_id() AND public.auth_hierarchy_role() IN ('Department Head', 'Department Co-Head'))
        )
      )
    ) INTO v_is_reviewer;

    -- Submitter editing their own submission
    IF OLD.submitted_by = auth.uid() AND NOT v_is_reviewer THEN
      -- Submitter CANNOT alter review outcome fields
      IF NEW.review_status IS DISTINCT FROM OLD.review_status OR
         NEW.reviewed_by IS DISTINCT FROM OLD.reviewed_by OR
         NEW.review_comment IS DISTINCT FROM OLD.review_comment OR
         NEW.reviewed_at IS DISTINCT FROM OLD.reviewed_at THEN
        RAISE EXCEPTION 'Security Policy Violation: Submitters cannot modify review outcome or approval fields.';
      END IF;

      -- If already Approved, submitter cannot tamper with submission link without rejection/reopening
      IF OLD.review_status = 'Approved' AND (
        NEW.submission_link IS DISTINCT FROM OLD.submission_link OR
        NEW.submission_notes IS DISTINCT FROM OLD.submission_notes
      ) THEN
        RAISE EXCEPTION 'Security Policy Violation: Approved submissions cannot be modified.';
      END IF;
    END IF;

    -- Reviewer updating submission
    IF v_is_reviewer AND auth.uid() <> OLD.submitted_by THEN
      -- Reviewer cannot edit the student's submission link or notes
      IF NEW.submission_link IS DISTINCT FROM OLD.submission_link OR
         NEW.submission_notes IS DISTINCT FROM OLD.submission_notes OR
         NEW.submitted_at IS DISTINCT FROM OLD.submitted_at THEN
        RAISE EXCEPTION 'Security Policy Violation: Reviewers cannot alter submission content or timestamp.';
      END IF;

      -- Automatically attach reviewer identity and timestamp when review status updates
      IF NEW.review_status IS DISTINCT FROM OLD.review_status THEN
        NEW.reviewed_by := auth.uid();
        NEW.reviewed_at := NOW();
      END IF;
    END IF;

    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_validate_task_submission ON public.task_submissions;
CREATE TRIGGER tr_validate_task_submission
  BEFORE INSERT OR UPDATE ON public.task_submissions
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_task_submission();

-- 6.3. Working Hours Verification Guard
-- Prevents members from self-verifying or self-approving working hours.
CREATE OR REPLACE FUNCTION public.validate_working_hours_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  -- Member editing their own logged hours
  IF OLD.member_id = auth.uid() AND NOT public.is_executive() AND NOT (
    public.auth_hierarchy_role() IN ('Department Head', 'Department Co-Head') AND OLD.department_id = public.auth_department_id()
  ) THEN
    -- Must remain in Pending status; cannot self-verify
    IF NEW.status IS DISTINCT FROM OLD.status OR NEW.verified_by IS DISTINCT FROM OLD.verified_by THEN
      RAISE EXCEPTION 'Security Policy Violation: Members cannot verify or approve their own working hours.';
    END IF;

    IF NEW.member_id <> OLD.member_id OR NEW.department_id <> OLD.department_id THEN
      RAISE EXCEPTION 'Security Policy Violation: Member and department assignments cannot be altered.';
    END IF;
  END IF;

  -- If status transitioned to Verified, auto-populate verified_by with caller if null
  IF NEW.status = 'Verified' AND OLD.status = 'Pending Verification' AND NEW.verified_by IS NULL THEN
    NEW.verified_by := auth.uid();
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_validate_working_hours ON public.working_hours;
CREATE TRIGGER tr_validate_working_hours
  BEFORE UPDATE ON public.working_hours
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_working_hours_update();

-- 6.4. Notification Integrity Guard
-- Ensures that members can only update read status of their own notifications,
-- not alter the payload, title, message, or recipient.
CREATE OR REPLACE FUNCTION public.validate_notification_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF auth.uid() IS NOT NULL THEN
    IF NEW.recipient_id <> OLD.recipient_id OR
       NEW.title <> OLD.title OR
       NEW.message <> OLD.message OR
       NEW.type <> OLD.type OR
       NEW.created_at <> OLD.created_at THEN
      RAISE EXCEPTION 'Security Policy Violation: Only the notification read status can be updated.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_validate_notification ON public.notifications;
CREATE TRIGGER tr_validate_notification
  BEFORE UPDATE ON public.notifications
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_notification_update();

-- 6.5. Trusted Server-Side Helper to Create Notifications
-- Allows server-side workflows, triggers, and executive actions to create notifications securely.
CREATE OR REPLACE FUNCTION public.create_notification(
  p_recipient_id UUID,
  p_title TEXT,
  p_message TEXT,
  p_type TEXT,
  p_link_tab TEXT DEFAULT NULL,
  p_item_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_notification_id UUID;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = p_recipient_id) THEN
    RAISE EXCEPTION 'Recipient profile does not exist.';
  END IF;

  INSERT INTO public.notifications (
    recipient_id,
    title,
    message,
    type,
    link_tab,
    item_id,
    read
  ) VALUES (
    p_recipient_id,
    p_title,
    p_message,
    p_type,
    p_link_tab,
    p_item_id,
    FALSE
  )
  RETURNING id INTO v_notification_id;

  RETURN v_notification_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_notification(UUID, TEXT, TEXT, TEXT, TEXT, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_notification(UUID, TEXT, TEXT, TEXT, TEXT, UUID) TO authenticated, service_role;

-- ------------------------------------------------------------------------------
-- 7. AUTOMATED PROFILE PROVISIONING TRIGGER FOR SUPABASE AUTH
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_full_name TEXT;
  v_initials TEXT;
  v_first_dept_id UUID;
BEGIN
  -- Extract user name from OAuth metadata or email prefix
  v_full_name := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'name',
    split_part(NEW.email, '@', 1)
  );

  -- Generate 2-letter uppercase initials
  v_initials := UPPER(SUBSTRING(v_full_name FROM 1 FOR 2));
  IF LENGTH(v_initials) = 0 THEN
    v_initials := 'CM';
  END IF;

  -- Default to 'Technical' department if already seeded
  SELECT id INTO v_first_dept_id FROM public.departments WHERE name = 'Technical' LIMIT 1;

  INSERT INTO public.profiles (
    id,
    email,
    name,
    initials,
    avatar_url,
    role,
    hierarchy_role,
    department_id,
    status,
    attendance_rate,
    tasks_completed,
    working_hours,
    join_date
  ) VALUES (
    NEW.id,
    NEW.email,
    v_full_name,
    v_initials,
    NEW.raw_user_meta_data->>'avatar_url',
    'Department Member',
    'Department Member',
    v_first_dept_id,
    'Active',
    100.00,
    0,
    0.00,
    CURRENT_DATE
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ------------------------------------------------------------------------------
-- 8. ROW LEVEL SECURITY (RLS) POLICIES
-- ------------------------------------------------------------------------------

-- Enable RLS across all 13 application tables
ALTER TABLE public.club_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_rsvps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.working_hours ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- 8.1. Club Settings
DROP POLICY IF EXISTS "club_settings_select_all" ON public.club_settings;
CREATE POLICY "club_settings_select_all"
  ON public.club_settings FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "club_settings_insert_executives" ON public.club_settings;
CREATE POLICY "club_settings_insert_executives"
  ON public.club_settings FOR INSERT
  TO authenticated
  WITH CHECK (public.is_executive());

DROP POLICY IF EXISTS "club_settings_update_executives" ON public.club_settings;
CREATE POLICY "club_settings_update_executives"
  ON public.club_settings FOR UPDATE
  TO authenticated
  USING (public.is_executive())
  WITH CHECK (public.is_executive());

-- 8.2. Departments
DROP POLICY IF EXISTS "departments_select_all" ON public.departments;
CREATE POLICY "departments_select_all"
  ON public.departments FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "departments_insert_executives" ON public.departments;
CREATE POLICY "departments_insert_executives"
  ON public.departments FOR INSERT
  TO authenticated
  WITH CHECK (public.is_executive());

DROP POLICY IF EXISTS "departments_update_executives" ON public.departments;
CREATE POLICY "departments_update_executives"
  ON public.departments FOR UPDATE
  TO authenticated
  USING (
    public.is_executive() OR
    (public.auth_hierarchy_role() IN ('Department Head', 'Department Co-Head') AND id = public.auth_department_id())
  )
  WITH CHECK (
    public.is_executive() OR
    (public.auth_hierarchy_role() IN ('Department Head', 'Department Co-Head') AND id = public.auth_department_id())
  );

DROP POLICY IF EXISTS "departments_delete_executives" ON public.departments;
CREATE POLICY "departments_delete_executives"
  ON public.departments FOR DELETE
  TO authenticated
  USING (public.is_executive());

-- 8.3. Profiles
DROP POLICY IF EXISTS "profiles_select_authenticated" ON public.profiles;
CREATE POLICY "profiles_select_authenticated"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "profiles_insert_executives_or_self" ON public.profiles;
CREATE POLICY "profiles_insert_executives_or_self"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id OR public.is_executive());

DROP POLICY IF EXISTS "profiles_update_policy" ON public.profiles;
CREATE POLICY "profiles_update_policy"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id OR public.is_executive())
  WITH CHECK (auth.uid() = id OR public.is_executive());

DROP POLICY IF EXISTS "profiles_delete_executives" ON public.profiles;
CREATE POLICY "profiles_delete_executives"
  ON public.profiles FOR DELETE
  TO authenticated
  USING (
    public.auth_hierarchy_role() IN ('President', 'Vice President') AND id <> auth.uid()
  );

-- 8.4. Tasks
-- Visible to executives, faculty advisor, department members, or assignees/creators
DROP POLICY IF EXISTS "tasks_select_policy" ON public.tasks;
CREATE POLICY "tasks_select_policy"
  ON public.tasks FOR SELECT
  TO authenticated
  USING (
    public.is_executive() OR
    public.is_faculty() OR
    department_id = public.auth_department_id() OR
    assigned_to = auth.uid() OR
    assigned_by = auth.uid()
  );

-- Executives can assign tasks across departments; Department Leads only within their department
DROP POLICY IF EXISTS "tasks_insert_policy" ON public.tasks;
CREATE POLICY "tasks_insert_policy"
  ON public.tasks FOR INSERT
  TO authenticated
  WITH CHECK (
    assigned_by = auth.uid() AND (
      public.is_executive() OR
      (public.auth_hierarchy_role() IN ('Department Head', 'Department Co-Head') AND department_id = public.auth_department_id())
    )
  );

DROP POLICY IF EXISTS "tasks_update_policy" ON public.tasks;
CREATE POLICY "tasks_update_policy"
  ON public.tasks FOR UPDATE
  TO authenticated
  USING (
    public.is_executive() OR
    (public.auth_hierarchy_role() IN ('Department Head', 'Department Co-Head') AND department_id = public.auth_department_id()) OR
    assigned_to = auth.uid() OR
    assigned_by = auth.uid()
  )
  WITH CHECK (
    public.is_executive() OR
    (public.auth_hierarchy_role() IN ('Department Head', 'Department Co-Head') AND department_id = public.auth_department_id()) OR
    assigned_to = auth.uid() OR
    assigned_by = auth.uid()
  );

DROP POLICY IF EXISTS "tasks_delete_policy" ON public.tasks;
CREATE POLICY "tasks_delete_policy"
  ON public.tasks FOR DELETE
  TO authenticated
  USING (
    public.is_executive() OR
    (public.auth_hierarchy_role() IN ('Department Head', 'Department Co-Head') AND department_id = public.auth_department_id())
  );

-- 8.5. Task Submissions
DROP POLICY IF EXISTS "submissions_select_policy" ON public.task_submissions;
CREATE POLICY "submissions_select_policy"
  ON public.task_submissions FOR SELECT
  TO authenticated
  USING (
    public.is_executive() OR
    public.is_faculty() OR
    submitted_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.tasks t
      WHERE t.id = task_id AND (
        t.department_id = public.auth_department_id() OR
        t.assigned_to = auth.uid() OR
        t.assigned_by = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "submissions_insert_policy" ON public.task_submissions;
CREATE POLICY "submissions_insert_policy"
  ON public.task_submissions FOR INSERT
  TO authenticated
  WITH CHECK (
    submitted_by = auth.uid() AND
    EXISTS (
      SELECT 1 FROM public.tasks t
      WHERE t.id = task_id AND (
        t.assigned_to = auth.uid() OR
        public.is_executive() OR
        (t.department_id = public.auth_department_id() AND public.auth_hierarchy_role() IN ('Department Head', 'Department Co-Head'))
      )
    )
  );

DROP POLICY IF EXISTS "submissions_update_policy" ON public.task_submissions;
CREATE POLICY "submissions_update_policy"
  ON public.task_submissions FOR UPDATE
  TO authenticated
  USING (
    submitted_by = auth.uid() OR
    public.is_executive() OR
    EXISTS (
      SELECT 1 FROM public.tasks t
      WHERE t.id = task_id AND (
        t.assigned_by = auth.uid() OR
        (t.department_id = public.auth_department_id() AND public.auth_hierarchy_role() IN ('Department Head', 'Department Co-Head'))
      )
    )
  )
  WITH CHECK (
    submitted_by = auth.uid() OR
    public.is_executive() OR
    EXISTS (
      SELECT 1 FROM public.tasks t
      WHERE t.id = task_id AND (
        t.assigned_by = auth.uid() OR
        (t.department_id = public.auth_department_id() AND public.auth_hierarchy_role() IN ('Department Head', 'Department Co-Head'))
      )
    )
  );

DROP POLICY IF EXISTS "submissions_delete_policy" ON public.task_submissions;
CREATE POLICY "submissions_delete_policy"
  ON public.task_submissions FOR DELETE
  TO authenticated
  USING (
    public.is_executive() OR
    (submitted_by = auth.uid() AND (review_status IS NULL OR review_status = 'Pending'))
  );

-- 8.6. Task Activity Logs
DROP POLICY IF EXISTS "task_logs_select" ON public.task_activity_logs;
CREATE POLICY "task_logs_select"
  ON public.task_activity_logs FOR SELECT
  TO authenticated
  USING (
    public.is_executive() OR
    public.is_faculty() OR
    actor_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.tasks t
      WHERE t.id = task_id AND (
        t.department_id = public.auth_department_id() OR
        t.assigned_to = auth.uid() OR
        t.assigned_by = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "task_logs_insert" ON public.task_activity_logs;
CREATE POLICY "task_logs_insert"
  ON public.task_activity_logs FOR INSERT
  TO authenticated
  WITH CHECK (actor_id = auth.uid());

-- 8.7. Events
DROP POLICY IF EXISTS "events_select_all" ON public.events;
CREATE POLICY "events_select_all"
  ON public.events FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "events_insert_policy" ON public.events;
CREATE POLICY "events_insert_policy"
  ON public.events FOR INSERT
  TO authenticated
  WITH CHECK (
    organizer_id = auth.uid() AND (
      public.is_executive() OR
      (
        public.auth_hierarchy_role() IN ('Department Head', 'Department Co-Head') AND
        department_id = public.auth_department_id()
      )
    )
  );

DROP POLICY IF EXISTS "events_update_policy" ON public.events;
CREATE POLICY "events_update_policy"
  ON public.events FOR UPDATE
  TO authenticated
  USING (
    public.is_executive() OR
    organizer_id = auth.uid() OR
    (public.auth_hierarchy_role() IN ('Department Head', 'Department Co-Head') AND department_id = public.auth_department_id())
  )
  WITH CHECK (
    public.is_executive() OR
    organizer_id = auth.uid() OR
    (public.auth_hierarchy_role() IN ('Department Head', 'Department Co-Head') AND department_id = public.auth_department_id())
  );

DROP POLICY IF EXISTS "events_delete_policy" ON public.events;
CREATE POLICY "events_delete_policy"
  ON public.events FOR DELETE
  TO authenticated
  USING (
    public.is_executive() OR
    (organizer_id = auth.uid() AND public.auth_hierarchy_role() IN ('Department Head', 'Department Co-Head') AND department_id = public.auth_department_id())
  );

-- 8.8. Event RSVPs
DROP POLICY IF EXISTS "event_rsvps_select_all" ON public.event_rsvps;
CREATE POLICY "event_rsvps_select_all"
  ON public.event_rsvps FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "event_rsvps_insert_self" ON public.event_rsvps;
CREATE POLICY "event_rsvps_insert_self"
  ON public.event_rsvps FOR INSERT
  TO authenticated
  WITH CHECK (member_id = auth.uid() OR public.is_executive());

DROP POLICY IF EXISTS "event_rsvps_delete_self" ON public.event_rsvps;
CREATE POLICY "event_rsvps_delete_self"
  ON public.event_rsvps FOR DELETE
  TO authenticated
  USING (member_id = auth.uid() OR public.is_executive());

-- 8.9. Attendance Records
-- Faculty Advisor has read-only oversight; Dept leads scoped to own department; Executives cross-dept
DROP POLICY IF EXISTS "attendance_select_policy" ON public.attendance_records;
CREATE POLICY "attendance_select_policy"
  ON public.attendance_records FOR SELECT
  TO authenticated
  USING (
    public.is_executive() OR
    public.is_faculty() OR
    member_id = auth.uid() OR
    department_id = public.auth_department_id()
  );

-- Attendance can only be recorded by Executives (any dept) or Department Leads (strictly own dept)
DROP POLICY IF EXISTS "attendance_insert_policy" ON public.attendance_records;
CREATE POLICY "attendance_insert_policy"
  ON public.attendance_records FOR INSERT
  TO authenticated
  WITH CHECK (
    recorded_by = auth.uid() AND (
      public.is_executive() OR
      (
        public.auth_hierarchy_role() IN ('Department Head', 'Department Co-Head') AND
        department_id = public.auth_department_id()
      )
    )
  );

DROP POLICY IF EXISTS "attendance_update_policy" ON public.attendance_records;
CREATE POLICY "attendance_update_policy"
  ON public.attendance_records FOR UPDATE
  TO authenticated
  USING (
    public.is_executive() OR
    (
      public.auth_hierarchy_role() IN ('Department Head', 'Department Co-Head') AND
      department_id = public.auth_department_id()
    )
  )
  WITH CHECK (
    public.is_executive() OR
    (
      public.auth_hierarchy_role() IN ('Department Head', 'Department Co-Head') AND
      department_id = public.auth_department_id()
    )
  );

DROP POLICY IF EXISTS "attendance_delete_policy" ON public.attendance_records;
CREATE POLICY "attendance_delete_policy"
  ON public.attendance_records FOR DELETE
  TO authenticated
  USING (
    public.is_executive() OR
    (
      public.auth_hierarchy_role() IN ('Department Head', 'Department Co-Head') AND
      department_id = public.auth_department_id()
    )
  );

-- 8.10. Working Hours
-- Read: Faculty (oversight), Executives (all), Department Leads (own dept), Member (own logs)
DROP POLICY IF EXISTS "working_hours_select_policy" ON public.working_hours;
CREATE POLICY "working_hours_select_policy"
  ON public.working_hours FOR SELECT
  TO authenticated
  USING (
    public.is_executive() OR
    public.is_faculty() OR
    member_id = auth.uid() OR
    department_id = public.auth_department_id()
  );

-- Insert: Members log their own hours in Pending status; Executives can also log
DROP POLICY IF EXISTS "working_hours_insert_self" ON public.working_hours;
CREATE POLICY "working_hours_insert_self"
  ON public.working_hours FOR INSERT
  TO authenticated
  WITH CHECK (
    member_id = auth.uid() AND
    (
      (status = 'Pending Verification' AND verified_by IS NULL) OR
      public.is_executive()
    )
  );

-- Update: Dept leads can verify own dept; Executives verify all; Member can edit unverified drafts
DROP POLICY IF EXISTS "working_hours_update_policy" ON public.working_hours;
CREATE POLICY "working_hours_update_policy"
  ON public.working_hours FOR UPDATE
  TO authenticated
  USING (
    public.is_executive() OR
    (public.auth_hierarchy_role() IN ('Department Head', 'Department Co-Head') AND department_id = public.auth_department_id()) OR
    (member_id = auth.uid() AND status = 'Pending Verification')
  )
  WITH CHECK (
    public.is_executive() OR
    (public.auth_hierarchy_role() IN ('Department Head', 'Department Co-Head') AND department_id = public.auth_department_id()) OR
    (member_id = auth.uid() AND status = 'Pending Verification')
  );

DROP POLICY IF EXISTS "working_hours_delete_policy" ON public.working_hours;
CREATE POLICY "working_hours_delete_policy"
  ON public.working_hours FOR DELETE
  TO authenticated
  USING (
    public.is_executive() OR
    (member_id = auth.uid() AND status = 'Pending Verification')
  );

-- 8.11. Announcements
-- SELECT: All Members see club-wide; Department announcements visible ONLY to target dept and leadership
DROP POLICY IF EXISTS "announcements_select_policy" ON public.announcements;
CREATE POLICY "announcements_select_policy"
  ON public.announcements FOR SELECT
  TO authenticated
  USING (
    (audience = 'All Members') OR
    (
      audience = 'Specific Department' AND
      target_department_id IS NOT NULL AND
      (
        target_department_id = public.auth_department_id() OR
        public.is_executive() OR
        public.is_faculty()
      )
    )
  );

-- INSERT: Executives can post club-wide or dept; Dept Leads can ONLY post to their own dept
DROP POLICY IF EXISTS "announcements_insert_policy" ON public.announcements;
CREATE POLICY "announcements_insert_policy"
  ON public.announcements FOR INSERT
  TO authenticated
  WITH CHECK (
    posted_by = auth.uid() AND (
      public.is_executive() OR
      (
        public.auth_hierarchy_role() IN ('Department Head', 'Department Co-Head') AND
        audience = 'Specific Department' AND
        target_department_id = public.auth_department_id()
      )
    )
  );

DROP POLICY IF EXISTS "announcements_update_policy" ON public.announcements;
CREATE POLICY "announcements_update_policy"
  ON public.announcements FOR UPDATE
  TO authenticated
  USING (
    public.is_executive() OR
    (
      posted_by = auth.uid() AND
      public.auth_hierarchy_role() IN ('Department Head', 'Department Co-Head') AND
      target_department_id = public.auth_department_id()
    )
  )
  WITH CHECK (
    public.is_executive() OR
    (
      posted_by = auth.uid() AND
      audience = 'Specific Department' AND
      target_department_id = public.auth_department_id() AND
      public.auth_hierarchy_role() IN ('Department Head', 'Department Co-Head')
    )
  );

DROP POLICY IF EXISTS "announcements_delete_policy" ON public.announcements;
CREATE POLICY "announcements_delete_policy"
  ON public.announcements FOR DELETE
  TO authenticated
  USING (
    public.is_executive() OR
    (
      posted_by = auth.uid() AND
      public.auth_hierarchy_role() IN ('Department Head', 'Department Co-Head') AND
      target_department_id = public.auth_department_id()
    )
  );

-- 8.12. Notifications (Hardened: Unrestricted INSERT Removed)
-- Recipient can view only their own notifications
DROP POLICY IF EXISTS "notifications_select_recipient" ON public.notifications;
CREATE POLICY "notifications_select_recipient"
  ON public.notifications FOR SELECT
  TO authenticated
  USING (recipient_id = auth.uid());

-- Recipient can update only read status of their own notifications
DROP POLICY IF EXISTS "notifications_update_recipient" ON public.notifications;
CREATE POLICY "notifications_update_recipient"
  ON public.notifications FOR UPDATE
  TO authenticated
  USING (recipient_id = auth.uid())
  WITH CHECK (recipient_id = auth.uid());

-- Recipient can delete/dismiss their own notifications
DROP POLICY IF EXISTS "notifications_delete_recipient" ON public.notifications;
CREATE POLICY "notifications_delete_recipient"
  ON public.notifications FOR DELETE
  TO authenticated
  USING (recipient_id = auth.uid());

-- Direct INSERT permitted only for Executives; automated system notifications use create_notification()
DROP POLICY IF EXISTS "notifications_insert_all" ON public.notifications;
DROP POLICY IF EXISTS "notifications_insert_executives" ON public.notifications;
CREATE POLICY "notifications_insert_executives"
  ON public.notifications FOR INSERT
  TO authenticated
  WITH CHECK (public.is_executive());

-- 8.13. Audit Activity Logs
DROP POLICY IF EXISTS "activity_logs_select_all" ON public.activity_logs;
CREATE POLICY "activity_logs_select_all"
  ON public.activity_logs FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "activity_logs_insert_authenticated" ON public.activity_logs;
CREATE POLICY "activity_logs_insert_authenticated"
  ON public.activity_logs FOR INSERT
  TO authenticated
  WITH CHECK (actor_id = auth.uid());

-- ==============================================================================
-- 9. INITIAL BASELINE SEED (CONDITIONAL IDEMPOTENT RUN)
-- ==============================================================================
INSERT INTO public.club_settings (name, description, academic_year, contact_email, brand_tag)
SELECT
  'ACM Student Chapter',
  'Centralized platform for managing college clubs, members, departments, tasks, events, and attendance.',
  'Academic Year 2026-27',
  'contact@acmcampus.edu',
  'ACM'
WHERE NOT EXISTS (SELECT 1 FROM public.club_settings);

INSERT INTO public.departments (name, short_desc, description, tools, color_theme)
VALUES
  ('Technical', 'Software engineering, algorithms, and technical workshop execution.', 'Drives engineering development, web portals, hackathons, and technical competitions.', ARRAY['Next.js', 'React', 'Docker', 'GitHub', 'Python'], 'indigo'),
  ('Design', 'UI/UX design, visual identity, branding, and event collateral.', 'Crafts user experiences, design systems, promotional banners, and visual assets.', ARRAY['Figma', 'Illustrator', 'Spline', 'Photoshop'], 'violet'),
  ('Marketing', 'Social media, student outreach, PR, and event sponsorship.', 'Drives digital campaigns, audience growth, partner relations, and campus promotion.', ARRAY['Notion', 'Buffer', 'Canva', 'Meta Suite'], 'pink'),
  ('Event Management', 'Logistics, room reservations, AV coordination, and scheduling.', 'Coordinates campus spaces, stage operations, volunteer check-ins, and timelines.', ARRAY['Google Calendar', 'Airtable', 'Slack'], 'emerald'),
  ('Media', 'Photography, live stream broadcasting, video recap editing.', 'Captures keynotes, workshops, produce recap videos, and manages media archives.', ARRAY['Premiere Pro', 'OBS Studio', 'Sony FX3', 'Lightroom'], 'amber'),
  ('Content', 'Technical blogging, newsletters, documentation, and curriculum authoring.', 'Authors workshop handouts, weekly newsletters, speaker intros, and club reports.', ARRAY['Substack', 'Notion', 'Google Docs', 'Markdown'], 'cyan')
ON CONFLICT (name) DO NOTHING;
