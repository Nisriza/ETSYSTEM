-- Phase 7: remove a broken Supabase Auth trigger that blocks Google sign-up.
--
-- Root cause of "Database error saving new user.":
--   A trigger `on_auth_user_created` on auth.users calls handle_new_user(),
--   which inserts into `public.profiles` — a table that does not exist in this
--   project (the app uses public.Users). Every Google sign-up therefore failed
--   inside Supabase Auth before the app was ever called.
--
-- This trigger is not part of the app schema (supabase_schema.sql); it came
-- from a Supabase template/tutorial. The app creates the Users row itself in
-- POST /api/auth/supabase, so nothing is lost by removing it.

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Verify: should return 0 rows.
SELECT t.tgname AS trigger_name
FROM pg_trigger t
JOIN pg_class c ON c.oid = t.tgrelid
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'auth' AND c.relname = 'users' AND NOT t.tgisinternal;
