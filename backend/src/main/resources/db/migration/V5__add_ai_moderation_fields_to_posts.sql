-- V5: Add AI moderation fields to posts table

CREATE TYPE ai_moderation_status AS ENUM ('PENDING', 'SAFE', 'FLAGGED', 'FAILED');

ALTER TABLE posts
    ADD COLUMN ai_moderation_status ai_moderation_status NOT NULL DEFAULT 'PENDING',
    ADD COLUMN shadow_banned         BOOLEAN               NOT NULL DEFAULT FALSE,
    ADD COLUMN ai_flag_reason        TEXT;
