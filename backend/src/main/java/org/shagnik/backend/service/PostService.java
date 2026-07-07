package org.shagnik.backend.service;

import org.shagnik.backend.dto.CreatePostRequest;
import org.shagnik.backend.dto.FeedItemResponse;
import org.shagnik.backend.dto.PostResponse;
import org.shagnik.backend.entity.Post;
import org.shagnik.backend.entity.PostStatus;
import org.shagnik.backend.entity.Tag;
import org.shagnik.backend.entity.User;
import org.shagnik.backend.exception.InvalidImageKeyException;
import org.shagnik.backend.exception.PostNotFoundException;
import org.shagnik.backend.exception.TagLimitExceededException;
import org.shagnik.backend.repository.PostRepository;
import org.shagnik.backend.repository.TagRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.HeadObjectRequest;
import software.amazon.awssdk.services.s3.model.NoSuchKeyException;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class PostService {

    private static final int MAX_TAGS = 5;
    private static final long LOCK_DURATION_HOURS = 48;

    private final PostRepository postRepository;
    private final TagRepository tagRepository;
    private final AuthService authService;
    private final S3Client s3Client;

    @Value("${aws.s3_bucket}")
    private String bucketName;

    public PostService(PostRepository postRepository, TagRepository tagRepository,
            AuthService authService, S3Client s3Client) {
        this.postRepository = postRepository;
        this.tagRepository = tagRepository;
        this.authService = authService;
        this.s3Client = s3Client;
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

    @Transactional(readOnly = true)
    public Page<FeedItemResponse> getOpenFeed(Pageable pageable) {
        return postRepository.findByStatusOrderByLockAtAsc(PostStatus.OPEN, pageable)
                .map(this::toFeedItemResponse);
    }

    @Transactional(readOnly = true)
    public Page<FeedItemResponse> getSettledFeed(Pageable pageable) {
        return postRepository.findByStatusOrderBySettledAtDesc(PostStatus.SETTLED, pageable)
                .map(this::toFeedItemResponse);
    }

    @Transactional(readOnly = true)
    public PostResponse getPostById(UUID id) {
        Post post = postRepository.findById(id)
                .orElseThrow(() -> new PostNotFoundException(id.toString()));
        return toPostResponse(post);
    }

    private PostResponse toPostResponse(Post post) {
        List<String> tagNames = post.getTags().stream()
                .map(Tag::getName)
                .sorted()
                .collect(Collectors.toList());
        return new PostResponse(
                post.getId(), post.getPoster().getId(), post.getPoster().getUsername(),
                post.getImageKey(), post.getTitle(), post.getStatus(),
                post.getCreatedAt(), post.getLockAt(), post.getSettledAt(),
                post.getWinningCaptionId(), tagNames);
    }

    private FeedItemResponse toFeedItemResponse(Post post) {
        List<String> tagNames = post.getTags().stream()
                .map(Tag::getName)
                .sorted()
                .collect(Collectors.toList());
        return new FeedItemResponse(
                post.getId(), post.getPoster().getUsername(), post.getImageKey(),
                post.getTitle(), post.getStatus(), post.getCreatedAt(), post.getLockAt(),
                post.getSettledAt(), post.getWinningCaptionId(), tagNames);
    }
}