-- ==============================================================================
-- ClubFlow - Comprehensive Supabase Database Migration (Security Hardened v6)
-- File: supabase/migrations/20261016000001_clubflow_init.sql
-- Description: Core schema, enums, tables, foreign keys, triggers, strict RLS,
--              column-level access enforcement, automated metric synchronizations,
--              audit immutability, and security-hardened functions.
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
  CREATE TYPE event_type AS ENUM (
    'Workshop',
    'Hackathon',
    'Speaker Session',
    'Internal Meeting',
    'Social',
    'Competition',
    'General'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE event_status AS ENUM (
    'Upcoming',
    'Ongoing',
    'Completed',
    'Cancelled'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE attendance_status AS ENUM (
    'Present',
    'Absent',
    'Excused',
    'Late'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE working_hours_status AS ENUM (
    'Pending Verification',
    'Verified',
    'Rejected'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE announcement_audience AS ENUM (
    'All Members',
    'Specific Department'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE announcement_priority AS ENUM (
    'Normal',
    'Important',
    'Urgent'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE notification_type AS ENUM (
    'Task Assigned',
    'Task Approved',
    'Task Rejected',
    'Hours Verified',
    'New Announcement',
    'Event Created',
    'General'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ------------------------------------------------------------------------------
-- 3. TABLES DEFINITION & CONSTRAINTS
-- ------------------------------------------------------------------------------

-- 3.1. Club Settings
CREATE TABLE IF NOT EXISTS public.club_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL DEFAULT 'ACM Student Chapter',
  description TEXT NOT NULL DEFAULT 'Student chapter for technical and community leadership.',
  academic_year TEXT NOT NULL DEFAULT 'Academic Year 2026-27',
  contact_email TEXT NOT NULL DEFAULT 'contact@campusclub.edu',
  brand_tag TEXT NOT NULL DEFAULT 'ACM',
  logo_url TEXT,
  banner_url TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3.2. Departments
CREATE TABLE IF NOT EXISTS public.departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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

-- 3.3. Profiles (Synchronized with auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  initials TEXT NOT NULL DEFAULT 'CM',
  avatar_url TEXT,
  role TEXT NOT NULL DEFAULT 'Department Member',
  hierarchy_role public.hierarchy_role NOT NULL DEFAULT 'Department Member',
  department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
  status public.member_status NOT NULL DEFAULT 'Active',
  student_id TEXT,
  phone TEXT,
  year TEXT,
  attendance_rate NUMERIC(5,2) NOT NULL DEFAULT 100.00 CHECK (attendance_rate >= 0 AND attendance_rate <= 100),
  tasks_completed INT NOT NULL DEFAULT 0 CHECK (tasks_completed >= 0),
  working_hours NUMERIC(7,2) NOT NULL DEFAULT 0.00 CHECK (working_hours >= 0),
  join_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT ck_profiles_role_consistency CHECK (role = hierarchy_role::text)
);

CREATE INDEX IF NOT EXISTS idx_profiles_department ON public.profiles(department_id);
CREATE INDEX IF NOT EXISTS idx_profiles_hierarchy ON public.profiles(hierarchy_role);
CREATE INDEX IF NOT EXISTS idx_profiles_status ON public.profiles(status);

-- Circular foreign keys for department leads (safe addition after profiles exists)
DO $$ BEGIN
  ALTER TABLE public.departments
    ADD CONSTRAINT fk_departments_lead FOREIGN KEY (lead_id) REFERENCES public.profiles(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public.departments
    ADD CONSTRAINT fk_departments_co_lead FOREIGN KEY (co_lead_id) REFERENCES public.profiles(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_dept_lead ON public.departments(lead_id);
CREATE INDEX IF NOT EXISTS idx_dept_co_lead ON public.departments(co_lead_id);

-- 3.4. Tasks
CREATE TABLE IF NOT EXISTS public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  department_id UUID NOT NULL REFERENCES public.departments(id) ON DELETE CASCADE,
  assigned_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  assigned_to UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  deadline DATE NOT NULL,
  priority public.task_priority NOT NULL DEFAULT 'Medium',
  status public.task_status NOT NULL DEFAULT 'Pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tasks_dept ON public.tasks(department_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON public.tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_by ON public.tasks(assigned_by);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON public.tasks(status);

-- 3.5. Task Submissions
CREATE TABLE IF NOT EXISTS public.task_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  submitted_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  submission_link TEXT NOT NULL,
  submission_notes TEXT NOT NULL DEFAULT '',
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  review_status TEXT NOT NULL DEFAULT 'Pending' CHECK (review_status IN ('Pending', 'Approved', 'Rejected')),
  reviewed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  review_comment TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_submissions_task ON public.task_submissions(task_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_submissions_task_unique ON public.task_submissions(task_id);
CREATE INDEX IF NOT EXISTS idx_submissions_submitter ON public.task_submissions(submitted_by);
CREATE INDEX IF NOT EXISTS idx_submissions_review_status ON public.task_submissions(review_status);

-- 3.6. Task Activity Logs
CREATE TABLE IF NOT EXISTS public.task_activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  actor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  details TEXT,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_task_act_task ON public.task_activity_logs(task_id);

-- 3.7. Events (Supports both event_date/date, venue/location, start_time/time, and tags)
CREATE TABLE IF NOT EXISTS public.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  event_date DATE NOT NULL DEFAULT CURRENT_DATE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  start_time TEXT NOT NULL DEFAULT '10:00 AM',
  end_time TEXT NOT NULL DEFAULT '12:00 PM',
  time TEXT NOT NULL DEFAULT '10:00 AM - 12:00 PM',
  venue TEXT NOT NULL DEFAULT 'Campus Auditorium',
  location TEXT NOT NULL DEFAULT 'Campus Auditorium',
  type public.event_type NOT NULL DEFAULT 'General',
  status public.event_status NOT NULL DEFAULT 'Upcoming',
  department_id UUID NOT NULL REFERENCES public.departments(id) ON DELETE CASCADE,
  organizer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  capacity INT CHECK (capacity IS NULL OR capacity > 0),
  tags TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_events_dept ON public.events(department_id);
CREATE INDEX IF NOT EXISTS idx_events_organizer ON public.events(organizer_id);
CREATE INDEX IF NOT EXISTS idx_events_date ON public.events(date);
CREATE INDEX IF NOT EXISTS idx_events_event_date ON public.events(event_date);

-- 3.8. Event RSVPs
CREATE TABLE IF NOT EXISTS public.event_rsvps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'Confirmed' CHECK (status IN ('Confirmed', 'Waitlisted', 'Cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (event_id, member_id)
);

CREATE INDEX IF NOT EXISTS idx_rsvps_event ON public.event_rsvps(event_id);
CREATE INDEX IF NOT EXISTS idx_rsvps_member ON public.event_rsvps(member_id);

-- 3.9. Attendance Records
CREATE TABLE IF NOT EXISTS public.attendance_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES public.events(id) ON DELETE SET NULL,
  event_name TEXT NOT NULL,
  event_date DATE NOT NULL DEFAULT CURRENT_DATE,
  member_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  department_id UUID NOT NULL REFERENCES public.departments(id) ON DELETE CASCADE,
  check_in_time TEXT NOT NULL DEFAULT '—',
  status public.attendance_status NOT NULL DEFAULT 'Present',
  session_type TEXT NOT NULL DEFAULT 'General Meeting',
  duration_hours NUMERIC(4,2),
  notes TEXT,
  recorded_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_att_member ON public.attendance_records(member_id);
CREATE INDEX IF NOT EXISTS idx_att_dept ON public.attendance_records(department_id);
CREATE INDEX IF NOT EXISTS idx_att_recorded_by ON public.attendance_records(recorded_by);
CREATE INDEX IF NOT EXISTS idx_att_date ON public.attendance_records(event_date);
CREATE INDEX IF NOT EXISTS idx_att_event ON public.attendance_records(event_id);

-- 3.10. Working Hours
CREATE TABLE IF NOT EXISTS public.working_hours (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  department_id UUID NOT NULL REFERENCES public.departments(id) ON DELETE CASCADE,
  project TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  hours NUMERIC(5,2) NOT NULL CHECK (hours > 0 AND hours <= 24),
  log_date DATE NOT NULL DEFAULT CURRENT_DATE,
  start_time TEXT,
  end_time TEXT,
  status public.working_hours_status NOT NULL DEFAULT 'Pending Verification',
  verified_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wh_member ON public.working_hours(member_id);
CREATE INDEX IF NOT EXISTS idx_wh_dept ON public.working_hours(department_id);
CREATE INDEX IF NOT EXISTS idx_wh_verified_by ON public.working_hours(verified_by);
CREATE INDEX IF NOT EXISTS idx_wh_status ON public.working_hours(status);

-- 3.11. Announcements (Supports both pinned and is_pinned)
CREATE TABLE IF NOT EXISTS public.announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  audience public.announcement_audience NOT NULL DEFAULT 'All Members',
  target_department_id UUID REFERENCES public.departments(id) ON DELETE CASCADE,
  posted_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  pinned BOOLEAN NOT NULL DEFAULT FALSE,
  is_pinned BOOLEAN NOT NULL DEFAULT FALSE,
  priority public.announcement_priority NOT NULL DEFAULT 'Normal',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ann_audience ON public.announcements(audience);
CREATE INDEX IF NOT EXISTS idx_ann_target_dept ON public.announcements(target_department_id);
CREATE INDEX IF NOT EXISTS idx_ann_posted_by ON public.announcements(posted_by);

-- 3.12. Notifications
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type public.notification_type NOT NULL DEFAULT 'General',
  link_tab TEXT,
  item_id UUID,
  read BOOLEAN NOT NULL DEFAULT FALSE,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notif_recipient ON public.notifications(recipient_id);
CREATE INDEX IF NOT EXISTS idx_notif_read ON public.notifications(read);

-- 3.13. General Activity Logs
CREATE TABLE IF NOT EXISTS public.activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  details TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_act_created ON public.activity_logs(created_at DESC);

-- ------------------------------------------------------------------------------
-- 4. TIMESTAMP UPDATE TRIGGERS
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

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

DROP TRIGGER IF EXISTS tr_task_submissions_updated_at ON public.task_submissions;
CREATE TRIGGER tr_task_submissions_updated_at
  BEFORE UPDATE ON public.task_submissions
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS tr_events_updated_at ON public.events;
CREATE TRIGGER tr_events_updated_at
  BEFORE UPDATE ON public.events
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS tr_attendance_records_updated_at ON public.attendance_records;
CREATE TRIGGER tr_attendance_records_updated_at
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

-- 4.2 Column Synchronization Triggers (Events & Announcements compatibility)
CREATE OR REPLACE FUNCTION public.handle_event_column_sync()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- Sync event_date and date
  IF NEW.event_date IS NOT NULL AND (NEW.date IS NULL OR (TG_OP = 'UPDATE' AND NEW.event_date IS DISTINCT FROM OLD.event_date)) THEN
    NEW.date := NEW.event_date;
  ELSIF NEW.date IS NOT NULL AND NEW.event_date IS NULL THEN
    NEW.event_date := NEW.date;
  END IF;

  -- Sync venue and location
  IF NEW.venue IS NOT NULL AND (NEW.location IS NULL OR (TG_OP = 'UPDATE' AND NEW.venue IS DISTINCT FROM OLD.venue)) THEN
    NEW.location := NEW.venue;
  ELSIF NEW.location IS NOT NULL AND NEW.venue IS NULL THEN
    NEW.venue := NEW.location;
  END IF;

  -- Sync start_time/end_time and time
  IF NEW.start_time IS NOT NULL AND (NEW.time IS NULL OR (TG_OP = 'UPDATE' AND NEW.start_time IS DISTINCT FROM OLD.start_time)) THEN
    NEW.time := NEW.start_time || COALESCE(' - ' || NEW.end_time, '');
  ELSIF NEW.time IS NOT NULL AND NEW.start_time IS NULL THEN
    NEW.start_time := NEW.time;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_events_column_sync ON public.events;
CREATE TRIGGER tr_events_column_sync
  BEFORE INSERT OR UPDATE ON public.events
  FOR EACH ROW EXECUTE FUNCTION public.handle_event_column_sync();

CREATE OR REPLACE FUNCTION public.handle_announcement_pin_sync()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.pinned IS NOT NULL AND (NEW.is_pinned IS NULL OR NEW.pinned <> NEW.is_pinned) THEN
    NEW.is_pinned := NEW.pinned;
  ELSIF NEW.is_pinned IS NOT NULL AND (NEW.pinned IS NULL OR NEW.pinned <> NEW.is_pinned) THEN
    NEW.pinned := NEW.is_pinned;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_announcements_pin_sync ON public.announcements;
CREATE TRIGGER tr_announcements_pin_sync
  BEFORE INSERT OR UPDATE ON public.announcements
  FOR EACH ROW EXECUTE FUNCTION public.handle_announcement_pin_sync();

-- ------------------------------------------------------------------------------
-- 5. RLS & PRIVILEGE HELPER FUNCTIONS (HARDENED SECURITY DEFINER)
-- ------------------------------------------------------------------------------
-- 5.1. Current user's hierarchy role, department, and executive status.
-- These helpers must exist before validation functions and RLS policies reference them.

CREATE OR REPLACE FUNCTION public.auth_hierarchy_role()
RETURNS public.hierarchy_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT p.hierarchy_role
  FROM public.profiles AS p
  WHERE p.id = auth.uid()
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.auth_department_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT p.department_id
  FROM public.profiles AS p
  WHERE p.id = auth.uid()
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.is_executive()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT COALESCE(
    public.auth_hierarchy_role() IN (
      'President'::public.hierarchy_role,
      'Vice President'::public.hierarchy_role
    ),
    FALSE
  );
$$;

CREATE OR REPLACE FUNCTION public.is_faculty()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT COALESCE(
    public.auth_hierarchy_role() = 'Faculty Advisor'::public.hierarchy_role,
    FALSE
  );
$$;

-- 5.2. Strictly identify trusted database administrators or server-side service role context
-- Includes 'supabase_auth_admin' to ensure GoTrue daemon signup triggers run securely

CREATE OR REPLACE FUNCTION public.is_trusted_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SET search_path = public, pg_temp
AS $$
DECLARE
  v_jwt_role TEXT;
BEGIN
  -- 1. Direct administrative database session
  -- (Supabase SQL Editor, psql, migrations, pg_cron, GoTrue auth)
  IF session_user IN (
    'postgres',
    'supabase_admin',
    'supabase_auth_admin'
  ) THEN
    BEGIN
      v_jwt_role := NULLIF(
        current_setting('request.jwt.claim.role', true),
        ''
      );
    EXCEPTION WHEN OTHERS THEN
      v_jwt_role := NULL;
    END;

    -- In direct database sessions, no PostgREST claim is active,
    -- or service_role is specified.
    IF v_jwt_role IS NULL OR v_jwt_role = 'service_role' THEN
      RETURN TRUE;
    END IF;
  END IF;

  -- 2. PostgREST API request with service_role context
  BEGIN
    v_jwt_role := NULLIF(
      current_setting('request.jwt.claim.role', true),
      ''
    );
  EXCEPTION WHEN OTHERS THEN
    v_jwt_role := NULL;
  END;

  IF v_jwt_role = 'service_role' THEN
    RETURN TRUE;
  END IF;

  RETURN FALSE;
END;
$$;
-- ------------------------------------------------------------------------------
-- 6. SECURITY DEFINER INTEGRITY & ANTI-TAMPER TRIGGERS
-- ------------------------------------------------------------------------------

-- 6.1. Profile Insert Guard & Role Consistency
CREATE OR REPLACE FUNCTION public.validate_profile_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_caller_role public.hierarchy_role;
BEGIN
  -- Trusted administrators (Supabase SQL Editor / service_role / GoTrue auth trigger)
  IF public.is_trusted_admin() THEN
    NEW.role := NEW.hierarchy_role::text;
    RETURN NEW;
  END IF;

  -- Client requests MUST be authenticated
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Security Policy Violation: Unauthenticated profile creation is prohibited.';
  END IF;

  -- Ordinary members are provisioned exclusively via handle_new_user() trigger on auth.users
  IF NOT public.is_executive() THEN
    RAISE EXCEPTION 'Security Policy Violation: Client-side profile insertion is restricted. New profiles are created automatically during authentication signup.';
  END IF;

  -- Executives creating profile: cannot appoint President unless caller is President
  v_caller_role := public.auth_hierarchy_role();
  IF NEW.hierarchy_role = 'President' AND v_caller_role <> 'President' THEN
    RAISE EXCEPTION 'Security Policy Violation: Only the President may appoint another President.';
  END IF;

  -- Keep role string column synchronized with hierarchy_role enum
  NEW.role := NEW.hierarchy_role::text;
  NEW.attendance_rate := COALESCE(NEW.attendance_rate, 100.00);
  NEW.tasks_completed := COALESCE(NEW.tasks_completed, 0);
  NEW.working_hours := COALESCE(NEW.working_hours, 0.00);
  NEW.join_date := COALESCE(NEW.join_date, CURRENT_DATE);

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_validate_profile_insert ON public.profiles;
CREATE TRIGGER tr_validate_profile_insert
  BEFORE INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_profile_insert();

-- 6.2. Comprehensive Profile Update Guard & Role Consistency
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
  -- 0. Internal automated metric synchronization bypass (tasks_completed, working_hours, attendance_rate)
  IF current_setting('clubflow.internal_metric_sync', true) = 'true' THEN
    -- Prevent role escalation or profile property alteration during metric sync
    IF NEW.hierarchy_role IS DISTINCT FROM OLD.hierarchy_role OR
       NEW.role IS DISTINCT FROM OLD.role OR
       NEW.department_id IS DISTINCT FROM OLD.department_id OR
       NEW.status IS DISTINCT FROM OLD.status OR
       NEW.email IS DISTINCT FROM OLD.email THEN
      RAISE EXCEPTION 'Security Policy Violation: Administrative profile fields cannot be modified during automated metric synchronization.';
    END IF;
    RETURN NEW;
  END IF;

  -- 1. Trusted DB sessions and service_role can make necessary updates
  IF public.is_trusted_admin() THEN
    -- Ensure role stays synchronized with hierarchy_role
    IF NEW.hierarchy_role IS DISTINCT FROM OLD.hierarchy_role OR NEW.role IS DISTINCT FROM NEW.hierarchy_role::text THEN
      NEW.role := NEW.hierarchy_role::text;
    END IF;
    RETURN NEW;
  END IF;

  -- 2. Reject unauthenticated updates
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Security Policy Violation: Unauthenticated profile modifications are prohibited.';
  END IF;

  -- 3. Faculty Advisor is strictly read-only
  IF public.is_faculty() THEN
    RAISE EXCEPTION 'Security Policy Violation: Faculty Advisor holds read-only governance and cannot modify profiles.';
  END IF;

  -- 4. HARD ESCALATION LOCK: A user can NEVER change their own hierarchy_role or role
  IF OLD.id = auth.uid() AND (OLD.hierarchy_role IS DISTINCT FROM NEW.hierarchy_role OR OLD.role IS DISTINCT FROM NEW.role) THEN
    RAISE EXCEPTION 'Security Policy Violation: Self-role escalation is strictly prohibited.';
  END IF;

  v_caller_role := public.auth_hierarchy_role();
  v_is_exec := public.is_executive();

  -- 5. Member editing their own profile (Permitted personal fields only)
  IF OLD.id = auth.uid() THEN
    IF NOT v_is_exec THEN
      -- Regular members can ONLY edit personal info: name, initials, avatar_url, phone, year
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
        RAISE EXCEPTION 'Security Policy Violation: You do not have permission to modify administrative profile fields.';
      END IF;
    ELSE
      -- Executives updating their own profile cannot tamper with calculated metrics, join_date, or email
      IF OLD.email IS DISTINCT FROM NEW.email OR
         OLD.attendance_rate IS DISTINCT FROM NEW.attendance_rate OR
         OLD.tasks_completed IS DISTINCT FROM NEW.tasks_completed OR
         OLD.working_hours IS DISTINCT FROM NEW.working_hours OR
         OLD.join_date IS DISTINCT FROM NEW.join_date THEN
        RAISE EXCEPTION 'Security Policy Violation: System metrics and primary email cannot be altered.';
      END IF;
    END IF;
  ELSE
    -- 6. Caller is updating ANOTHER member's profile
    IF NOT v_is_exec THEN
      RAISE EXCEPTION 'Security Policy Violation: Only executive leadership may modify other members profiles.';
    END IF;

    -- Only President can appoint or alter another President
    IF NEW.hierarchy_role = 'President' AND v_caller_role <> 'President' THEN
      RAISE EXCEPTION 'Security Policy Violation: Only the President may appoint another President.';
    END IF;

    IF OLD.hierarchy_role = 'President' AND v_caller_role <> 'President' THEN
      RAISE EXCEPTION 'Security Policy Violation: Only the President may modify President profile records.';
    END IF;

    -- Synchronize role text column with hierarchy_role
    IF NEW.hierarchy_role IS DISTINCT FROM OLD.hierarchy_role THEN
      NEW.role := NEW.hierarchy_role::text;
    END IF;

    -- Email is bound to auth.users and cannot be altered here
    IF OLD.email IS DISTINCT FROM NEW.email THEN
      RAISE EXCEPTION 'Security Policy Violation: Profile email must match the linked authentication account.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_validate_profile_update ON public.profiles;
CREATE TRIGGER tr_validate_profile_update
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_profile_update();

-- 6.3. Profile Delete Guard (Prevents unauthorized role deletion or deletion of the President)
CREATE OR REPLACE FUNCTION public.validate_profile_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_caller_role public.hierarchy_role;
BEGIN
  IF public.is_trusted_admin() THEN
    RETURN OLD;
  END IF;

  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Security Policy Violation: Unauthenticated profile deletion is prohibited.';
  END IF;

  v_caller_role := public.auth_hierarchy_role();

  -- Only President or Vice President can delete profiles
  IF v_caller_role NOT IN ('President', 'Vice President') THEN
    RAISE EXCEPTION 'Security Policy Violation: Only executive leadership may delete member profiles.';
  END IF;

  -- Prevent self-deletion of executive accounts
  IF OLD.id = auth.uid() THEN
    RAISE EXCEPTION 'Security Policy Violation: Self-deletion of executive accounts is prohibited.';
  END IF;

  -- The President account cannot be deleted via the client API
  IF OLD.hierarchy_role = 'President' THEN
    RAISE EXCEPTION 'Security Policy Violation: The President profile cannot be deleted via client operations.';
  END IF;

  -- Vice President cannot delete peer Vice Presidents or Faculty Advisors
  IF v_caller_role = 'Vice President' AND OLD.hierarchy_role IN ('Vice President', 'Faculty Advisor') THEN
    RAISE EXCEPTION 'Security Policy Violation: Vice Presidents cannot delete peer executive or governance accounts.';
  END IF;

  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS tr_validate_profile_delete ON public.profiles;
CREATE TRIGGER tr_validate_profile_delete
  BEFORE DELETE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_profile_delete();

-- 6.4. Task Submission Guard (Enforces field immutability, reviewer separation, and anti-self-approval)
CREATE OR REPLACE FUNCTION public.validate_task_submission()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_caller_id UUID;
  v_is_submitter BOOLEAN;
  v_is_reviewer BOOLEAN;
  v_task_assigned_to UUID;
  v_task_assigned_by UUID;
  v_task_dept_id UUID;
BEGIN
  IF public.is_trusted_admin() THEN
    RETURN NEW;
  END IF;

  v_caller_id := auth.uid();
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Security Policy Violation: Unauthenticated submission actions are prohibited.';
  END IF;

  -- Faculty Advisor cannot submit deliverables or review them
  IF public.is_faculty() THEN
    RAISE EXCEPTION 'Security Policy Violation: Faculty Advisor holds read-only governance and cannot create or review task submissions.';
  END IF;

  IF TG_OP = 'INSERT' THEN
    -- Fetch task context using NEW.task_id only (NEVER touch OLD on INSERT)
    SELECT assigned_to, assigned_by, department_id
    INTO v_task_assigned_to, v_task_assigned_by, v_task_dept_id
    FROM public.tasks
    WHERE id = NEW.task_id;

    IF v_task_assigned_to IS NULL THEN
      RAISE EXCEPTION 'Target task does not exist.';
    END IF;

    IF NEW.submitted_by <> v_caller_id THEN
      RAISE EXCEPTION 'Security Policy Violation: Submissions must be submitted by the authenticated user.';
    END IF;

    -- Submitter must be assigned to the task (or dept lead / executive)
    IF NOT (v_task_assigned_to = v_caller_id OR public.is_executive() OR (v_task_dept_id = public.auth_department_id() AND public.auth_hierarchy_role() IN ('Department Head', 'Department Co-Head'))) THEN
      RAISE EXCEPTION 'Security Policy Violation: You are not assigned to submit deliverables for this task.';
    END IF;

    -- Force initial review state to Pending; members cannot self-approve on creation
    NEW.review_status := 'Pending';
    NEW.reviewed_by := NULL;
    NEW.reviewed_at := NULL;
    NEW.review_comment := NULL;
    NEW.submitted_at := NOW();
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    -- task_id and submitted_by are strictly immutable
    IF NEW.task_id <> OLD.task_id OR NEW.submitted_by <> OLD.submitted_by THEN
      RAISE EXCEPTION 'Security Policy Violation: task_id and submitted_by cannot be changed.';
    END IF;

    -- Fetch task context using OLD.task_id
    SELECT assigned_to, assigned_by, department_id
    INTO v_task_assigned_to, v_task_assigned_by, v_task_dept_id
    FROM public.tasks
    WHERE id = OLD.task_id;

    v_is_submitter := (v_caller_id = OLD.submitted_by);
    v_is_reviewer := (
      public.is_executive() OR
      (v_task_dept_id = public.auth_department_id() AND public.auth_hierarchy_role() IN ('Department Head', 'Department Co-Head')) OR
      (v_task_assigned_by = v_caller_id)
    );

    -- Reject update if caller is neither submitter nor reviewer
    IF NOT v_is_submitter AND NOT v_is_reviewer THEN
      RAISE EXCEPTION 'Security Policy Violation: You are not authorized to update this task submission.';
    END IF;

    -- Anti-Self-Review: A user CANNOT approve or review their own submission
    IF v_is_submitter AND (
      NEW.review_status IS DISTINCT FROM OLD.review_status OR
      NEW.reviewed_by IS DISTINCT FROM OLD.reviewed_by OR
      NEW.reviewed_at IS DISTINCT FROM OLD.reviewed_at OR
      NEW.review_comment IS DISTINCT FROM OLD.review_comment
    ) THEN
      RAISE EXCEPTION 'Security Policy Violation: You cannot review or approve your own submission.';
    END IF;

    -- Submitter updating their own submission
    IF v_is_submitter THEN
      IF OLD.review_status = 'Approved' THEN
        RAISE EXCEPTION 'Security Policy Violation: Approved submissions cannot be modified.';
      END IF;

      -- Submitter cannot touch review outcome fields
      IF NEW.review_status IS DISTINCT FROM OLD.review_status OR
         NEW.reviewed_by IS DISTINCT FROM OLD.reviewed_by OR
         NEW.review_comment IS DISTINCT FROM OLD.review_comment OR
         NEW.reviewed_at IS DISTINCT FROM OLD.reviewed_at THEN
        RAISE EXCEPTION 'Security Policy Violation: Submitters cannot modify review outcome or approval fields.';
      END IF;
    END IF;

    -- Reviewer updating review fields
    IF v_is_reviewer AND v_caller_id <> OLD.submitted_by THEN
      -- Reviewer cannot alter student deliverable links, notes, or submission timestamp
      IF NEW.submission_link IS DISTINCT FROM OLD.submission_link OR
         NEW.submission_notes IS DISTINCT FROM OLD.submission_notes OR
         NEW.submitted_at IS DISTINCT FROM OLD.submitted_at THEN
        RAISE EXCEPTION 'Security Policy Violation: Reviewers cannot alter submission content.';
      END IF;

      -- Validate review status value
      IF NEW.review_status NOT IN ('Pending', 'Approved', 'Rejected') THEN
        RAISE EXCEPTION 'Security Policy Violation: Invalid review status value.';
      END IF;

      -- Automatically stamp reviewer identity and review timestamp
      NEW.reviewed_by := v_caller_id;
      NEW.reviewed_at := NOW();
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

-- 6.5. Working Hours Verification Guard
CREATE OR REPLACE FUNCTION public.validate_working_hours()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_caller_id UUID;
  v_is_owner BOOLEAN;
  v_is_verifier BOOLEAN;
  v_is_exec BOOLEAN;
  v_is_lead BOOLEAN;
BEGIN
  IF public.is_trusted_admin() THEN
    RETURN NEW;
  END IF;

  v_caller_id := auth.uid();
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Security Policy Violation: Unauthenticated working hours operations are prohibited.';
  END IF;

  IF public.is_faculty() THEN
    RAISE EXCEPTION 'Security Policy Violation: Faculty Advisor holds read-only governance and cannot log or verify working hours.';
  END IF;

  v_is_exec := public.is_executive();
  v_is_lead := (public.auth_hierarchy_role() IN ('Department Head', 'Department Co-Head'));

  IF TG_OP = 'INSERT' THEN
    IF NOT v_is_exec AND NEW.member_id <> v_caller_id THEN
      RAISE EXCEPTION 'Security Policy Violation: Members can only log hours for themselves.';
    END IF;

    -- Enforce department boundary on insert: member must belong to target department
    IF NOT v_is_exec AND NEW.department_id <> public.auth_department_id() THEN
      RAISE EXCEPTION 'Security Policy Violation: You can only log hours for your assigned department.';
    END IF;

    -- Members cannot self-verify on insert
    IF NOT v_is_exec THEN
      NEW.status := 'Pending Verification';
      NEW.verified_by := NULL;
    END IF;

    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    -- member_id and department_id are strictly immutable
    IF NEW.member_id <> OLD.member_id OR NEW.department_id <> OLD.department_id THEN
      RAISE EXCEPTION 'Security Policy Violation: Cannot move working hour records between members or departments.';
    END IF;

    v_is_owner := (v_caller_id = OLD.member_id);
    v_is_verifier := (
      v_is_exec OR
      (v_is_lead AND OLD.department_id = public.auth_department_id())
    );

    -- Reject update if caller is neither owner nor authorized verifier
    IF NOT v_is_owner AND NOT v_is_verifier THEN
      RAISE EXCEPTION 'Security Policy Violation: You are not authorized to update this working hours record.';
    END IF;

    -- Anti-Self-Verification: Nobody can verify their own hours
    IF v_is_owner AND (NEW.status = 'Verified' OR NEW.status IS DISTINCT FROM OLD.status OR NEW.verified_by IS DISTINCT FROM OLD.verified_by) THEN
      RAISE EXCEPTION 'Security Policy Violation: Members cannot verify or approve their own working hours.';
    END IF;

    -- Owner editing their own draft record
    IF v_is_owner THEN
      IF OLD.status = 'Verified' THEN
        RAISE EXCEPTION 'Security Policy Violation: Verified working hours records are locked from editing.';
      END IF;

      IF NEW.status IS DISTINCT FROM OLD.status OR NEW.verified_by IS DISTINCT FROM OLD.verified_by THEN
        RAISE EXCEPTION 'Security Policy Violation: Members cannot modify verification status.';
      END IF;
    END IF;

    -- Verifier verifying hours
    IF v_is_verifier AND v_caller_id <> OLD.member_id THEN
      -- Verifier cannot tamper with user log details
      IF NEW.project IS DISTINCT FROM OLD.project OR
         NEW.log_date IS DISTINCT FROM OLD.log_date OR
         NEW.start_time IS DISTINCT FROM OLD.start_time OR
         NEW.end_time IS DISTINCT FROM OLD.end_time OR
         NEW.description IS DISTINCT FROM OLD.description OR
         NEW.hours IS DISTINCT FROM OLD.hours THEN
        RAISE EXCEPTION 'Security Policy Violation: Verifiers cannot modify log project, hours, or description.';
      END IF;

      -- Transitioning to Verified: auto-stamp verifier identity
      IF NEW.status = 'Verified' AND OLD.status = 'Pending Verification' THEN
        NEW.verified_by := v_caller_id;
      END IF;
    END IF;

    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_validate_working_hours ON public.working_hours;
CREATE TRIGGER tr_validate_working_hours
  BEFORE INSERT OR UPDATE ON public.working_hours
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_working_hours();

-- 6.6. Tasks Column-Level Guard (Restricts assignee vs assigner vs executive changes)
CREATE OR REPLACE FUNCTION public.validate_task_modification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_caller_id UUID;
  v_is_exec BOOLEAN;
  v_is_dept_lead BOOLEAN;
  v_is_assignee BOOLEAN;
  v_is_creator BOOLEAN;
BEGIN
  IF public.is_trusted_admin() THEN
    RETURN NEW;
  END IF;

  v_caller_id := auth.uid();
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Security Policy Violation: Unauthenticated task operations are prohibited.';
  END IF;

  IF public.is_faculty() THEN
    RAISE EXCEPTION 'Security Policy Violation: Faculty Advisor holds read-only governance and cannot create or modify tasks.';
  END IF;

  v_is_exec := public.is_executive();

  IF TG_OP = 'INSERT' THEN
    v_is_dept_lead := (public.auth_hierarchy_role() IN ('Department Head', 'Department Co-Head') AND NEW.department_id = public.auth_department_id());

    -- assigned_by cannot be spoofed by non-executives
    IF NEW.assigned_by <> v_caller_id AND NOT v_is_exec THEN
      RAISE EXCEPTION 'Security Policy Violation: assigned_by must be the authenticated user.';
    END IF;

    IF NOT v_is_exec AND NOT v_is_dept_lead THEN
      RAISE EXCEPTION 'Security Policy Violation: Only executives and department leads can create tasks.';
    END IF;

    -- Department leads can only assign within their department
    IF v_is_dept_lead AND NOT v_is_exec THEN
      IF NOT EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = NEW.assigned_to AND (department_id = public.auth_department_id() OR department_id IS NULL)
      ) THEN
        RAISE EXCEPTION 'Security Policy Violation: Department leads can only assign tasks to members of their department.';
      END IF;
    END IF;

    -- Verify target assignee exists
    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = NEW.assigned_to) THEN
      RAISE EXCEPTION 'Target assignee does not exist.';
    END IF;

    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    v_is_dept_lead := (public.auth_hierarchy_role() IN ('Department Head', 'Department Co-Head') AND OLD.department_id = public.auth_department_id());
    v_is_assignee := (v_caller_id = OLD.assigned_to);
    v_is_creator := (v_caller_id = OLD.assigned_by);

    -- Assignee who is NOT executive or department lead can ONLY change task status
    IF v_is_assignee AND NOT v_is_exec AND NOT v_is_dept_lead AND NOT v_is_creator THEN
      IF NEW.title IS DISTINCT FROM OLD.title OR
         NEW.description IS DISTINCT FROM OLD.description OR
         NEW.department_id IS DISTINCT FROM OLD.department_id OR
         NEW.assigned_by IS DISTINCT FROM OLD.assigned_by OR
         NEW.assigned_to IS DISTINCT FROM OLD.assigned_to OR
         NEW.deadline IS DISTINCT FROM OLD.deadline OR
         NEW.priority IS DISTINCT FROM OLD.priority THEN
        RAISE EXCEPTION 'Security Policy Violation: Assignees may only update task status. Task details and assignments are restricted.';
      END IF;
    END IF;

    -- Department Leads cannot move tasks to another department or spoof assigned_by
    IF v_is_dept_lead AND NOT v_is_exec THEN
      IF NEW.department_id <> OLD.department_id THEN
        RAISE EXCEPTION 'Security Policy Violation: Department leads cannot move tasks across departments.';
      END IF;
      IF NEW.assigned_by IS DISTINCT FROM OLD.assigned_by THEN
        RAISE EXCEPTION 'Security Policy Violation: Cannot reassign task creator identity.';
      END IF;
      -- Department leads cannot reassign tasks outside their department on UPDATE
      IF NEW.assigned_to IS DISTINCT FROM OLD.assigned_to THEN
        IF NOT EXISTS (
          SELECT 1 FROM public.profiles
          WHERE id = NEW.assigned_to AND (department_id = public.auth_department_id() OR department_id IS NULL)
        ) THEN
          RAISE EXCEPTION 'Security Policy Violation: Department leads can only assign tasks to members of their department.';
        END IF;
      END IF;
    END IF;

    -- Prevent non-executives from spoofing assigned_by
    IF NOT v_is_exec AND NEW.assigned_by IS DISTINCT FROM OLD.assigned_by THEN
      RAISE EXCEPTION 'Security Policy Violation: assigned_by identity cannot be modified.';
    END IF;

    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_validate_task_modification ON public.tasks;
CREATE TRIGGER tr_validate_task_modification
  BEFORE INSERT OR UPDATE ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_task_modification();

-- 6.7. Attendance Validation Guard (Member-Department affinity, recorded_by protection, and boundary enforcement)
CREATE OR REPLACE FUNCTION public.validate_attendance_record()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_caller_id UUID;
  v_member_dept_id UUID;
  v_is_exec BOOLEAN;
  v_is_dept_lead BOOLEAN;
BEGIN
  IF public.is_trusted_admin() THEN
    RETURN NEW;
  END IF;

  v_caller_id := auth.uid();
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Security Policy Violation: Unauthenticated attendance operations are prohibited.';
  END IF;

  -- Faculty is strictly read-only
  IF public.is_faculty() THEN
    RAISE EXCEPTION 'Security Policy Violation: Faculty Advisor holds read-only governance and cannot record or modify attendance.';
  END IF;

  v_is_exec := public.is_executive();
  v_is_dept_lead := (public.auth_hierarchy_role() IN ('Department Head', 'Department Co-Head'));

  IF TG_OP = 'INSERT' THEN
    -- recorded_by cannot be spoofed
    NEW.recorded_by := v_caller_id;

    -- Department leads restricted strictly to their department
    IF NOT v_is_exec AND NOT (v_is_dept_lead AND NEW.department_id = public.auth_department_id()) THEN
      RAISE EXCEPTION 'Security Policy Violation: You can only record attendance for your own department.';
    END IF;

    -- Validate that member_id is affiliated with department_id
    SELECT department_id INTO v_member_dept_id FROM public.profiles WHERE id = NEW.member_id;
    IF v_member_dept_id IS NOT NULL AND v_member_dept_id <> NEW.department_id AND NOT v_is_exec THEN
      RAISE EXCEPTION 'Security Policy Violation: Member is assigned to a different department.';
    END IF;

    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    -- recorded_by and member_id are immutable
    IF NEW.recorded_by IS DISTINCT FROM OLD.recorded_by THEN
      RAISE EXCEPTION 'Security Policy Violation: recorded_by on attendance record cannot be altered.';
    END IF;

    IF NEW.member_id <> OLD.member_id THEN
      RAISE EXCEPTION 'Security Policy Violation: member_id on attendance record cannot be altered.';
    END IF;

    -- Department leads cannot manage attendance outside their department or move records across departments
    IF NOT v_is_exec THEN
      IF NOT (v_is_dept_lead AND OLD.department_id = public.auth_department_id() AND NEW.department_id = public.auth_department_id()) THEN
        RAISE EXCEPTION 'Security Policy Violation: Department leads cannot manage attendance outside their department.';
      END IF;
    END IF;

    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_validate_attendance ON public.attendance_records;
CREATE TRIGGER tr_validate_attendance
  BEFORE INSERT OR UPDATE ON public.attendance_records
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_attendance_record();

-- 6.8. Announcements Integrity Guard
CREATE OR REPLACE FUNCTION public.validate_announcement()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_caller_id UUID;
  v_is_exec BOOLEAN;
  v_is_dept_lead BOOLEAN;
BEGIN
  IF public.is_trusted_admin() THEN
    RETURN NEW;
  END IF;

  v_caller_id := auth.uid();
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Security Policy Violation: Unauthenticated announcement operations are prohibited.';
  END IF;

  IF public.is_faculty() THEN
    RAISE EXCEPTION 'Security Policy Violation: Faculty Advisor holds read-only governance and cannot post or modify announcements.';
  END IF;

  v_is_exec := public.is_executive();
  v_is_dept_lead := (public.auth_hierarchy_role() IN ('Department Head', 'Department Co-Head'));

  IF TG_OP = 'INSERT' THEN
    NEW.posted_by := v_caller_id;

    IF NOT v_is_exec AND NOT v_is_dept_lead THEN
      RAISE EXCEPTION 'Security Policy Violation: Only executives and department leads can post announcements.';
    END IF;

    IF v_is_dept_lead AND NOT v_is_exec THEN
      IF NEW.audience <> 'Specific Department' OR NEW.target_department_id <> public.auth_department_id() THEN
        RAISE EXCEPTION 'Security Policy Violation: Department leads can only post announcements to their own department.';
      END IF;
    END IF;

    IF NEW.audience = 'All Members' THEN
      NEW.target_department_id := NULL;
    END IF;

    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    -- Author cannot be modified
    IF NEW.posted_by IS DISTINCT FROM OLD.posted_by THEN
      RAISE EXCEPTION 'Security Policy Violation: Announcement posted_by identity cannot be modified.';
    END IF;

    IF NOT v_is_exec THEN
      IF NOT (v_is_dept_lead AND OLD.target_department_id = public.auth_department_id() AND NEW.target_department_id = public.auth_department_id() AND NEW.audience = 'Specific Department') THEN
        RAISE EXCEPTION 'Security Policy Violation: Department leads cannot move announcements across audiences or departments.';
      END IF;
    END IF;

    IF NEW.audience = 'All Members' THEN
      NEW.target_department_id := NULL;
    END IF;

    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_validate_announcement ON public.announcements;
CREATE TRIGGER tr_validate_announcement
  BEFORE INSERT OR UPDATE ON public.announcements
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_announcement();

-- 6.9. Notification Read Status Guard (Guards recipient_id, payload, and timestamps)
CREATE OR REPLACE FUNCTION public.validate_notification_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NOT public.is_trusted_admin() THEN
    IF NEW.recipient_id <> OLD.recipient_id OR
       NEW.title <> OLD.title OR
       NEW.message <> OLD.message OR
       NEW.type <> OLD.type OR
       NEW.link_tab IS DISTINCT FROM OLD.link_tab OR
       NEW.item_id IS DISTINCT FROM OLD.item_id OR
       NEW.created_at <> OLD.created_at THEN
      RAISE EXCEPTION 'Security Policy Violation: Recipients may only update the read status field.';
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

-- 6.10. Activity Logs Integrity Guard (Strict Append-only enforcement on INSERT)
CREATE OR REPLACE FUNCTION public.validate_activity_log()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NOT public.is_trusted_admin() THEN
    -- Force actor_id to authenticated user and timestamp to NOW()
    NEW.actor_id := auth.uid();
    NEW.created_at := NOW();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_validate_activity_log ON public.activity_logs;
CREATE TRIGGER tr_validate_activity_log
  BEFORE INSERT ON public.activity_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_activity_log();

DROP TRIGGER IF EXISTS tr_validate_task_activity_log ON public.task_activity_logs;
CREATE TRIGGER tr_validate_task_activity_log
  BEFORE INSERT ON public.task_activity_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_activity_log();

-- 6.11. Activity Logs Immutability Lock (Hard engine-level defense against UPDATE or DELETE)
CREATE OR REPLACE FUNCTION public.prevent_audit_log_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RAISE EXCEPTION 'Security Policy Violation: Audit activity logs are append-only and cannot be updated or deleted.';
END;
$$;

DROP TRIGGER IF EXISTS tr_lock_activity_logs ON public.activity_logs;
CREATE TRIGGER tr_lock_activity_logs
  BEFORE UPDATE OR DELETE ON public.activity_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_audit_log_mutation();

DROP TRIGGER IF EXISTS tr_lock_task_activity_logs ON public.task_activity_logs;
CREATE TRIGGER tr_lock_task_activity_logs
  BEFORE UPDATE OR DELETE ON public.task_activity_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_audit_log_mutation();

-- 6.12. Events Integrity Guard
CREATE OR REPLACE FUNCTION public.validate_event_modification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_caller_id UUID;
  v_is_exec BOOLEAN;
  v_is_dept_lead BOOLEAN;
BEGIN
  IF public.is_trusted_admin() THEN
    RETURN NEW;
  END IF;

  v_caller_id := auth.uid();
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Security Policy Violation: Unauthenticated event operations are prohibited.';
  END IF;

  IF public.is_faculty() THEN
    RAISE EXCEPTION 'Security Policy Violation: Faculty Advisor holds read-only governance and cannot modify events.';
  END IF;

  v_is_exec := public.is_executive();

  IF TG_OP = 'INSERT' THEN
    v_is_dept_lead := (public.auth_hierarchy_role() IN ('Department Head', 'Department Co-Head'));
    NEW.organizer_id := v_caller_id;

    IF NOT v_is_exec AND NOT v_is_dept_lead THEN
      RAISE EXCEPTION 'Security Policy Violation: Only executives and department leads can create events.';
    END IF;

    IF v_is_dept_lead AND NOT v_is_exec AND NEW.department_id <> public.auth_department_id() THEN
      RAISE EXCEPTION 'Security Policy Violation: Department leads can only create events for their own department.';
    END IF;

    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    v_is_dept_lead := (public.auth_hierarchy_role() IN ('Department Head', 'Department Co-Head'));

    IF NEW.organizer_id IS DISTINCT FROM OLD.organizer_id THEN
      RAISE EXCEPTION 'Security Policy Violation: Event organizer identity cannot be altered.';
    END IF;

    IF NOT v_is_exec THEN
      IF NOT (v_is_dept_lead AND OLD.department_id = public.auth_department_id() AND NEW.department_id = public.auth_department_id()) THEN
        RAISE EXCEPTION 'Security Policy Violation: Department leads cannot manage events outside their department.';
      END IF;
    END IF;

    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_validate_event_modification ON public.events;
CREATE TRIGGER tr_validate_event_modification
  BEFORE INSERT OR UPDATE ON public.events
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_event_modification();

-- ------------------------------------------------------------------------------
-- 7. AUTOMATED USER ONBOARDING, METRIC SYNC & SECURE BOOTSTRAP
-- ------------------------------------------------------------------------------

-- 7.1. Automated Profile Provisioning on Supabase Auth Signup (Resilient & Non-Escalating)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_full_name TEXT;
  v_initials TEXT;
  v_email TEXT;
  v_first_dept_id UUID;
BEGIN
  v_full_name := COALESCE(
    NULLIF(NEW.raw_user_meta_data->>'full_name', ''),
    NULLIF(NEW.raw_user_meta_data->>'name', ''),
    split_part(COALESCE(NEW.email, ''), '@', 1),
    'Club Member'
  );

  v_initials := UPPER(SUBSTRING(v_full_name FROM 1 FOR 2));
  IF LENGTH(v_initials) = 0 THEN
    v_initials := 'CM';
  END IF;

  -- Resilient email determination to safely accommodate phone-based or external OAuth signups
  v_email := COALESCE(
    NEW.email,
    NULLIF(NEW.raw_user_meta_data->>'email', ''),
    (COALESCE(NEW.phone, NEW.id::text) || '@member.clubflow')
  );

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
    v_email,
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

-- 7.2. Automated Duplicate-Safe Metric Synchronization: tasks_completed
CREATE OR REPLACE FUNCTION public.sync_member_tasks_completed()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_target_member_id UUID;
  v_completed_count INT;
BEGIN
  v_target_member_id := COALESCE(NEW.submitted_by, OLD.submitted_by);
  IF v_target_member_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- Count distinct tasks where at least one deliverable submission was Approved (duplicate-safe)
  SELECT COUNT(DISTINCT task_id) INTO v_completed_count
  FROM public.task_submissions
  WHERE submitted_by = v_target_member_id AND review_status = 'Approved';

  -- Set transaction-scoped internal sync flag to pass validate_profile_update
  PERFORM set_config('clubflow.internal_metric_sync', 'true', true);

  UPDATE public.profiles
  SET tasks_completed = v_completed_count
  WHERE id = v_target_member_id;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS tr_sync_tasks_completed ON public.task_submissions;
CREATE TRIGGER tr_sync_tasks_completed
  AFTER INSERT OR UPDATE OF review_status, submitted_by, task_id OR DELETE ON public.task_submissions
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_member_tasks_completed();

-- 7.3. Automated Duplicate-Safe Metric Synchronization: working_hours
CREATE OR REPLACE FUNCTION public.sync_member_working_hours()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_target_member_id UUID;
  v_total_hours NUMERIC(7,2);
BEGIN
  v_target_member_id := COALESCE(NEW.member_id, OLD.member_id);
  IF v_target_member_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- Sum verified hours accurately
  SELECT COALESCE(SUM(hours), 0.00) INTO v_total_hours
  FROM public.working_hours
  WHERE member_id = v_target_member_id AND status = 'Verified';

  -- Set transaction-scoped internal sync flag to pass validate_profile_update
  PERFORM set_config('clubflow.internal_metric_sync', 'true', true);

  UPDATE public.profiles
  SET working_hours = v_total_hours
  WHERE id = v_target_member_id;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS tr_sync_working_hours ON public.working_hours;
CREATE TRIGGER tr_sync_working_hours
  AFTER INSERT OR UPDATE OF status, hours, member_id OR DELETE ON public.working_hours
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_member_working_hours();

-- 7.4. Automated Duplicate-Safe Metric Synchronization: attendance_rate
CREATE OR REPLACE FUNCTION public.sync_member_attendance_rate()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_target_member_id UUID;
  v_total_records INT;
  v_present_records INT;
  v_calculated_rate NUMERIC(5,2);
BEGIN
  v_target_member_id := COALESCE(NEW.member_id, OLD.member_id);
  IF v_target_member_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  SELECT
    COUNT(*),
    COUNT(*) FILTER (WHERE status IN ('Present', 'Late'))
  INTO v_total_records, v_present_records
  FROM public.attendance_records
  WHERE member_id = v_target_member_id;

  IF v_total_records = 0 THEN
    v_calculated_rate := 100.00;
  ELSE
    v_calculated_rate := ROUND((v_present_records::numeric / v_total_records::numeric) * 100.00, 2);
  END IF;

  -- Set transaction-scoped internal sync flag to pass validate_profile_update
  PERFORM set_config('clubflow.internal_metric_sync', 'true', true);

  UPDATE public.profiles
  SET attendance_rate = v_calculated_rate
  WHERE id = v_target_member_id;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS tr_sync_attendance_rate ON public.attendance_records;
CREATE TRIGGER tr_sync_attendance_rate
  AFTER INSERT OR UPDATE OF status, member_id OR DELETE ON public.attendance_records
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_member_attendance_rate();

-- 7.5. Secure Initial President Bootstrap Function
-- One-time initialization executed exclusively by database administrator (postgres/service_role)
CREATE OR REPLACE FUNCTION public.bootstrap_initial_president(target_email TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_existing_president_count INT;
  v_target_profile_id UUID;
BEGIN
  IF NOT public.is_trusted_admin() THEN
    RAISE EXCEPTION 'Security Policy Violation: Initial President bootstrap can only be executed via the Supabase SQL Editor or Service Role.';
  END IF;

  SELECT COUNT(*) INTO v_existing_president_count
  FROM public.profiles
  WHERE hierarchy_role = 'President';

  IF v_existing_president_count > 0 THEN
    RAISE EXCEPTION 'Bootstrap Violation: A President has already been established for this organization.';
  END IF;

  SELECT id INTO v_target_profile_id
  FROM public.profiles
  WHERE LOWER(email) = LOWER(TRIM(target_email));

  IF v_target_profile_id IS NULL THEN
    RAISE EXCEPTION 'Target user with email % not found in profiles. Please have the user sign up first.', target_email;
  END IF;

  UPDATE public.profiles
  SET
    hierarchy_role = 'President',
    role = 'President',
    status = 'Core Lead'
  WHERE id = v_target_profile_id;
END;
$$;

-- ------------------------------------------------------------------------------
-- 8. ROW LEVEL SECURITY (RLS) POLICIES
-- ------------------------------------------------------------------------------

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

-- Client-side profile insertion is RESTRICTED to executives (regular members are auto-created by auth trigger)
DROP POLICY IF EXISTS "profiles_insert_executives_or_self" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_executives" ON public.profiles;
CREATE POLICY "profiles_insert_executives"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (public.is_executive());

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
    -- The President profile cannot be deleted via RLS; Vice Presidents cannot delete higher/peer tiers
    (public.auth_hierarchy_role() = 'President' AND id <> auth.uid() AND hierarchy_role <> 'President') OR
    (public.auth_hierarchy_role() = 'Vice President' AND id <> auth.uid() AND hierarchy_role NOT IN ('President', 'Vice President', 'Faculty Advisor'))
  );

-- 8.4. Tasks
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

-- Aligns with trigger: executives can assign tasks directly, department leads can assign within their department
DROP POLICY IF EXISTS "tasks_insert_policy" ON public.tasks;
CREATE POLICY "tasks_insert_policy"
  ON public.tasks FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_executive() OR
    (
      assigned_by = auth.uid() AND
      public.auth_hierarchy_role() IN ('Department Head', 'Department Co-Head') AND
      department_id = public.auth_department_id()
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
        (t.department_id = public.auth_department_id() AND public.auth_hierarchy_role() IN ('Department Head', 'Department Co-Head')) OR
        t.assigned_by = auth.uid()
      )
    )
  )
  WITH CHECK (
    submitted_by = auth.uid() OR
    public.is_executive() OR
    EXISTS (
      SELECT 1 FROM public.tasks t
      WHERE t.id = task_id AND (
        (t.department_id = public.auth_department_id() AND public.auth_hierarchy_role() IN ('Department Head', 'Department Co-Head')) OR
        t.assigned_by = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "submissions_delete_policy" ON public.task_submissions;
CREATE POLICY "submissions_delete_policy"
  ON public.task_submissions FOR DELETE
  TO authenticated
  USING (
    (submitted_by = auth.uid() AND review_status = 'Pending') OR
    public.is_executive()
  );

-- 8.6. Task Activity Logs (Append Only)
DROP POLICY IF EXISTS "task_activity_logs_select" ON public.task_activity_logs;
CREATE POLICY "task_activity_logs_select"
  ON public.task_activity_logs FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "task_activity_logs_insert" ON public.task_activity_logs;
CREATE POLICY "task_activity_logs_insert"
  ON public.task_activity_logs FOR INSERT
  TO authenticated
  WITH CHECK (actor_id = auth.uid());

-- 8.7. Events
DROP POLICY IF EXISTS "events_select_policy" ON public.events;
CREATE POLICY "events_select_policy"
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
      (public.auth_hierarchy_role() IN ('Department Head', 'Department Co-Head') AND department_id = public.auth_department_id())
    )
  );

DROP POLICY IF EXISTS "events_update_policy" ON public.events;
CREATE POLICY "events_update_policy"
  ON public.events FOR UPDATE
  TO authenticated
  USING (
    public.is_executive() OR
    (public.auth_hierarchy_role() IN ('Department Head', 'Department Co-Head') AND department_id = public.auth_department_id())
  )
  WITH CHECK (
    public.is_executive() OR
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

DROP POLICY IF EXISTS "event_rsvps_update_policy" ON public.event_rsvps;
CREATE POLICY "event_rsvps_update_policy"
  ON public.event_rsvps FOR UPDATE
  TO authenticated
  USING (member_id = auth.uid() OR public.is_executive())
  WITH CHECK (member_id = auth.uid() OR public.is_executive());

DROP POLICY IF EXISTS "event_rsvps_delete_self" ON public.event_rsvps;
CREATE POLICY "event_rsvps_delete_self"
  ON public.event_rsvps FOR DELETE
  TO authenticated
  USING (member_id = auth.uid() OR public.is_executive());

-- 8.9. Attendance Records
-- Faculty Advisor: read-only oversight; Leads: own department; Executives: cross-department
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

-- 8.12. Notifications (Hardened: Recipient-Scoped & Trusted Server Dispatch)
DROP POLICY IF EXISTS "notifications_select_recipient" ON public.notifications;
CREATE POLICY "notifications_select_recipient"
  ON public.notifications FOR SELECT
  TO authenticated
  USING (recipient_id = auth.uid());

DROP POLICY IF EXISTS "notifications_update_recipient" ON public.notifications;
CREATE POLICY "notifications_update_recipient"
  ON public.notifications FOR UPDATE
  TO authenticated
  USING (recipient_id = auth.uid())
  WITH CHECK (recipient_id = auth.uid());

DROP POLICY IF EXISTS "notifications_delete_recipient" ON public.notifications;
CREATE POLICY "notifications_delete_recipient"
  ON public.notifications FOR DELETE
  TO authenticated
  USING (recipient_id = auth.uid());

-- Direct client INSERT is strictly restricted to Executives; general members dispatch via create_notification()
DROP POLICY IF EXISTS "notifications_insert_all" ON public.notifications;
DROP POLICY IF EXISTS "notifications_insert_executives" ON public.notifications;
CREATE POLICY "notifications_insert_executives"
  ON public.notifications FOR INSERT
  TO authenticated
  WITH CHECK (public.is_executive());

-- 8.13. Audit Activity Logs (Append Only)
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

-- ------------------------------------------------------------------------------
-- 9. STRICT TABLE PERMISSIONS & FUNCTION EXECUTE GRANTS
-- ------------------------------------------------------------------------------

-- Revoke all public schema table/sequence access from anonymous callers
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon;
REVOKE ALL ON ALL ROUTINES IN SCHEMA public FROM anon;

-- Grant required table privileges to authenticated and service_role
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated, service_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated, service_role;

-- Strictly disallow UPDATE and DELETE on activity logs across all non-superuser roles (Append-only guarantee)
REVOKE UPDATE, DELETE, TRUNCATE ON public.activity_logs FROM PUBLIC, anon, authenticated;
REVOKE UPDATE, DELETE, TRUNCATE ON public.task_activity_logs FROM PUBLIC, anon, authenticated;

-- Function Execution Privileges
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM PUBLIC, anon;

-- Grant execution of application helpers and trigger functions to authenticated and service_role
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated, service_role;

-- Bootstrap function is restricted strictly to DB administrative roles
REVOKE EXECUTE ON FUNCTION public.bootstrap_initial_president(TEXT) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.bootstrap_initial_president(TEXT) TO postgres, service_role;

-- ------------------------------------------------------------------------------
-- 10. BASELINE SEED DATA (CONDITIONAL IDEMPOTENT RUN)
-- ------------------------------------------------------------------------------
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
