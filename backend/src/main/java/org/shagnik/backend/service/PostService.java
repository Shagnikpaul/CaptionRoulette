package org.shagnik.backend.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j; // NEW
import org.shagnik.backend.dto.CachedPost;
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

@Slf4j // NEW — replaces the System.out.println calls
@RequiredArgsConstructor
@Service
public class PostService {

    private static final int MAX_TAGS = 5;
    private static final long LOCK_DURATION_HOURS = 48;
    private static final long POST_CACHE_TTL_SECONDS = 600;

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
    private final ObjectMapper objectMapper;
    private final RedisService redisService;

    @Value("${aws.s3_bucket}")
    private String bucketName;

    // FIX: was private — SettlementService now needs this key format for Phase 8 eviction
    public static String postCacheKey(UUID postId) {
        return "post:" + postId;
    }

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
        Set<String> normalizedNames = rawTags.stream()
                .filter(Objects::nonNull)
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .map(String::toLowerCase)
                .collect(Collectors.toCollection(LinkedHashSet::new));

        if (normalizedNames.size() > MAX_TAGS) {
            throw new TagLimitExceededException("A post can have at most " + MAX_TAGS + " tags");
        }

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

    // ============ PHASE 4: ID-projection + bulk cache lookup ============

    @Transactional
    public Page<FeedItemResponse> getOpenFeed(Pageable pageable) {
        Page<UUID> idPage = postRepository.findIdsByStatusOrderByLockAtAsc(PostStatus.OPEN, pageable);
        return buildFeedFromIds(idPage);
    }

    @Transactional
    public Page<FeedItemResponse> getSettledFeed(Pageable pageable) {
        Page<UUID> idPage = postRepository.findIdsByStatusOrderBySettledAtDesc(PostStatus.SETTLED, pageable);
        return buildFeedFromIds(idPage);
    }

    private Page<FeedItemResponse> buildFeedFromIds(Page<UUID> idPage) {
        List<UUID> ids = idPage.getContent();
        if (ids.isEmpty()) {
            return new PageImpl<>(List.of(), idPage.getPageable(), idPage.getTotalElements());
        }

        List<String> keys = ids.stream().map(PostService::postCacheKey).toList();
        List<String> cachedValues = redisService.mget(keys); // same order as `keys`/`ids`

        List<FeedItemResponse> items = new ArrayList<>(ids.size());

        for (int i = 0; i < ids.size(); i++) {
            UUID id = ids.get(i);
            CachedPost dto = tryDeserialize(cachedValues.get(i), id);

            if (dto != null) {
                boolean settlementPossiblyDue =
                        dto.status() == PostStatus.OPEN
                                && dto.lockAt() != null
                                && dto.lockAt().isBefore(LocalDateTime.now());

                if (!settlementPossiblyDue) {
                    items.add(toFeedItemResponse(dto));
                    continue;
                }
                // else: lockAt passed, cache might be stale — fall through to DB check below
            }

            Post post = postRepository.findById(id).orElse(null);
            if (post == null) continue; // deleted between id-query and now; skip silently

            post = settlementService.autoSettleIfNeeded(post); // mutates + returns same reference
            CachedPost freshDto = toCachedPost(post);
            cachePost(id, freshDto);
            items.add(toFeedItemResponse(freshDto));
        }

        return new PageImpl<>(items, idPage.getPageable(), idPage.getTotalElements());
    }

    // ============ PHASE 5 (fixed): Post details ============

    @Transactional
    public PostResponse getPostById(UUID id) {
        String cacheKey = postCacheKey(id);
        CachedPost dto = tryDeserialize(redisService.get(cacheKey), id);

        if (dto != null) {
            boolean settlementPossiblyDue =
                    dto.status() == PostStatus.OPEN
                            && dto.lockAt() != null
                            && dto.lockAt().isBefore(LocalDateTime.now());

            if (!settlementPossiblyDue) {
                return toPostResponse(dto);
            }
        }

        Post post = postRepository.findById(id)
                .orElseThrow(() -> new PostNotFoundException(id.toString()));

        // FIX: autoSettleIfNeeded mutates `post` in place and returns it — never null,
        // so there's no reason to re-fetch from the DB afterward. Just reassign.
        post = settlementService.autoSettleIfNeeded(post);

        CachedPost freshDto = toCachedPost(post);
        cachePost(id, freshDto);
        return toPostResponse(freshDto);
    }

    // ============ Shared cache helpers ============

    private CachedPost tryDeserialize(String json, UUID postId) {
        if (json == null) return null;
        try {
            return objectMapper.readValue(json, CachedPost.class);
        } catch (Exception e) {
            log.warn("Failed to deserialize cached post {}: {}", postId, e.getMessage());
            return null;
        }
    }

    private void cachePost(UUID postId, CachedPost dto) {
        try {
            redisService.setex(postCacheKey(postId), POST_CACHE_TTL_SECONDS, objectMapper.writeValueAsString(dto));
        } catch (Exception e) {
            log.warn("Failed to cache post {}: {}", postId, e.getMessage());
        }
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

        List<UUID> captionIds = captionRepository.findIdsByPostId(postId);

        if (!captionIds.isEmpty()) {
            voteRepository.deleteByCaptionIdIn(captionIds);
            reportRepository.deleteByTargetTypeAndTargetIdIn(ReportTargetType.CAPTION, captionIds);
            captionRepository.deleteAllByIdInBatch(captionIds);
        }

        notificationRepository.deleteByReferencePostId(postId);
        reportRepository.deleteByTargetTypeAndTargetId(ReportTargetType.POST, postId);

        postRepository.delete(post);
        redisService.del(postCacheKey(postId)); // Phase 8: post no longer exists, evict
    }

    // ============ Mappers ============

    private CachedPost toCachedPost(Post post) {
        Caption winner = post.getWinningCaption();
        List<String> tagNames = post.getTags().stream()
                .map(Tag::getName)
                .sorted()
                .toList();

        return new CachedPost(
                post.getId(),
                post.getPoster().getId(),
                post.getPoster().getUsername(),
                post.getImageKey(),
                post.getTitle(),
                post.getStatus(),
                post.getCreatedAt(),
                post.getLockAt(),
                post.getSettledAt(),
                winner != null ? winner.getId() : null,
                winner != null ? winner.getText() : null,
                winner != null ? winner.getAuthor().getUsername() : null,
                tagNames
        );
    }

    private PostResponse toPostResponse(CachedPost dto) {
        return new PostResponse(
                dto.id(), dto.posterId(), dto.posterUsername(), dto.imageKey(), dto.title(),
                dto.status(), dto.createdAt(), dto.lockAt(), dto.settledAt(),
                dto.winningCaptionId(), dto.winningCaptionText(), dto.winningCaptionAuthor(), dto.tags()
        );
    }

    // FIX: was hand-duplicating the winner lookup (and NPE-ing on settle-with-no-winner).
    // Now delegates to toCachedPost, which already null-checks the winner.
    public PostResponse toPostResponse(Post post) {
        return toPostResponse(toCachedPost(post));
    }

    // Note: FeedItemResponse has NO posterId field (unlike PostResponse) — confirmed
    // from your actual constructor, so this mapper deliberately omits it.
    private FeedItemResponse toFeedItemResponse(CachedPost dto) {
        return new FeedItemResponse(
                dto.id(), dto.posterUsername(), dto.imageKey(), dto.title(),
                dto.status(), dto.createdAt(), dto.lockAt(), dto.settledAt(),
                dto.winningCaptionId(), dto.winningCaptionText(), dto.winningCaptionAuthor(), dto.tags()
        );
    }

    // toFeedItemResponse(Post) is no longer called anywhere in this class — the old
    // getOpenFeed/getSettledFeed that used it are gone, replaced by buildFeedFromIds above.
    // Delete it, UNLESS some other class calls it directly (grep to confirm before removing).
}