-- Knowledge base for the AI support assistant (Supabase / pgvector).
-- voyage-3.5 returns 1024-dimensional embeddings; change vector(N) if you
-- switch the embedding model.

create extension if not exists vector;

create table if not exists kb_qa (
  id          bigint generated always as identity primary key,
  topic_id    bigint,
  question    text not null,
  answer      text not null,
  embedding   vector(1024) not null,
  created_at  timestamptz not null default now()
);

-- Approximate nearest-neighbour index over cosine distance.
create index if not exists kb_qa_embedding_idx
  on kb_qa using hnsw (embedding vector_cosine_ops);

-- Returns the top-k Q&A pairs above a cosine-similarity threshold.
create or replace function match_kb(
  query_embedding vector(1024),
  match_count     int,
  match_threshold float
)
returns table (question text, answer text, similarity float)
language sql stable
as $$
  select
    kb_qa.question,
    kb_qa.answer,
    1 - (kb_qa.embedding <=> query_embedding) as similarity
  from kb_qa
  where 1 - (kb_qa.embedding <=> query_embedding) > match_threshold
  order by kb_qa.embedding <=> query_embedding
  limit match_count;
$$;
