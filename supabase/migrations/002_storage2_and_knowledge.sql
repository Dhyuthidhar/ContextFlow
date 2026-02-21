-- Table: patterns
CREATE TABLE IF NOT EXISTS patterns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    category TEXT NOT NULL,
    outcome TEXT CHECK (outcome IN ('successful', 'failed', 'mixed')),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: decisions
CREATE TABLE IF NOT EXISTS decisions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    question TEXT NOT NULL,
    chosen_option TEXT NOT NULL,
    alternatives TEXT[],
    reasoning TEXT,
    tradeoffs TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: principles
CREATE TABLE IF NOT EXISTS principles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('pattern', 'decision_framework', 'lesson', 'error_solution')),
    category TEXT NOT NULL,
    source TEXT NOT NULL DEFAULT 'generic' CHECK (source IN ('generic', 'user_derived')),
    confidence_score DECIMAL(3,2) DEFAULT 0.50 CHECK (confidence_score BETWEEN 0.0 AND 1.0),
    times_applied INTEGER DEFAULT 0,
    times_failed INTEGER DEFAULT 0,
    production_months INTEGER DEFAULT 0,
    reasoning TEXT,
    tradeoffs TEXT,
    when_to_use TEXT,
    when_not_to_use TEXT,
    source_projects UUID[],
    embedding VECTOR(1536),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: principle_evidence
CREATE TABLE IF NOT EXISTS principle_evidence (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    principle_id UUID NOT NULL REFERENCES principles(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    outcome TEXT CHECK (outcome IN ('success', 'failure', 'mixed')),
    notes TEXT,
    recorded_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: analysis_jobs
CREATE TABLE IF NOT EXISTS analysis_jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed')),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    principles_created INTEGER DEFAULT 0,
    principles_updated INTEGER DEFAULT 0,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
