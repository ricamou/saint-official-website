-- SAINT Sanctuary access-state repair
-- Run once in Supabase SQL Editor after deploying v7.4.3.1.

update public.sanctuary_holders
set
  sanctuary_access = (saint_balance >= minimum_required),
  holder_level = case
    when saint_balance >= minimum_required then 'sanctuary_member'
    else 'almost_there'
  end
where ownership_verified = true;
