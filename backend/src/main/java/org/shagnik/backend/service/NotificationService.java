package org.shagnik.backend.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j; // NEW
import org.shagnik.backend.dto.NotificationResponse;
import org.shagnik.backend.entity.Notification;
import org.shagnik.backend.entity.User;
import org.shagnik.backend.exception.ForbiddenActionException;
import org.shagnik.backend.exception.ResourceNotFoundException;
import org.shagnik.backend.repository.NotificationRepository;
import org.shagnik.backend.repository.UserRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Slf4j // NEW
@Service
@RequiredArgsConstructor
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;
    private final RedisService redisService; // NEW

    private static final long UNREAD_COUNT_TTL_SECONDS = 60;

    private static String unreadCountKey(UUID userId) {
        return "notification-count:" + userId;
    }

    public Page<NotificationResponse> getMyNotifications(String username, int page, int size) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + username));
        Pageable pageable = PageRequest.of(page, size);
        return notificationRepository.findByUserIdOrderByCreatedAtDesc(user.getId(), pageable)
                .map(this::toResponse);
    }

    // NEW — Phase 7: cached unread count
    public long getUnreadCount(String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + username));

        String cached = redisService.get(unreadCountKey(user.getId()));
        if (cached != null) {
            try {
                return Long.parseLong(cached);
            } catch (NumberFormatException e) {
                log.warn("Corrupt cached unread count for user {}: {}", user.getId(), e.getMessage());
            }
        }

        long count = notificationRepository.countByUserIdAndReadFalse(user.getId());
        redisService.setex(unreadCountKey(user.getId()), UNREAD_COUNT_TTL_SECONDS, String.valueOf(count));
        return count;
    }

    @Transactional
    public NotificationResponse markAsRead(UUID notificationId, String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + username));

        Notification notification = notificationRepository.findById(notificationId)
                .orElseThrow(() -> new ResourceNotFoundException("Notification not found: " + notificationId));

        if (!notification.getUser().getId().equals(user.getId())) {
            throw new ForbiddenActionException("You cannot access another user's notification");
        }

        notification.setRead(true);
        notification = notificationRepository.save(notification);

        redisService.del(unreadCountKey(user.getId())); // NEW — Phase 8

        return toResponse(notification);
    }

    private NotificationResponse toResponse(Notification n) {
        return new NotificationResponse(
                n.getId(), n.getType(), n.getReferencePostId(), n.isRead(), n.getCreatedAt()
        );
    }
}