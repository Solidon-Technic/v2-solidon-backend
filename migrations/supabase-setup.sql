-- Run this SQL in your Supabase SQL Editor to set up pgvector for RAG

-- 1. Enable pgvector extension
create extension if not exists vector;

-- 2. Create the rag_chunk table with vector column
-- Note: This is managed separately from Medusa's migrations since it uses pgvector
create table if not exists rag_chunk (
    id uuid primary key default gen_random_uuid(),
    document_id text not null,
    content text not null,
    embedding vector(1536), -- text-embedding-3-small dimension
    scope text not null default 'org',
    chunk_index integer not null,
    metadata jsonb,
    created_at timestamptz default now()
);

-- 3. Create an index for faster vector similarity search
create index if not exists rag_chunk_embedding_idx 
on rag_chunk 
using ivfflat (embedding vector_cosine_ops)
with (lists = 100);

-- 4. Create index on scope for filtering
create index if not exists rag_chunk_scope_idx on rag_chunk(scope);

-- 5. Create index on document_id for deletion
create index if not exists rag_chunk_document_id_idx on rag_chunk(document_id);

-- 6. Create the similarity search function
create or replace function match_rag_chunks(
    query_embedding vector(1536),
    match_threshold float,
    match_count int,
    filter_scope text default 'org'
)
returns table (
    id uuid,
    document_id text,
    content text,
    similarity float,
    metadata jsonb
)
language sql stable
as $$
    select
        rag_chunk.id,
        rag_chunk.document_id,
        rag_chunk.content,
        1 - (rag_chunk.embedding <=> query_embedding) as similarity,
        rag_chunk.metadata
    from rag_chunk
    where 
        rag_chunk.scope = filter_scope
        and 1 - (rag_chunk.embedding <=> query_embedding) > match_threshold
    order by rag_chunk.embedding <=> query_embedding
    limit match_count;
$$;

-- 7. Create the rag_document table for tracking uploaded documents
create table if not exists rag_document (
    id uuid primary key default gen_random_uuid(),
    filename text not null,
    storage_key text not null,
    mime_type text not null,
    status text not null default 'pending',
    error_message text,
    uploaded_by text,
    metadata jsonb,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

-- 8. Create index on status for filtering
create index if not exists rag_document_status_idx on rag_document(status);
