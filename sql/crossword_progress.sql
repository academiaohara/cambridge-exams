-- ═══════════════════════════════════════════════════════════════
-- TABLE: crossword_progress
-- Run this in the Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════

create table if not exists public.crossword_progress (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references auth.users(id) on delete cascade,

  crossword_id        text not null,
  level               text not null,
  cw_index            integer not null default 0,

  completed           boolean not null default false,
  words_correct       integer not null default 0,
  words_total         integer not null default 0,
  progress_pct        integer not null default 0,

  hints_used          integer not null default 0,
  time_spent_seconds  integer not null default 0,
  cell_state          jsonb default '{}'::jsonb,

  last_played         timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),

  unique (user_id, crossword_id)
);

create index if not exists idx_cw_progress_user
  on public.crossword_progress (user_id);

create index if not exists idx_cw_progress_user_level
  on public.crossword_progress (user_id, level);

create index if not exists idx_cw_progress_last_played
  on public.crossword_progress (user_id, last_played desc);

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_cw_progress_updated_at on public.crossword_progress;
create trigger trg_cw_progress_updated_at
  before update on public.crossword_progress
  for each row execute function public.set_updated_at();

alter table public.crossword_progress enable row level security;

drop policy if exists "Users can read own crossword progress" on public.crossword_progress;
create policy "Users can read own crossword progress"
  on public.crossword_progress for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own crossword progress" on public.crossword_progress;
create policy "Users can insert own crossword progress"
  on public.crossword_progress for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own crossword progress" on public.crossword_progress;
create policy "Users can update own crossword progress"
  on public.crossword_progress for update
  using (auth.uid() = user_id);
