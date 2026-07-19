package org.shagnik.backend.repository;

import org.shagnik.backend.entity.Notification;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.UUID;

public interface NotificationRepository extends JpaRepository<Notification, UUID> {

    // fetch a user's notifications, newest first
    Page<Notification> findByUserIdOrderByCreatedAtDesc(UUID userId, Pageable pageable);

    @Modifying
    @Query("DELETE FROM Notification n WHERE n.referencePostId = :postId")
    void deleteByReferencePostId(@Param("postId") UUID postId);

    long countByUserIdAndReadFalse(UUID userId);
}