package org.shagnik.backend.repository;

import org.shagnik.backend.entity.Caption;
import org.shagnik.backend.entity.Post;
import org.shagnik.backend.entity.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

public interface CaptionRepository extends JpaRepository<Caption, UUID> {

    Page<Caption> findByPost(Post post, Pageable pageable);

    boolean existsByPostAndAuthor(Post post, User author);

    Page<Caption> findByPostId(UUID postId, Pageable pageable);

    boolean existsByPostIdAndAuthorId(UUID postId, UUID authorId);

    // "top" sort: net score DESC, tie-break oldest caption first.
    // Pass a Pageable with NO Sort (e.g. PageRequest.of(page, size)) — ordering is baked into the query.
    @Query(
            value = "SELECT c FROM Caption c LEFT JOIN Vote v ON v.caption = c " +
                    "WHERE c.post.id = :postId " +
                    "GROUP BY c " +
                    "ORDER BY COALESCE(SUM(v.value), 0) DESC, c.createdAt ASC",
            countQuery = "SELECT COUNT(c) FROM Caption c WHERE c.post.id = :postId"
    )
    Page<Caption> findByPostIdOrderByScoreDescThenOldest(@Param("postId") UUID postId, Pageable pageable);
    List<Caption> findAllByPostId(UUID postId);

    // this will be used by deletePost service method we dont need full caption entities but only their IDs
    @Query("SELECT c.id FROM Caption c WHERE c.post.id = :postId")
    List<UUID> findIdsByPostId(@Param("postId") UUID postId);
}