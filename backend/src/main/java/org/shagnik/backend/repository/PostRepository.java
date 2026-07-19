package org.shagnik.backend.repository;

import org.shagnik.backend.entity.Post;
import org.shagnik.backend.entity.PostStatus;
import org.shagnik.backend.entity.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.UUID;

public interface PostRepository extends JpaRepository<Post, UUID> {

    // Kept — still fine to leave even though PostService no longer calls these two,
    // in case anything else in the codebase uses them.
    Page<Post> findByStatusOrderByLockAtAsc(PostStatus status, Pageable pageable);
    Page<Post> findByStatusOrderBySettledAtDesc(PostStatus status, Pageable pageable);

    // NEW — Phase 4: ID-only projections so the feed doesn't hydrate full entities
    // for rows that are likely already sitting in Redis.
    @Query("SELECT p.id FROM Post p WHERE p.status = :status ORDER BY p.lockAt ASC")
    Page<UUID> findIdsByStatusOrderByLockAtAsc(@Param("status") PostStatus status, Pageable pageable);

    @Query("SELECT p.id FROM Post p WHERE p.status = :status ORDER BY p.settledAt DESC")
    Page<UUID> findIdsByStatusOrderBySettledAtDesc(@Param("status") PostStatus status, Pageable pageable);

    @Query("SELECT p FROM Post p JOIN p.tags t WHERE t.name = :tagName")
    Page<Post> findByTagName(@Param("tagName") String tagName, Pageable pageable);

    Page<Post> findByPoster(User poster, Pageable pageable);
}