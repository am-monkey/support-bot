-- Knowledge base for the AI support assistant (Supabase / pgvector).
-- voyage-3.5 returns 1024-dimensional embeddings; change vector(N) if you
-- switch the embedding model.

-- On Supabase the extension lives in schema public (advisor WARN
-- extension_in_public). Kept there on purpose: moving it to `extensions`
-- would touch the vector(1024) column type and the <=> operator used by
-- match_kb, for no real security gain here. The table has RLS with no
-- policies, so the public API cannot reach the data.
create extension if not exists vector;

create table if not exists kb_qa (
  id          bigint generated always as identity primary key,
  topic_id    bigint,
  question    text not null,
  answer      text not null,
  embedding   vector(1024) not null,
  created_at  timestamptz not null default now()
);

-- RLS with no policies: anon/authenticated (public API keys) can neither read
-- nor write. The bot uses the service role, which bypasses RLS. match_kb runs
-- as the invoker, so it returns nothing to anon callers either.
alter table kb_qa enable row level security;

-- Supabase grants anon/authenticated full table privileges by default.
-- RLS blocks row access, but not TRUNCATE, so drop the grants entirely.
revoke all on table kb_qa from anon, authenticated;

-- Approximate nearest-neighbour index over cosine distance.
create index if not exists kb_qa_embedding_idx
  on kb_qa using hnsw (embedding vector_cosine_ops);

-- Returns the top-k Q&A pairs above a cosine-similarity threshold.
-- The nearest neighbours are taken first (ORDER BY distance LIMIT k, which
-- the HNSW index can serve) and the threshold is applied outside the
-- materialized CTE, as the pgvector README recommends. Same result as
-- filtering first, since similarity falls monotonically with distance.
-- search_path is pinned (advisor WARN function_search_path_mutable).
create or replace function match_kb(
  query_embedding vector(1024),
  match_count     int,
  match_threshold float
)
returns table (question text, answer text, similarity float)
language sql stable
set search_path = public, extensions
as $$
  with nearest as materialized (
    select
      kb_qa.question,
      kb_qa.answer,
      kb_qa.embedding <=> query_embedding as distance
    from kb_qa
    order by distance
    limit match_count
  )
  select nearest.question, nearest.answer, 1 - nearest.distance as similarity
  from nearest
  where 1 - nearest.distance > match_threshold
  order by nearest.distance;
$$;

-- Only the bot (service role) calls the RPC.
revoke execute on function match_kb(vector, integer, double precision)
  from public, anon, authenticated;
grant execute on function match_kb(vector, integer, double precision)
  to service_role;
