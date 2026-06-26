-- Ensure UPDATE is permitted on utm_history for the tracked migration lineage.
--
-- Context: the remote project was provisioned manually with a single
-- consolidated policy ("users manage own utm_history", FOR ALL) that already
-- permits UPDATE. The tracked migrations, however, define granular
-- select/insert/delete policies with no UPDATE policy — so a database
-- provisioned purely from these files (e.g. a future dev/prod split) would
-- block the URL Library edit feature. This migration adds the missing granular
-- UPDATE policy so the tracked lineage matches the effective permissions already
-- live on remote. Idempotent and safe to re-run.

drop policy if exists "users can update own utm_history" on public.utm_history;

create policy "users can update own utm_history"
  on public.utm_history for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
