-- Drop existing functions to allow return type changes
DROP FUNCTION IF EXISTS search_document_chunks(vector, uuid, uuid, int);
DROP FUNCTION IF EXISTS search_principles(vector, uuid, double precision, text, integer);

-- Function: search_document_chunks
CREATE OR REPLACE FUNCTION search_document_chunks(
    query_embedding vector(1536),
    user_id_filter uuid,
    project_id_filter uuid DEFAULT NULL,
    match_count int DEFAULT 10
)
RETURNS TABLE (
    id uuid,
    content text,
    chunk_type text,
    section_title text,
    chunk_index int,
    filename text,
    doc_category text,
    project_id uuid,
    project_name text,
    similarity float
)
LANGUAGE sql
STABLE
AS $$
    SELECT
        dc.id,
        dc.content,
        dc.chunk_type,
        dc.section_title,
        dc.chunk_index,
        d.filename,
        d.doc_category,
        p.id AS project_id,
        p.name AS project_name,
        1 - (dc.embedding <=> query_embedding) AS similarity
    FROM document_chunks dc
    JOIN documents d ON dc.document_id = d.id
    JOIN projects p ON d.project_id = p.id
    WHERE d.analyzed = true
      AND p.user_id = user_id_filter
      AND (project_id_filter IS NULL OR p.id = project_id_filter)
      AND dc.embedding IS NOT NULL
    ORDER BY dc.embedding <=> query_embedding
    LIMIT match_count;
$$;

-- Function: search_principles
CREATE OR REPLACE FUNCTION search_principles(
    query_embedding vector(1536),
    user_id_filter uuid,
    min_confidence float DEFAULT 0.5,
    category_filter text DEFAULT NULL,
    match_count int DEFAULT 5
)
RETURNS TABLE (
    id uuid,
    content text,
    type text,
    category text,
    source text,
    confidence_score decimal,
    times_applied int,
    when_to_use text,
    when_not_to_use text,
    reasoning text,
    tradeoffs text,
    similarity float
)
LANGUAGE sql
STABLE
AS $$
    SELECT
        p.id,
        p.content,
        p.type,
        p.category,
        p.source,
        p.confidence_score,
        p.times_applied,
        p.when_to_use,
        p.when_not_to_use,
        p.reasoning,
        p.tradeoffs,
        1 - (p.embedding <=> query_embedding) AS similarity
    FROM principles p
    WHERE (p.source = 'generic' OR p.user_id = user_id_filter)
      AND p.confidence_score >= min_confidence
      AND p.embedding IS NOT NULL
      AND (category_filter IS NULL OR p.category = category_filter)
    ORDER BY p.embedding <=> query_embedding
    LIMIT match_count;
$$;
