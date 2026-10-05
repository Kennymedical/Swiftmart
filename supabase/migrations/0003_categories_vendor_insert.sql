-- 1. Remove previous permissive insert policy
drop policy if exists "authenticated users can insert categories" on categories;
drop policy if exists "vendors can insert categories" on categories;

-- 2. Restrict category creation strictly to vendors and admins
create policy "vendors can insert categories" on categories
  for insert with check (
    auth.uid() is not null
    and (
      exists (
        select 1 from public.vendors
        where vendors.user_id = auth.uid()
      )
      or
      exists (
        select 1 from public.profiles
        where profiles.id = auth.uid()
          and profiles.role in ('admin', 'vendor')
      )
    )
  );
