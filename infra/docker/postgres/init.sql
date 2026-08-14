-- Database initialization script for Joblane
-- Creates database and roles

-- Create database if not exists
SELECT 'CREATE DATABASE joblane' WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'joblane')\gexec

-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Create schema for core domains
CREATE SCHEMA IF NOT EXISTS auth;
CREATE SCHEMA IF NOT EXISTS users;
CREATE SCHEMA IF NOT EXISTS core;
CREATE SCHEMA IF NOT EXISTS candidates;
CREATE SCHEMA IF NOT EXISTS companies;
CREATE SCHEMA IF NOT EXISTS jobs;
CREATE SCHEMA IF NOT EXISTS applications;
CREATE SCHEMA IF NOT EXISTS ats;
CREATE SCHEMA IF NOT EXISTS interviews;
CREATE SCHEMA IF NOT EXISTS offers;
CREATE SCHEMA IF NOT EXISTS notifications;
CREATE SCHEMA IF NOT EXISTS files;
CREATE SCHEMA IF NOT EXISTS search;
CREATE SCHEMA IF NOT EXISTS billing;
CREATE SCHEMA IF NOT EXISTS moderation;
CREATE SCHEMA IF NOT EXISTS analytics;

-- Create audit log table in core schema
CREATE TABLE IF NOT EXISTS core.audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    actor_id UUID,
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(100) NOT NULL,
    resource_id UUID,
    company_id UUID,
    metadata JSONB,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create enum types
CREATE TYPE core.user_status AS ENUM ('active', 'pending_verification', 'suspended', 'blocked', 'deleted');
CREATE TYPE core.company_status AS ENUM ('UNVERIFIED', 'PENDING', 'VERIFIED', 'REJECTED', 'SUSPENDED');
CREATE TYPE core.company_role AS ENUM ('OWNER', 'ADMIN', 'RECRUITER', 'HIRING_MANAGER', 'VIEWER');
CREATE TYPE jobs.employment_type AS ENUM ('FULL_TIME', 'PART_TIME', 'CONTRACT', 'FREELANCE', 'INTERNSHIP', 'TEMPORARY', 'SEASONAL');
CREATE TYPE jobs.work_mode AS ENUM ('ON_SITE', 'REMOTE', 'HYBRID');
CREATE TYPE jobs.job_status AS ENUM ('DRAFT', 'PENDING_REVIEW', 'PUBLISHED', 'PAUSED', 'EXPIRED', 'CLOSED', 'REJECTED', 'ARCHIVED');
CREATE TYPE applications.application_status AS ENUM ('APPLIED', 'SCREENING', 'SHORTLISTED', 'INTERVIEW', 'OFFER', 'HIRED', 'REJECTED', 'WITHDRAWN');
CREATE TYPE candidates.candidate_visibility AS ENUM ('PUBLIC', 'VERIFIED_EMPLOYERS', 'PRIVATE');
CREATE TYPE candidates.candidate_job_search_state AS ENUM ('ACTIVELY_LOOKING', 'OPEN_TO_OFFERS', 'NOT_LOOKING');

-- Create users table
CREATE TABLE IF NOT EXISTS users.users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    email_verified_at TIMESTAMP WITH TIME ZONE,
    password_hash VARCHAR(255) NOT NULL,
    status core.user_status DEFAULT 'active',
    last_login_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- Create user sessions table
CREATE TABLE IF NOT EXISTS auth.user_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users.users(id) ON DELETE CASCADE,
    session_token VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ip_address VARCHAR(45),
    user_agent TEXT
);

-- Create user identities table (for OAuth, etc.)
CREATE TABLE IF NOT EXISTS auth.user_identities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users.users(id) ON DELETE CASCADE,
    provider VARCHAR(50) NOT NULL,
    provider_user_id VARCHAR(255) NOT NULL,
    access_token TEXT,
    refresh_token TEXT,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(provider, provider_user_id)
);

-- Create companies table
CREATE TABLE IF NOT EXISTS companies.companies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    description TEXT,
    website VARCHAR(255),
    logo_url VARCHAR(255),
    status core.company_status DEFAULT 'UNVERIFIED',
    verification_document_url VARCHAR(255),
    verification_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create company members table
CREATE TABLE IF NOT EXISTS companies.company_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies.companies(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users.users(id) ON DELETE CASCADE,
    role core.company_role NOT NULL,
    invited_by UUID REFERENCES users.users(id),
    invited_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    accepted_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(company_id, user_id)
);

-- Create company invitations table
CREATE TABLE IF NOT EXISTS companies.company_invitations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies.companies(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    role core.company_role NOT NULL,
    invited_by UUID NOT NULL REFERENCES users.users(id),
    invited_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    accepted_at TIMESTAMP WITH TIME ZONE,
    token VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL
);

-- Create job categories table
CREATE TABLE IF NOT EXISTS jobs.job_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    description TEXT,
    parent_id UUID REFERENCES jobs.job_categories(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create jobs table
CREATE TABLE IF NOT EXISTS jobs.jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies.companies(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    description TEXT,
    responsibilities TEXT,
    requirements TEXT,
    benefits TEXT,
    salary_min DECIMAL(12,2),
    salary_max DECIMAL(12,2),
    salary_currency VARCHAR(3) DEFAULT 'AZN',
    salary_period VARCHAR(20) DEFAULT 'MONTH',
    salary_visible BOOLEAN DEFAULT true,
    location VARCHAR(255),
    remote_mode jobs.work_mode,
    employment_type jobs.employment_type NOT NULL,
    experience_level VARCHAR(50),
    education_requirements TEXT,
    language_requirements TEXT,
    application_deadline TIMESTAMP WITH TIME ZONE,
    publication_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expiration_date TIMESTAMP WITH TIME ZONE,
    status jobs.job_status DEFAULT 'DRAFT',
    category_id UUID REFERENCES jobs.job_categories(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create job skills junction table
CREATE TABLE IF NOT EXISTS jobs.job_skills (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id UUID NOT NULL REFERENCES jobs.jobs(id) ON DELETE CASCADE,
    skill_name VARCHAR(255) NOT NULL,
    required BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create applications table
CREATE TABLE IF NOT EXISTS applications.applications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id UUID NOT NULL REFERENCES jobs.jobs(id) ON DELETE CASCADE,
    candidate_id UUID NOT NULL REFERENCES users.users(id) ON DELETE CASCADE,
    resume_version_id UUID,
    cover_letter TEXT,
    status applications.application_status DEFAULT 'APPLIED',
    applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create application stage history table
CREATE TABLE IF NOT EXISTS ats.application_stage_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    application_id UUID NOT NULL REFERENCES applications.applications(id) ON DELETE CASCADE,
    from_stage applications.application_status,
    to_stage applications.application_status NOT NULL,
    actor_id UUID REFERENCES users.users(id),
    reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications.notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users.users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(100) NOT NULL,
    is_read BOOLEAN DEFAULT false,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create notification preferences table
CREATE TABLE IF NOT EXISTS notifications.notification_preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users.users(id) ON DELETE CASCADE,
    channel VARCHAR(50) NOT NULL,
    enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, channel)
);

-- Create files storage table
CREATE TABLE IF NOT EXISTS files.storage_objects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bucket_name VARCHAR(255) NOT NULL,
    object_name VARCHAR(255) NOT NULL,
    original_filename VARCHAR(255) NOT NULL,
    content_type VARCHAR(255),
    size_bytes BIGINT NOT NULL,
    checksum VARCHAR(255),
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(bucket_name, object_name)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users.users(email);
CREATE INDEX IF NOT EXISTS idx_users_status ON users.users(status);
CREATE INDEX IF NOT EXISTS idx_companies_slug ON companies.companies(slug);
CREATE INDEX IF NOT EXISTS idx_companies_status ON companies.companies(status);
CREATE INDEX IF NOT EXISTS idx_jobs_company_id ON jobs.jobs(company_id);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs.jobs(status);
CREATE INDEX IF NOT EXISTS idx_jobs_slug ON jobs.jobs(slug);
CREATE INDEX IF NOT EXISTS idx_jobs_publication_date ON jobs.jobs(publication_date);
CREATE INDEX IF NOT EXISTS idx_applications_job_id ON applications.applications(job_id);
CREATE INDEX IF NOT EXISTS idx_applications_candidate_id ON applications.applications(candidate_id);
CREATE INDEX IF NOT EXISTS idx_applications_status ON applications.applications(status);
CREATE INDEX IF NOT EXISTS idx_applications_applied_at ON applications.applications(applied_at);
CREATE INDEX IF NOT EXISTS idx_ats_application_id ON ats.application_stage_history(application_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications.notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_storage_bucket_object ON files.storage_objects(bucket_name, object_name);

-- Create full text search index on jobs
CREATE INDEX IF NOT EXISTS idx_jobs_search ON jobs.jobs
USING gin (
    to_tsvector('english', 
        COALESCE(title, '') || ' ' || 
        COALESCE(description, '') || ' ' || 
        COALESCE(responsibilities, '') || ' ' || 
        COALESCE(requirements, '')
    )
);

-- Create GIN index for pg_trgm on jobs for similarity search
CREATE INDEX IF NOT EXISTS idx_jobs_title_trgm ON jobs.jobs USING gin (title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_jobs_description_trgm ON jobs.jobs USING gin (description gin_trgm_ops);

-- Grant permissions
GRANT ALL PRIVILEGES ON DATABASE joblane TO joblane;
GRANT ALL PRIVILEGES ON SCHEMA auth, users, core, companies, jobs, applications, ats, interviews, offers, notifications, files, search, billing, moderation, analytics TO joblane;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA auth, users, core, companies, jobs, applications, ats, interviews, offers, notifications, files, search, billing, moderation, analytics TO joblane;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA auth, users, core, companies, jobs, applications, ats, interviews, offers, notifications, files, search, billing, moderation, analytics TO joblane;