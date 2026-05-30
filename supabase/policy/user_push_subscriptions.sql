create policy "allow_user_own_subscriptions"
  on public.user_push_subscriptions
  for all
  using (auth.uid() = user_id);
