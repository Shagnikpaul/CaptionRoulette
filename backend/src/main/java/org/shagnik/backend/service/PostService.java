package org.shagnik.backend.service;

import lombok.RequiredArgsConstructor;
import org.shagnik.backend.dto.CreatePostRequest;
import org.shagnik.backend.dto.FeedItemResponse;
import org.shagnik.backend.dto.PostResponse;
import org.shagnik.backend.entity.*;
import org.shagnik.backend.exception.*;
import org.shagnik.backend.repository.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.HeadObjectRequest;
import software.amazon.awssdk.services.s3.model.NoSuchKeyException;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@RequiredArgsConstructor
@Service
public class PostService {

    private static final int MAX_TAGS = 5;
    private static final long LOCK_DURATION_HOURS = 48;

    private final PostRepository postRepository;
    private final TagRepository tagRepository;
    private final SettlementService settlementService;
    private final CaptionRepository captionRepository;
    private final AuthService authService;
    private final UserRepository userRepository;
    private final ReportRepository reportRepository;
    private final NotificationRepository notificationRepository;
    private final VoteRepository voteRepository;
    private final S3Client s3Client;

    @Value("${aws.s3_bucket}")
    private String bucketName;



    @Transactional
    public PostResponse createPost(String username, CreatePostRequest request) {
        User poster = authService.getCurrentUser(username);

        validateImageKey(request.getImageKey());

        Set<Tag> tags = resolveTags(request.getTags());

        LocalDateTime now = LocalDateTime.now();

        Post post = new Post();
        post.setPoster(poster);
        post.setImageKey(request.getImageKey());
        post.setTitle(request.getTitle());
        post.setStatus(PostStatus.OPEN);
        post.setCreatedAt(now);
        post.setLockAt(now.plusHours(LOCK_DURATION_HOURS));
        post.setTags(tags);

        Post saved = postRepository.save(post);
        return toPostResponse(saved);
    }

    private void validateImageKey(String imageKey) {
        try {
            s3Client.headObject(HeadObjectRequest.builder()
                    .bucket(bucketName)
                    .key(imageKey)
                    .build());
        } catch (NoSuchKeyException ex) {
            throw new InvalidImageKeyException("Image key does not exist: " + imageKey);
        }
    }

    private Set<Tag> resolveTags(List<String> rawTags) {
        if (rawTags == null || rawTags.isEmpty()) {
            return new HashSet<>();
        }

        // Normalize (trim + lowercase) and dedupe within this request.
        // LinkedHashSet preserves insertion order for predictable behavior.
        Set<String> normalizedNames = rawTags.stream()
                .filter(Objects::nonNull)
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .map(String::toLowerCase)
                .collect(Collectors.toCollection(LinkedHashSet::new));

        if (normalizedNames.size() > MAX_TAGS) {
            throw new TagLimitExceededException("A post can have at most " + MAX_TAGS + " tags");
        }

        // Reuse existing tags in one batch query; only create what's missing.
        List<Tag> existingTags = tagRepository.findByNameIn(normalizedNames);
        Map<String, Tag> existingByName = existingTags.stream()
                .collect(Collectors.toMap(Tag::getName, t -> t));

        Set<Tag> result = new HashSet<>();
        for (String name : normalizedNames) {
            Tag tag = existingByName.get(name);
            if (tag == null) {
                tag = tagRepository.save(new Tag(name));
            }
            result.add(tag);
        }
        return result;
    }

    @Transactional
    public Page<FeedItemResponse> getOpenFeed(Pageable pageable) {
        Page<Post> page = postRepository.findByStatusOrderByLockAtAsc(PostStatus.OPEN, pageable);
        page.forEach(settlementService::autoSettleIfNeeded);

        List<FeedItemResponse> items = page.getContent().stream()
                .filter(p -> p.getStatus() == PostStatus.OPEN) // exclude any that just flipped to SETTLED
                .map(this::toFeedItemResponse)
                .collect(Collectors.toList());

        return new PageImpl<>(items, pageable, page.getTotalElements());
    }

    @Transactional
    public Page<FeedItemResponse> getSettledFeed(Pageable pageable) {
        Page<Post> page = postRepository.findByStatusOrderBySettledAtDesc(PostStatus.SETTLED, pageable);
        // Already SETTLED — this call is a safe no-op, kept only for consistency with getOpenFeed.
        page.forEach(settlementService::autoSettleIfNeeded);
        return page.map(this::toFeedItemResponse);
    }

    @Transactional
    public PostResponse getPostById(UUID id) {
        Post post = postRepository.findById(id)
                .orElseThrow(() -> new PostNotFoundException(id.toString()));
        post = settlementService.autoSettleIfNeeded(post);
        return toPostResponse(post);
    }

    @Transactional
    public PostResponse selectWinner(String username, UUID postId, UUID captionId) {
        User caller = authService.getCurrentUser(username);
        Post post = postRepository.findById(postId)
                .orElseThrow(() -> new ResourceNotFoundException(postId.toString()));
        Post settled = settlementService.manuallySettle(post, caller, captionId);
        return toPostResponse(settled);
    }

    @Transactional
    public void deletePost(String username, UUID postId) {
        Post post = postRepository.findById(postId)
                .orElseThrow(() -> new ResourceNotFoundException("Post not found: " + postId));

        User currentUser = userRepository.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + username));

        if (!post.getPoster().getId().equals(currentUser.getId())) {
            throw new ForbiddenActionException("You cannot delete another user's post");
        }

        List<UUID> captionIds = captionRepository.findIdsByPostId(postId); // <-- ID projection, not entities to prevent
        // transient entities error by hibernate

        if (!captionIds.isEmpty()) {
            voteRepository.deleteByCaptionIdIn(captionIds);
            reportRepository.deleteByTargetTypeAndTargetIdIn(ReportTargetType.CAPTION, captionIds);
            captionRepository.deleteAllByIdInBatch(captionIds);
        }

        notificationRepository.deleteByReferencePostId(postId);
        reportRepository.deleteByTargetTypeAndTargetId(ReportTargetType.POST, postId);

        postRepository.delete(post);
    }

    public PostResponse toPostResponse(Post post) {
        List<String> tagNames = post.getTags().stream()
                .map(Tag::getName)
                .sorted()
                .collect(Collectors.toList());

        String winningText = null;
        String winningAuthor = null;
        if (post.getStatus() == PostStatus.SETTLED && post.getWinningCaptionId() != null) {
            Caption winner = captionRepository.findById(post.getWinningCaptionId()).orElse(null);
            if (winner != null) {
                winningText = winner.getText();
                winningAuthor = winner.getAuthor().getUsername();
            }
        }

        return new PostResponse(
                post.getId(), post.getPoster().getId(), post.getPoster().getUsername(),
                post.getImageKey(), post.getTitle(), post.getStatus(),
                post.getCreatedAt(), post.getLockAt(), post.getSettledAt(),
                post.getWinningCaptionId(), winningText, winningAuthor, tagNames);
    }

    private FeedItemResponse toFeedItemResponse(Post post) {
        List<String> tagNames = post.getTags().stream()
                .map(Tag::getName)
                .sorted()
                .collect(Collectors.toList());

        String winningText = null;
        String winningAuthor = null;
        if (post.getStatus() == PostStatus.SETTLED && post.getWinningCaptionId() != null) {
            Caption winner = captionRepository.findById(post.getWinningCaptionId()).orElse(null);
            if (winner != null) {
                winningText = winner.getText();
                winningAuthor = winner.getAuthor().getUsername();
            }
        }

        return new FeedItemResponse(
                post.getId(), post.getPoster().getUsername(), post.getImageKey(),
                post.getTitle(), post.getStatus(), post.getCreatedAt(), post.getLockAt(),
                post.getSettledAt(), post.getWinningCaptionId(), winningText, winningAuthor, tagNames);
    }
}