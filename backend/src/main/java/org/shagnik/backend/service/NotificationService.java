package org.shagnik.backend.service;

import lombok.RequiredArgsConstructor;
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

@Service
@RequiredArgsConstructor
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;

    public Page<NotificationResponse> getMyNotifications(String username, int page, int size) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + username));

        Pageable pageable = PageRequest.of(page, size);
        return notificationRepository.findByUserIdOrderByCreatedAtDesc(user.getId(), pageable)
                .map(this::toResponse);
    }

    @Transactional
    public NotificationResponse markAsRead(UUID notificationId, String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + username));

        Notification notification = notificationRepository.findById(notificationId)
                .orElseThrow(() -> new ResourceNotFoundException("Notification not found: " + notificationId));

        // Ownership check — a user may only mark their own notifications as read
        if (!notification.getUser().getId().equals(user.getId())) {
            throw new ForbiddenActionException("You cannot access another user's notification");
        }

        notification.setRead(true);
        notification = notificationRepository.save(notification);

        return toResponse(notification);
    }

    private NotificationResponse toResponse(Notification n) {
        return new NotificationResponse(
                n.getId(),
                n.getType(),
                n.getReferencePostId(),
                n.isRead(),
                n.getCreatedAt()
        );
    }
}