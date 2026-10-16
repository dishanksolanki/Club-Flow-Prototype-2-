-- ==============================================================================
-- ClubFlow - Comprehensive Supabase Database Migration
-- Version: 20261016000001_clubflow_init.sql
-- Description: Core schema, enums, tables, foreign keys, triggers, security functions,
--              and Row Level Security (RLS) policies for the 8-tier hierarchy.
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
    'Faculty Advisor',      -- Tier 1: Institutional Governance & Oversight
    'President',            -- Tier 2: Executive Leadership & Administration
    'Vice President',       -- Tier 3: Cross-Functional Operations & Executive
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
-- Note: lead_id and co_lead_id references to profiles are added after profiles table creation.
CREATE TABLE IF NOT EXISTS public.departments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT UNIQUE NOT NULL, -- e.g. 'Technical', 'Design', 'Marketing', 'Event Management', 'Media', 'Content'
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
  type TEXT NOT NULL, -- 'task', 'event', 'announcement', 'attendance'
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
-- 4. UTILITY FUNCTIONS & SECURITY TRIGGERS
-- ------------------------------------------------------------------------------

-- Generic updated_at timestamp trigger function
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Attach updated_at triggers
DROP TRIGGER IF EXISTS tr_club_settings_updated_at ON public.club_settings;
CREATE TRIGGER tr_club_settings_updated_at BEFORE UPDATE ON public.club_settings FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS tr_departments_updated_at ON public.departments;
CREATE TRIGGER tr_departments_updated_at BEFORE UPDATE ON public.departments FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS tr_profiles_updated_at ON public.profiles;
CREATE TRIGGER tr_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS tr_tasks_updated_at ON public.tasks;
CREATE TRIGGER tr_tasks_updated_at BEFORE UPDATE ON public.tasks FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS tr_events_updated_at ON public.events;
CREATE TRIGGER tr_events_updated_at BEFORE UPDATE ON public.events FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS tr_attendance_updated_at ON public.attendance_records;
CREATE TRIGGER tr_attendance_updated_at BEFORE UPDATE ON public.attendance_records FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS tr_working_hours_updated_at ON public.working_hours;
CREATE TRIGGER tr_working_hours_updated_at BEFORE UPDATE ON public.working_hours FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS tr_announcements_updated_at ON public.announcements;
CREATE TRIGGER tr_announcements_updated_at BEFORE UPDATE ON public.announcements FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ------------------------------------------------------------------------------
-- 5. RLS HELPER FUNCTIONS (SECURITY DEFINER)
-- ------------------------------------------------------------------------------

-- Retrieve hierarchy role of authenticated user
CREATE OR REPLACE FUNCTION public.auth_hierarchy_role()
RETURNS hierarchy_role AS $$
  SELECT hierarchy_role FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Check if authenticated user belongs to executive leadership (Tiers 2-5)
CREATE OR REPLACE FUNCTION public.is_executive()
RETURNS BOOLEAN AS $$
  SELECT auth_hierarchy_role() IN ('President', 'Vice President', 'Head', 'Co-Head');
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Check if authenticated user is Faculty Advisor (Tier 1, Advisory & Read-Only Governance)
CREATE OR REPLACE FUNCTION public.is_faculty()
RETURNS BOOLEAN AS $$
  SELECT auth_hierarchy_role() = 'Faculty Advisor';
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Retrieve department_id of authenticated user
CREATE OR REPLACE FUNCTION public.auth_department_id()
RETURNS UUID AS $$
  SELECT department_id FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Check if authenticated user is Head or Co-Head of a specific department
CREATE OR REPLACE FUNCTION public.is_department_lead(target_dept_id UUID)
RETURNS BOOLEAN AS $$
  SELECT (
    (auth_hierarchy_role() IN ('Department Head', 'Department Co-Head')) AND
    (auth_department_id() = target_dept_id)
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- ------------------------------------------------------------------------------
-- 6. CRITICAL SECURITY GUARDRAILS: PREVENT SELF-ROLE ESCALATION
-- ------------------------------------------------------------------------------
-- Ensures a user cannot elevate their own role or promote members without executive permissions.
CREATE OR REPLACE FUNCTION public.prevent_self_role_escalation()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if hierarchy_role was altered
  IF OLD.hierarchy_role IS DISTINCT FROM NEW.hierarchy_role THEN
    -- Only Executive officers (President, VP, Head, Co-Head) can modify hierarchy roles
    -- AND a user can NEVER modify their own hierarchy_role (must be changed by another executive)
    IF NOT (public.is_executive() AND auth.uid() <> OLD.id) THEN
      RAISE EXCEPTION 'Security Policy Violation: You are not authorized to modify this hierarchy role.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_prevent_self_role_escalation ON public.profiles;
CREATE TRIGGER tr_prevent_self_role_escalation
  BEFORE UPDATE OF hierarchy_role ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_self_role_escalation();

-- ------------------------------------------------------------------------------
-- 7. AUTOMATED PROFILE PROVISIONING TRIGGER FOR SUPABASE AUTH
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ------------------------------------------------------------------------------
-- 8. ROW LEVEL SECURITY (RLS) POLICIES
-- ------------------------------------------------------------------------------

-- Enable RLS on all public tables
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
CREATE POLICY "club_settings_select_all"
  ON public.club_settings FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "club_settings_update_executives"
  ON public.club_settings FOR UPDATE
  TO authenticated
  USING (public.is_executive())
  WITH CHECK (public.is_executive());

-- 8.2. Departments
CREATE POLICY "departments_select_all"
  ON public.departments FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "departments_insert_executives"
  ON public.departments FOR INSERT
  TO authenticated
  WITH CHECK (public.is_executive());

CREATE POLICY "departments_update_executives"
  ON public.departments FOR UPDATE
  TO authenticated
  USING (public.is_executive())
  WITH CHECK (public.is_executive());

CREATE POLICY "departments_delete_executives"
  ON public.departments FOR DELETE
  TO authenticated
  USING (public.is_executive());

-- 8.3. Profiles
CREATE POLICY "profiles_select_authenticated"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "profiles_insert_executives_or_self"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id OR public.is_executive());

CREATE POLICY "profiles_update_policy"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id OR public.is_executive())
  WITH CHECK (auth.uid() = id OR public.is_executive());

-- 8.4. Tasks
-- Visible to members of the department, executives, faculty, or direct assignees
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

-- Executives can assign to any department; Dept Leads can assign only within their own department
CREATE POLICY "tasks_insert_policy"
  ON public.tasks FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_executive() OR
    (public.auth_hierarchy_role() IN ('Department Head', 'Department Co-Head') AND department_id = public.auth_department_id())
  );

-- Updating tasks (status, assignment, details)
CREATE POLICY "tasks_update_policy"
  ON public.tasks FOR UPDATE
  TO authenticated
  USING (
    public.is_executive() OR
    (public.auth_hierarchy_role() IN ('Department Head', 'Department Co-Head') AND department_id = public.auth_department_id()) OR
    assigned_to = auth.uid()
  )
  WITH CHECK (
    public.is_executive() OR
    (public.auth_hierarchy_role() IN ('Department Head', 'Department Co-Head') AND department_id = public.auth_department_id()) OR
    assigned_to = auth.uid()
  );

CREATE POLICY "tasks_delete_policy"
  ON public.tasks FOR DELETE
  TO authenticated
  USING (public.is_executive());

-- 8.5. Task Submissions
CREATE POLICY "submissions_select_policy"
  ON public.task_submissions FOR SELECT
  TO authenticated
  USING (
    public.is_executive() OR
    public.is_faculty() OR
    submitted_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.tasks t
      WHERE t.id = task_id AND (t.department_id = public.auth_department_id() OR t.assigned_by = auth.uid())
    )
  );

CREATE POLICY "submissions_insert_policy"
  ON public.task_submissions FOR INSERT
  TO authenticated
  WITH CHECK (submitted_by = auth.uid());

CREATE POLICY "submissions_update_policy"
  ON public.task_submissions FOR UPDATE
  TO authenticated
  USING (
    submitted_by = auth.uid() OR
    public.is_executive() OR
    EXISTS (
      SELECT 1 FROM public.tasks t
      WHERE t.id = task_id AND t.department_id = public.auth_department_id() AND public.auth_hierarchy_role() IN ('Department Head', 'Department Co-Head')
    )
  );

-- 8.6. Task Activity Logs
CREATE POLICY "task_logs_select"
  ON public.task_activity_logs FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "task_logs_insert"
  ON public.task_activity_logs FOR INSERT
  TO authenticated
  WITH CHECK (actor_id = auth.uid());

-- 8.7. Events
CREATE POLICY "events_select_all"
  ON public.events FOR SELECT
  TO authenticated
  USING (true);

-- Executives, Department Leads, and Event Management members can create events (Faculty is advisory only)
CREATE POLICY "events_insert_policy"
  ON public.events FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_executive() OR
    (public.auth_hierarchy_role() IN ('Department Head', 'Department Co-Head'))
  );

CREATE POLICY "events_update_policy"
  ON public.events FOR UPDATE
  TO authenticated
  USING (
    public.is_executive() OR
    organizer_id = auth.uid() OR
    (public.auth_hierarchy_role() IN ('Department Head', 'Department Co-Head') AND department_id = public.auth_department_id())
  );

CREATE POLICY "events_delete_policy"
  ON public.events FOR DELETE
  TO authenticated
  USING (public.is_executive());

-- 8.8. Event RSVPs
CREATE POLICY "event_rsvps_select_all"
  ON public.event_rsvps FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "event_rsvps_insert_self"
  ON public.event_rsvps FOR INSERT
  TO authenticated
  WITH CHECK (member_id = auth.uid() OR public.is_executive());

CREATE POLICY "event_rsvps_delete_self"
  ON public.event_rsvps FOR DELETE
  TO authenticated
  USING (member_id = auth.uid() OR public.is_executive());

-- 8.9. Attendance Records
CREATE POLICY "attendance_select_policy"
  ON public.attendance_records FOR SELECT
  TO authenticated
  USING (
    public.is_executive() OR
    public.is_faculty() OR
    member_id = auth.uid() OR
    department_id = public.auth_department_id()
  );

-- Recorded by Department Leads or Executives
CREATE POLICY "attendance_insert_policy"
  ON public.attendance_records FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_executive() OR
    (public.auth_hierarchy_role() IN ('Department Head', 'Department Co-Head'))
  );

CREATE POLICY "attendance_update_policy"
  ON public.attendance_records FOR UPDATE
  TO authenticated
  USING (
    public.is_executive() OR
    (public.auth_hierarchy_role() IN ('Department Head', 'Department Co-Head'))
  );

CREATE POLICY "attendance_delete_policy"
  ON public.attendance_records FOR DELETE
  TO authenticated
  USING (public.is_executive());

-- 8.10. Working Hours
CREATE POLICY "working_hours_select_policy"
  ON public.working_hours FOR SELECT
  TO authenticated
  USING (
    public.is_executive() OR
    public.is_faculty() OR
    member_id = auth.uid() OR
    department_id = public.auth_department_id()
  );

-- Any active member can log their own working hours
CREATE POLICY "working_hours_insert_self"
  ON public.working_hours FOR INSERT
  TO authenticated
  WITH CHECK (member_id = auth.uid() OR public.is_executive());

-- Verification: Department Heads (own dept) or Executives (all); Member can edit pending records
CREATE POLICY "working_hours_update_policy"
  ON public.working_hours FOR UPDATE
  TO authenticated
  USING (
    public.is_executive() OR
    (public.auth_hierarchy_role() IN ('Department Head', 'Department Co-Head') AND department_id = public.auth_department_id()) OR
    (member_id = auth.uid() AND status = 'Pending Verification')
  );

CREATE POLICY "working_hours_delete_policy"
  ON public.working_hours FOR DELETE
  TO authenticated
  USING (
    public.is_executive() OR
    (member_id = auth.uid() AND status = 'Pending Verification')
  );

-- 8.11. Announcements
CREATE POLICY "announcements_select_policy"
  ON public.announcements FOR SELECT
  TO authenticated
  USING (
    audience = 'All Members' OR
    target_department_id IS NULL OR
    target_department_id = public.auth_department_id() OR
    public.is_executive() OR
    public.is_faculty()
  );

-- Executives can post club-wide or department; Department Leads can post only to their department
CREATE POLICY "announcements_insert_policy"
  ON public.announcements FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_executive() OR
    (
      public.auth_hierarchy_role() IN ('Department Head', 'Department Co-Head') AND
      audience = 'Specific Department' AND
      target_department_id = public.auth_department_id()
    )
  );

CREATE POLICY "announcements_update_policy"
  ON public.announcements FOR UPDATE
  TO authenticated
  USING (posted_by = auth.uid() OR public.is_executive());

CREATE POLICY "announcements_delete_policy"
  ON public.announcements FOR DELETE
  TO authenticated
  USING (posted_by = auth.uid() OR public.is_executive());

-- 8.12. Notifications
CREATE POLICY "notifications_select_recipient"
  ON public.notifications FOR SELECT
  TO authenticated
  USING (recipient_id = auth.uid());

CREATE POLICY "notifications_update_recipient"
  ON public.notifications FOR UPDATE
  TO authenticated
  USING (recipient_id = auth.uid())
  WITH CHECK (recipient_id = auth.uid());

CREATE POLICY "notifications_insert_all"
  ON public.notifications FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- 8.13. Audit Activity Logs
CREATE POLICY "activity_logs_select_all"
  ON public.activity_logs FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "activity_logs_insert_authenticated"
  ON public.activity_logs FOR INSERT
  TO authenticated
  WITH CHECK (actor_id = auth.uid());

-- ==============================================================================
-- 9. INITIAL BASELINE SEED (OPTIONAL CONDITIONAL SEED FOR FIRST TIME RUN)
-- ==============================================================================
INSERT INTO public.club_settings (name, description, academic_year, contact_email, brand_tag)
SELECT 'ACM Student Chapter', 'Centralized platform for managing college clubs, members, departments, tasks, events, and attendance.', 'Academic Year 2026-27', 'contact@acmcampus.edu', 'ACM'
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
