-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS vector;

-- Table: users
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO users (id, email) VALUES
    ('123e4567-e89b-12d3-a456-426614174000', 'dev@contextflow.app');

-- Table: projects
CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    project_type TEXT CHECK (project_type IN ('web_app', 'mobile', 'saas', 'api', 'library', 'other')),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('planning', 'active', 'completed', 'archived')),
    tech_stack TEXT,
    start_date TIMESTAMPTZ,
    end_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: documents
CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    filename TEXT NOT NULL,
    file_type TEXT NOT NULL CHECK (file_type IN ('pdf', 'md', 'txt')),
    doc_category TEXT CHECK (doc_category IN ('prd', 'brd', 'architecture', 'chat', 'other')),
    storage_path TEXT NOT NULL,
    file_size INTEGER,
    analyzed BOOLEAN DEFAULT FALSE,
    analyzed_at TIMESTAMPTZ,
    upload_date TIMESTAMPTZ DEFAULT NOW()
);

-- Table: document_chunks
CREATE TABLE document_chunks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    chunk_index INTEGER NOT NULL,
    content TEXT NOT NULL,
    token_count INTEGER,
    chunk_type TEXT CHECK (chunk_type IN ('header', 'paragraph', 'code', 'list')),
    section_title TEXT,
    embedding VECTOR(1536),
    created_at TIMESTAMPTZ DEFAULT NOW()
);
