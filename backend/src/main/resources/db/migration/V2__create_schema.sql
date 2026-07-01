-- 1. Create Custom Enum Types
CREATE TYPE user_role AS ENUM ('USER', 'ADMIN');
CREATE TYPE post_status AS ENUM ('OPEN', 'SETTLED');
CREATE TYPE report_target_type AS ENUM ('POST', 'CAPTION');
CREATE TYPE report_status AS ENUM ('OPEN', 'REVIEWED');
CREATE TYPE notification_type AS ENUM ('CAPTION_WON');

-- 2. Create Users Table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(255) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role user_role NOT NULL DEFAULT 'USER',
    banned BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 3. Create Posts Table (without winning_caption_id FK constraint to handle circular dependency)
CREATE TABLE posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    poster_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    image_key VARCHAR(255) NOT NULL,
    title VARCHAR(255),
    status post_status NOT NULL DEFAULT 'OPEN',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    lock_at TIMESTAMP NOT NULL DEFAULT (CURRENT_TIMESTAMP + INTERVAL '48 hours'),
    settled_at TIMESTAMP,
    winning_caption_id UUID
);

-- 4. Create Captions Table
CREATE TABLE captions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    author_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    text VARCHAR(280) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_post_author UNIQUE (post_id, author_id)
);

-- 5. Add Circular Foreign Key Constraint to Posts Table
ALTER TABLE posts 
    ADD CONSTRAINT fk_posts_winning_caption FOREIGN KEY (winning_caption_id) REFERENCES captions(id) ON DELETE SET NULL;

-- 6. Create Votes Table
CREATE TABLE votes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    caption_id UUID NOT NULL REFERENCES captions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    value SMALLINT NOT NULL CONSTRAINT check_vote_value CHECK (value IN (-1, 1)),
    CONSTRAINT unique_caption_user_vote UNIQUE (caption_id, user_id)
);

-- 7. Create Tags Table
CREATE TABLE tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL UNIQUE CONSTRAINT check_tag_name_lowercase CHECK (name = LOWER(name))
);

-- 8. Create Post_Tags Table (Join Table)
CREATE TABLE post_tags (
    post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (post_id, tag_id)
);

-- 9. Create Reports Table
CREATE TABLE reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    target_type report_target_type NOT NULL,
    target_id UUID NOT NULL,
    reporter_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reason VARCHAR(255) NOT NULL,
    status report_status NOT NULL DEFAULT 'OPEN',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 10. Create Notifications Table
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type notification_type NOT NULL,
    reference_post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 11. Create Indexes on Foreign Keys (Optimize Joins and CASCADE Operations)
CREATE INDEX idx_posts_poster_id ON posts(poster_id);
CREATE INDEX idx_posts_winning_caption_id ON posts(winning_caption_id);
CREATE INDEX idx_captions_post_id ON captions(post_id);
CREATE INDEX idx_captions_author_id ON captions(author_id);
CREATE INDEX idx_votes_caption_id ON votes(caption_id);
CREATE INDEX idx_votes_user_id ON votes(user_id);
CREATE INDEX idx_post_tags_tag_id ON post_tags(tag_id);
CREATE INDEX idx_reports_reporter_id ON reports(reporter_id);
CREATE INDEX idx_reports_target_id ON reports(target_id);
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_reference_post_id ON notifications(reference_post_id);
