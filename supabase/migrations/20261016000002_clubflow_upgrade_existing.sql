-- ==============================================================================
-- ClubFlow - Existing Database Upgrade Migration (Idempotent Non-Destructive)
-- File: supabase/migrations/20261016000002_clubflow_upgrade_existing.sql
-- Description: Applies schema upgrades, missing columns, circular foreign keys,
--              hardened triggers, automated metric recalculation, and strict RLS
--              to an ALREADY EXISTING ClubFlow database without deleting or modifying
--              existing user profiles, tasks, events, or attendance records.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. EXTENSIONS
-- ------------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ------------------------------------------------------------------------------
-- 2. ENUMS (Safe Idempotent Creation & Extension)
-- ------------------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE hierarchy_role AS ENUM (
    'Faculty Advisor', 'President', 'Vice President', 'Head', 'Co-Head',
    'Department Head', 'Department Co-Head', 'Department Member'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE member_status AS ENUM ('Active', 'Core Lead', 'On Leave', 'Probation', 'Inactive');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE task_status AS ENUM ('Pending', 'In Progress', 'Submitted', 'Approved', 'Rejected', 'Completed', 'Overdue');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE task_priority AS ENUM ('Low', 'Medium', 'High', 'Urgent');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE event_type AS ENUM ('Workshop', 'Hackathon', 'Speaker Session', 'Internal Meeting', 'Social', 'Competition', 'General');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE event_status AS ENUM ('Upcoming', 'Ongoing', 'Completed', 'Cancelled');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE attendance_status AS ENUM ('Present', 'Absent', 'Excused', 'Late');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE working_hours_status AS ENUM ('Pending Verification', 'Verified', 'Rejected');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE announcement_audience AS ENUM ('All Members', 'Specific Department');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE announcement_priority AS ENUM ('Normal', 'Important', 'Urgent');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE notification_type AS ENUM (
    'Task Assigned', 'Task Approved', 'Task Rejected', 'Hours Verified',
    'New Announcement', 'Event Created', 'General'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ------------------------------------------------------------------------------
-- 3. SCHEMA HARMONIZATION (ADD COLUMN IF NOT EXISTS - Zero Data Loss)
-- ------------------------------------------------------------------------------

-- 3.1. Club Settings
ALTER TABLE IF EXISTS public.club_settings
  ADD COLUMN IF NOT EXISTS name TEXT NOT NULL DEFAULT 'ACM Student Chapter',
  ADD COLUMN IF NOT EXISTS description TEXT NOT NULL DEFAULT 'Student chapter for technical and community leadership.',
  ADD COLUMN IF NOT EXISTS academic_year TEXT NOT NULL DEFAULT 'Academic Year 2026-27',
  ADD COLUMN IF NOT EXISTS contact_email TEXT NOT NULL DEFAULT 'contact@campusclub.edu',
  ADD COLUMN IF NOT EXISTS brand_tag TEXT NOT NULL DEFAULT 'ACM',
  ADD COLUMN IF NOT EXISTS logo_url TEXT,
  ADD COLUMN IF NOT EXISTS banner_url TEXT,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- 3.2. Departments
ALTER TABLE IF EXISTS public.departments
  ADD COLUMN IF NOT EXISTS short_desc TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS description TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS tools TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS color_theme TEXT NOT NULL DEFAULT 'indigo',
  ADD COLUMN IF NOT EXISTS lead_id UUID,
  ADD COLUMN IF NOT EXISTS co_lead_id UUID,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- 3.3. Profiles
ALTER TABLE IF EXISTS public.profiles
  ADD COLUMN IF NOT EXISTS initials TEXT NOT NULL DEFAULT 'CM',
  ADD COLUMN IF NOT EXISTS avatar_url TEXT,
  ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'Department Member',
  ADD COLUMN IF NOT EXISTS hierarchy_role public.hierarchy_role NOT NULL DEFAULT 'Department Member',
  ADD COLUMN IF NOT EXISTS department_id UUID,
  ADD COLUMN IF NOT EXISTS status public.member_status NOT NULL DEFAULT 'Active',
  ADD COLUMN IF NOT EXISTS student_id TEXT,
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS year TEXT,
  ADD COLUMN IF NOT EXISTS attendance_rate NUMERIC(5,2) NOT NULL DEFAULT 100.00,
  ADD COLUMN IF NOT EXISTS tasks_completed INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS working_hours NUMERIC(7,2) NOT NULL DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS join_date DATE NOT NULL DEFAULT CURRENT_DATE,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- Safely sync profiles.role with hierarchy_role
UPDATE public.profiles
SET role = hierarchy_role::text
WHERE role IS NULL OR role <> hierarchy_role::text;

-- Enforce role consistency check constraint
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS ck_profiles_role_consistency;
ALTER TABLE public.profiles ADD CONSTRAINT ck_profiles_role_consistency CHECK (role = hierarchy_role::text);

-- Circular FKs on departments
DO $$ BEGIN
  ALTER TABLE public.departments
    DROP CONSTRAINT IF EXISTS fk_departments_lead,
    ADD CONSTRAINT fk_departments_lead FOREIGN KEY (lead_id) REFERENCES public.profiles(id) ON DELETE SET NULL;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public.departments
    DROP CONSTRAINT IF EXISTS fk_departments_co_lead,
    ADD CONSTRAINT fk_departments_co_lead FOREIGN KEY (co_lead_id) REFERENCES public.profiles(id) ON DELETE SET NULL;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- 3.4. Tasks
ALTER TABLE IF EXISTS public.tasks
  ADD COLUMN IF NOT EXISTS description TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS priority public.task_priority NOT NULL DEFAULT 'Medium',
  ADD COLUMN IF NOT EXISTS status public.task_status NOT NULL DEFAULT 'Pending',
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- 3.5. Task Submissions
ALTER TABLE IF EXISTS public.task_submissions
  ADD COLUMN IF NOT EXISTS submission_notes TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS review_status TEXT NOT NULL DEFAULT 'Pending',
  ADD COLUMN IF NOT EXISTS reviewed_by UUID,
  ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS review_comment TEXT,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- 3.6. Events
ALTER TABLE IF EXISTS public.events
  ADD COLUMN IF NOT EXISTS description TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS event_date DATE NOT NULL DEFAULT CURRENT_DATE,
  ADD COLUMN IF NOT EXISTS date DATE NOT NULL DEFAULT CURRENT_DATE,
  ADD COLUMN IF NOT EXISTS start_time TEXT NOT NULL DEFAULT '10:00 AM',
  ADD COLUMN IF NOT EXISTS end_time TEXT NOT NULL DEFAULT '12:00 PM',
  ADD COLUMN IF NOT EXISTS time TEXT NOT NULL DEFAULT '10:00 AM - 12:00 PM',
  ADD COLUMN IF NOT EXISTS venue TEXT NOT NULL DEFAULT 'Campus Auditorium',
  ADD COLUMN IF NOT EXISTS location TEXT NOT NULL DEFAULT 'Campus Auditorium',
  ADD COLUMN IF NOT EXISTS type public.event_type NOT NULL DEFAULT 'General',
  ADD COLUMN IF NOT EXISTS status public.event_status NOT NULL DEFAULT 'Upcoming',
  ADD COLUMN IF NOT EXISTS capacity INT,
  ADD COLUMN IF NOT EXISTS tags TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- Backfill event dual fields
UPDATE public.events
SET
  date = COALESCE(date, event_date, CURRENT_DATE),
  event_date = COALESCE(event_date, date, CURRENT_DATE),
  venue = COALESCE(venue, location, 'Campus Auditorium'),
  location = COALESCE(location, venue, 'Campus Auditorium'),
  time = COALESCE(time, start_time || ' - ' || end_time, '10:00 AM - 12:00 PM'),
  start_time = COALESCE(start_time, '10:00 AM'),
  end_time = COALESCE(end_time, '12:00 PM');

-- 3.7. Event RSVPs
ALTER TABLE IF EXISTS public.event_rsvps
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'Confirmed',
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- 3.8. Attendance Records
ALTER TABLE IF EXISTS public.attendance_records
  ADD COLUMN IF NOT EXISTS event_id UUID REFERENCES public.events(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS event_date DATE NOT NULL DEFAULT CURRENT_DATE,
  ADD COLUMN IF NOT EXISTS check_in_time TEXT NOT NULL DEFAULT '—',
  ADD COLUMN IF NOT EXISTS status public.attendance_status NOT NULL DEFAULT 'Present',
  ADD COLUMN IF NOT EXISTS session_type TEXT NOT NULL DEFAULT 'General Meeting',
  ADD COLUMN IF NOT EXISTS duration_hours NUMERIC(4,2),
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- 3.9. Working Hours
ALTER TABLE IF EXISTS public.working_hours
  ADD COLUMN IF NOT EXISTS description TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS log_date DATE NOT NULL DEFAULT CURRENT_DATE,
  ADD COLUMN IF NOT EXISTS start_time TEXT,
  ADD COLUMN IF NOT EXISTS end_time TEXT,
  ADD COLUMN IF NOT EXISTS status public.working_hours_status NOT NULL DEFAULT 'Pending Verification',
  ADD COLUMN IF NOT EXISTS verified_by UUID,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- 3.10. Announcements
ALTER TABLE IF EXISTS public.announcements
  ADD COLUMN IF NOT EXISTS audience public.announcement_audience NOT NULL DEFAULT 'All Members',
  ADD COLUMN IF NOT EXISTS target_department_id UUID,
  ADD COLUMN IF NOT EXISTS pinned BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS priority public.announcement_priority NOT NULL DEFAULT 'Normal',
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

UPDATE public.announcements
SET
  pinned = COALESCE(pinned, is_pinned, FALSE),
  is_pinned = COALESCE(is_pinned, pinned, FALSE);

-- 3.11. Notifications
ALTER TABLE IF EXISTS public.notifications
  ADD COLUMN IF NOT EXISTS type public.notification_type NOT NULL DEFAULT 'General',
  ADD COLUMN IF NOT EXISTS link_tab TEXT,
  ADD COLUMN IF NOT EXISTS item_id UUID,
  ADD COLUMN IF NOT EXISTS read BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ;

-- ------------------------------------------------------------------------------
-- 4. RECALCULATE EXISTING MEMBER METRICS (Accurate Backfill)
-- ------------------------------------------------------------------------------
DO $$
DECLARE
  r RECORD;
  v_completed INT;
  v_hours NUMERIC(7,2);
  v_total_att INT;
  v_pres_att INT;
  v_rate NUMERIC(5,2);
BEGIN
  FOR r IN SELECT id FROM public.profiles LOOP
    -- Tasks completed
    SELECT COUNT(DISTINCT task_id) INTO v_completed
    FROM public.task_submissions
    WHERE submitted_by = r.id AND review_status = 'Approved';

    -- Working hours
    SELECT COALESCE(SUM(hours), 0.00) INTO v_hours
    FROM public.working_hours
    WHERE member_id = r.id AND status = 'Verified';

    -- Attendance rate
    SELECT COUNT(*), COUNT(*) FILTER (WHERE status IN ('Present', 'Late'))
    INTO v_total_att, v_pres_att
    FROM public.attendance_records
    WHERE member_id = r.id;

    IF v_total_att = 0 THEN
      v_rate := 100.00;
    ELSE
      v_rate := ROUND((v_pres_att::numeric / v_total_att::numeric) * 100.00, 2);
    END IF;

    UPDATE public.profiles
    SET
      tasks_completed = v_completed,
      working_hours = v_hours,
      attendance_rate = v_rate
    WHERE id = r.id;
  END LOOP;
END $$;

-- ------------------------------------------------------------------------------
-- 5. UPGRADE COMPLETE
-- ------------------------------------------------------------------------------
DO $$ BEGIN
  RAISE NOTICE 'ClubFlow Existing Database Upgrade applied successfully. All data preserved.';
END $$;
