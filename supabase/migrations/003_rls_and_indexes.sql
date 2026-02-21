-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE principles ENABLE ROW LEVEL SECURITY;
ALTER TABLE principle_evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE analysis_jobs ENABLE ROW LEVEL SECURITY;

-- RLS: users
CREATE POLICY users_select ON users FOR SELECT USING (id = '123e4567-e89b-12d3-a456-426614174000');
CREATE POLICY users_insert ON users FOR INSERT WITH CHECK (id = '123e4567-e89b-12d3-a456-426614174000');
CREATE POLICY users_update ON users FOR UPDATE USING (id = '123e4567-e89b-12d3-a456-426614174000');
CREATE POLICY users_delete ON users FOR DELETE USING (id = '123e4567-e89b-12d3-a456-426614174000');

-- RLS: projects
CREATE POLICY projects_select ON projects FOR SELECT USING (user_id = '123e4567-e89b-12d3-a456-426614174000');
CREATE POLICY projects_insert ON projects FOR INSERT WITH CHECK (user_id = '123e4567-e89b-12d3-a456-426614174000');
CREATE POLICY projects_update ON projects FOR UPDATE USING (user_id = '123e4567-e89b-12d3-a456-426614174000');
CREATE POLICY projects_delete ON projects FOR DELETE USING (user_id = '123e4567-e89b-12d3-a456-426614174000');

-- RLS: documents
CREATE POLICY documents_select ON documents FOR SELECT USING (
    project_id IN (SELECT id FROM projects WHERE user_id = '123e4567-e89b-12d3-a456-426614174000')
);
CREATE POLICY documents_insert ON documents FOR INSERT WITH CHECK (
    project_id IN (SELECT id FROM projects WHERE user_id = '123e4567-e89b-12d3-a456-426614174000')
);
CREATE POLICY documents_update ON documents FOR UPDATE USING (
    project_id IN (SELECT id FROM projects WHERE user_id = '123e4567-e89b-12d3-a456-426614174000')
);
CREATE POLICY documents_delete ON documents FOR DELETE USING (
    project_id IN (SELECT id FROM projects WHERE user_id = '123e4567-e89b-12d3-a456-426614174000')
);

-- RLS: document_chunks
CREATE POLICY document_chunks_select ON document_chunks FOR SELECT USING (
    document_id IN (
        SELECT d.id FROM documents d
        JOIN projects p ON d.project_id = p.id
        WHERE p.user_id = '123e4567-e89b-12d3-a456-426614174000'
    )
);
CREATE POLICY document_chunks_insert ON document_chunks FOR INSERT WITH CHECK (
    document_id IN (
        SELECT d.id FROM documents d
        JOIN projects p ON d.project_id = p.id
        WHERE p.user_id = '123e4567-e89b-12d3-a456-426614174000'
    )
);
CREATE POLICY document_chunks_update ON document_chunks FOR UPDATE USING (
    document_id IN (
        SELECT d.id FROM documents d
        JOIN projects p ON d.project_id = p.id
        WHERE p.user_id = '123e4567-e89b-12d3-a456-426614174000'
    )
);
CREATE POLICY document_chunks_delete ON document_chunks FOR DELETE USING (
    document_id IN (
        SELECT d.id FROM documents d
        JOIN projects p ON d.project_id = p.id
        WHERE p.user_id = '123e4567-e89b-12d3-a456-426614174000'
    )
);

-- RLS: patterns
CREATE POLICY patterns_select ON patterns FOR SELECT USING (
    project_id IN (SELECT id FROM projects WHERE user_id = '123e4567-e89b-12d3-a456-426614174000')
);
CREATE POLICY patterns_insert ON patterns FOR INSERT WITH CHECK (
    project_id IN (SELECT id FROM projects WHERE user_id = '123e4567-e89b-12d3-a456-426614174000')
);
CREATE POLICY patterns_update ON patterns FOR UPDATE USING (
    project_id IN (SELECT id FROM projects WHERE user_id = '123e4567-e89b-12d3-a456-426614174000')
);
CREATE POLICY patterns_delete ON patterns FOR DELETE USING (
    project_id IN (SELECT id FROM projects WHERE user_id = '123e4567-e89b-12d3-a456-426614174000')
);

-- RLS: decisions
CREATE POLICY decisions_select ON decisions FOR SELECT USING (
    project_id IN (SELECT id FROM projects WHERE user_id = '123e4567-e89b-12d3-a456-426614174000')
);
CREATE POLICY decisions_insert ON decisions FOR INSERT WITH CHECK (
    project_id IN (SELECT id FROM projects WHERE user_id = '123e4567-e89b-12d3-a456-426614174000')
);
CREATE POLICY decisions_update ON decisions FOR UPDATE USING (
    project_id IN (SELECT id FROM projects WHERE user_id = '123e4567-e89b-12d3-a456-426614174000')
);
CREATE POLICY decisions_delete ON decisions FOR DELETE USING (
    project_id IN (SELECT id FROM projects WHERE user_id = '123e4567-e89b-12d3-a456-426614174000')
);

-- RLS: principles
CREATE POLICY principles_select ON principles FOR SELECT USING (
    source = 'generic' OR user_id = '123e4567-e89b-12d3-a456-426614174000'
);
CREATE POLICY principles_insert ON principles FOR INSERT WITH CHECK (
    user_id = '123e4567-e89b-12d3-a456-426614174000'
);
CREATE POLICY principles_update ON principles FOR UPDATE USING (
    user_id = '123e4567-e89b-12d3-a456-426614174000'
);
CREATE POLICY principles_delete ON principles FOR DELETE USING (
    user_id = '123e4567-e89b-12d3-a456-426614174000'
);

-- RLS: principle_evidence
CREATE POLICY principle_evidence_select ON principle_evidence FOR SELECT USING (
    principle_id IN (
        SELECT id FROM principles
        WHERE user_id = '123e4567-e89b-12d3-a456-426614174000' OR source = 'generic'
    )
);
CREATE POLICY principle_evidence_insert ON principle_evidence FOR INSERT WITH CHECK (
    principle_id IN (
        SELECT id FROM principles
        WHERE user_id = '123e4567-e89b-12d3-a456-426614174000' OR source = 'generic'
    )
);
CREATE POLICY principle_evidence_update ON principle_evidence FOR UPDATE USING (
    principle_id IN (
        SELECT id FROM principles
        WHERE user_id = '123e4567-e89b-12d3-a456-426614174000' OR source = 'generic'
    )
);
CREATE POLICY principle_evidence_delete ON principle_evidence FOR DELETE USING (
    principle_id IN (
        SELECT id FROM principles
        WHERE user_id = '123e4567-e89b-12d3-a456-426614174000' OR source = 'generic'
    )
);

-- RLS: analysis_jobs
CREATE POLICY analysis_jobs_select ON analysis_jobs FOR SELECT USING (
    document_id IN (
        SELECT d.id FROM documents d
        JOIN projects p ON d.project_id = p.id
        WHERE p.user_id = '123e4567-e89b-12d3-a456-426614174000'
    )
);
CREATE POLICY analysis_jobs_insert ON analysis_jobs FOR INSERT WITH CHECK (
    document_id IN (
        SELECT d.id FROM documents d
        JOIN projects p ON d.project_id = p.id
        WHERE p.user_id = '123e4567-e89b-12d3-a456-426614174000'
    )
);
CREATE POLICY analysis_jobs_update ON analysis_jobs FOR UPDATE USING (
    document_id IN (
        SELECT d.id FROM documents d
        JOIN projects p ON d.project_id = p.id
        WHERE p.user_id = '123e4567-e89b-12d3-a456-426614174000'
    )
);
CREATE POLICY analysis_jobs_delete ON analysis_jobs FOR DELETE USING (
    document_id IN (
        SELECT d.id FROM documents d
        JOIN projects p ON d.project_id = p.id
        WHERE p.user_id = '123e4567-e89b-12d3-a456-426614174000'
    )
);

-- B-tree indexes
CREATE INDEX idx_projects_user_id ON projects(user_id);
CREATE INDEX idx_documents_project_id ON documents(project_id);
CREATE INDEX idx_documents_project_id_doc_category ON documents(project_id, doc_category);
CREATE INDEX idx_document_chunks_document_id ON document_chunks(document_id);
CREATE INDEX idx_patterns_project_id_category ON patterns(project_id, category);
CREATE INDEX idx_decisions_project_id ON decisions(project_id);
CREATE INDEX idx_principles_category_source ON principles(category, source);
CREATE INDEX idx_principles_confidence_score ON principles(confidence_score DESC);
CREATE INDEX idx_principle_evidence_principle_id ON principle_evidence(principle_id);
CREATE INDEX idx_principle_evidence_project_id ON principle_evidence(project_id);
CREATE INDEX idx_analysis_jobs_document_id_status ON analysis_jobs(document_id, status);

-- IVFFlat vector indexes
CREATE INDEX idx_document_chunks_embedding ON document_chunks USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
CREATE INDEX idx_principles_embedding ON principles USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
