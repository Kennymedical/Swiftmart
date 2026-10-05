-- Allow authenticated users (vendors) to insert new categories
create policy "authenticated users can insert categories" on categories
  for insert with check (auth.role() = 'authenticated');
