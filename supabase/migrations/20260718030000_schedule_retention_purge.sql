create extension if not exists pg_cron with schema pg_catalog;

create extension if not exists pg_net with schema extensions;

create or replace function public.invoke_retention_purge_worker()
returns void
language plpgsql
security definer
set search_path = public, extensions, vault, pg_catalog
as $$
declare
  purge_url text;
  purge_secret text;
begin
  select decrypted_secret
  into purge_url
  from vault.decrypted_secrets
  where name = 'retention_purge_url';

  select decrypted_secret
  into purge_secret
  from vault.decrypted_secrets
  where name = 'retention_purge_secret';

  if purge_url is null
    or btrim(purge_url) = ''
    or purge_secret is null
    or btrim(purge_secret) = ''
  then
    return;
  end if;

  perform net.http_post(
    url := purge_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-webhook-secret', purge_secret
    ),
    body := '{}'::jsonb
  );
end;
$$;

revoke all on function public.invoke_retention_purge_worker() from public;
revoke all on function public.invoke_retention_purge_worker() from anon, authenticated;

select cron.schedule(
  'retention-purge-daily',
  '0 3 * * *',
  $$ select public.invoke_retention_purge_worker(); $$
);
