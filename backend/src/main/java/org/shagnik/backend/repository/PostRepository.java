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

    // Open feed: soonest lockAt first (FR19)
    Page<Post> findByStatusOrderByLockAtAsc(PostStatus status, Pageable pageable);

    // Settled feed: most recently settled first (FR20)
    Page<Post> findByStatusOrderBySettledAtDesc(PostStatus status, Pageable pageable);

    @Query("SELECT p FROM Post p JOIN p.tags t WHERE t.name = :tagName")
    Page<Post> findByTagName(@Param("tagName") String tagName, Pageable pageable);

    Page<Post> findByPoster(User poster, Pageable pageable);
}