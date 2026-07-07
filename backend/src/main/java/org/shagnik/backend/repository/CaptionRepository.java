package org.shagnik.backend.repository;

import org.shagnik.backend.entity.Caption;
import org.shagnik.backend.entity.Post;
import org.shagnik.backend.entity.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface CaptionRepository extends JpaRepository<Caption, UUID> {

    // Fetch all captions for a post, paginated — used for "new"/"old" sort
    // (Pageable's Sort handles direction, so no separate method needed for asc/desc)
    Page<Caption> findByPost(Post post, Pageable pageable);

    // Used by the service to enforce "one caption per user per post" (FR8)
    boolean existsByPostAndAuthor(Post post, User author);

    // Convenience overload if you ever just want IDs instead of loaded entities
    Page<Caption> findByPostId(UUID postId, Pageable pageable);

    boolean existsByPostIdAndAuthorId(UUID postId, UUID authorId);
}