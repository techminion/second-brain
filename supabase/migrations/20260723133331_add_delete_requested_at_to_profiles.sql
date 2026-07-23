-- Records when a user requested account deletion. The grace period (30 days)
-- elapses before the retention purge worker calls auth.admin.deleteUser, which
-- cascades to profiles and all owned rows (ADR-14). Until then the account is
-- restorable by clearing this column via support or a future cancel-deletion
-- endpoint.
alter table public.profiles
  add column delete_requested_at timestamptz;
