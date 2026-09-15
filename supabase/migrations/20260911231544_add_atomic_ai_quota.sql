create or replace function public.consume_ai_quota(
  p_user_id uuid,
  p_daily_limit integer default 5,
  p_monthly_limit integer default 50
)
returns table (
  allowed boolean,
  daily_used integer,
  monthly_used integer,
  daily_limit integer,
  monthly_limit integer,
  retry_after timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  today date := current_date;
  month_start date := date_trunc('month', current_date)::date;
  today_used integer;
  month_used integer;
  next_retry timestamptz;
begin
  if p_user_id is null or p_daily_limit < 1 or p_monthly_limit < 1 then
    raise exception 'Invalid quota arguments';
  end if;
  insert into public.usage_counters (user_id, period, ai_cases, tokens)
  values (p_user_id, today, 0, 0)
  on conflict (user_id, period) do nothing;
  select ai_cases into today_used from public.usage_counters where user_id = p_user_id and period = today for update;
  select coalesce(sum(ai_cases), 0)::integer into month_used from public.usage_counters where user_id = p_user_id and period >= month_start;
  if today_used >= p_daily_limit or month_used >= p_monthly_limit then
    next_retry := case when today_used >= p_daily_limit then (today + 1)::timestamptz else (month_start + interval '1 month')::timestamptz end;
    return query select false, today_used, month_used, p_daily_limit, p_monthly_limit, next_retry;
    return;
  end if;
  update public.usage_counters set ai_cases = ai_cases + 1 where user_id = p_user_id and period = today;
  return query select true, today_used + 1, month_used + 1, p_daily_limit, p_monthly_limit, null::timestamptz;
end;
$$;
revoke all on function public.consume_ai_quota(uuid, integer, integer) from public, anon, authenticated;
grant execute on function public.consume_ai_quota(uuid, integer, integer) to service_role
