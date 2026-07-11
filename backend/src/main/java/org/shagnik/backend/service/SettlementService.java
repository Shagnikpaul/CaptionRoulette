package org.shagnik.backend.service;

import org.shagnik.backend.entity.*;
import org.shagnik.backend.exception.ForbiddenActionException;
import org.shagnik.backend.exception.ResourceNotFoundException;
import org.shagnik.backend.repository.CaptionRepository;
import org.shagnik.backend.repository.NotificationRepository;
import org.shagnik.backend.repository.PostRepository;
import org.shagnik.backend.repository.VoteRepository;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class SettlementService {

    private final PostRepository postRepository;
    private final CaptionRepository captionRepository;
    private final VoteRepository voteRepository;
    private final NotificationRepository notificationRepository;

    public SettlementService(PostRepository postRepository,
                             CaptionRepository captionRepository,
                             VoteRepository voteRepository,
                             NotificationRepository notificationRepository) {
        this.postRepository = postRepository;
        this.captionRepository = captionRepository;
        this.voteRepository = voteRepository;
        this.notificationRepository = notificationRepository;
    }

    /**
     * Manual settlement (FR16). Enforces owner / OPEN / before-lockAt / caption-belongs-to-post rules,
     * then delegates the actual DB mutation to the shared settle() method.
     */
    @Transactional
    public Post manuallySettle(Post post, User caller, UUID captionId) {
        if (!post.getPoster().getId().equals(caller.getId())) {
            throw new ForbiddenActionException("Only the post owner may select a winner");
        }
        if (post.getStatus() != PostStatus.OPEN) {
            throw new ForbiddenActionException("Post is not open");
        }
        if (!LocalDateTime.now().isBefore(post.getLockAt())) {
            throw new ForbiddenActionException("Cannot select a winner after lockAt");
        }

        Caption caption = captionRepository.findById(captionId)
                .orElseThrow(() -> new ResourceNotFoundException(captionId.toString()));

        if (!caption.getPost().getId().equals(post.getId())) {
            throw new ForbiddenActionException("Caption does not belong to this post");
        }

        return settle(post, caption);
    }

    /**
     * Automatic / lazy settlement (FR17). Called from PostService whenever a post is read.
     * No-ops unless the post is OPEN, past lockAt, and has no winner yet.
     */
    @Transactional
    public Post autoSettleIfNeeded(Post post) {
        boolean expired = post.getStatus() == PostStatus.OPEN
                && !LocalDateTime.now().isBefore(post.getLockAt())
                && post.getWinningCaptionId() == null;

        if (!expired) {
            return post;
        }

        Caption winner = determineWinner(post);
        if (winner == null) {
            // No captions were ever submitted — nothing to crown, leave OPEN.
            // (Alternatively you may want a "SETTLED with no winner" state; flagging this as a product decision.)
            return post;
        }

        return settle(post, winner);
    }

    /**
     * FR17 algorithm: highest net score wins; ties broken by earliest submission.
     */
    private Caption determineWinner(Post post) {
        List<Caption> captions = captionRepository.findByPost(post, Pageable.unpaged()).getContent();
        if (captions.isEmpty()) {
            return null;
        }

        List<UUID> captionIds = captions.stream().map(Caption::getId).collect(Collectors.toList());
        Map<UUID, Long> scores = voteRepository.getScoresForCaptions(captionIds).stream()
                .collect(Collectors.toMap(
                        VoteRepository.CaptionScoreProjection::getCaptionId,
                        VoteRepository.CaptionScoreProjection::getScore));

        Caption winner = null;
        long bestScore = Long.MIN_VALUE;

        for (Caption candidate : captions) {
            long score = scores.getOrDefault(candidate.getId(), 0L);
            if (winner == null
                    || score > bestScore
                    || (score == bestScore && candidate.getCreatedAt().isBefore(winner.getCreatedAt()))) {
                winner = candidate;
                bestScore = score;
            }
        }
        return winner;
    }

    /**
     * Shared settlement logic. Both manual and automatic settlement funnel through here.
     * Wraps the post update + notification creation in one transaction.
     */
    @Transactional
    protected Post settle(Post post, Caption winningCaption) {
        post.setStatus(PostStatus.SETTLED);
        post.setSettledAt(LocalDateTime.now());
        post.setWinningCaptionId(winningCaption.getId());
        Post saved = postRepository.save(post);

        Notification notification = new Notification();
        notification.setUser(winningCaption.getAuthor());
        notification.setType(NotificationType.CAPTION_WON);
        notification.setReferencePostId(post.getId());
        notification.setCreatedAt(LocalDateTime.now());
        notificationRepository.save(notification);

        return saved;
    }
}