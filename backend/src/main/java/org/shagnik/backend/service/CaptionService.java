package org.shagnik.backend.service;

import lombok.RequiredArgsConstructor;
import org.shagnik.backend.dto.CaptionRequest;
import org.shagnik.backend.dto.CaptionResponse;
import org.shagnik.backend.entity.Caption;
import org.shagnik.backend.entity.Post;
import org.shagnik.backend.entity.PostStatus;
import org.shagnik.backend.entity.User;
import org.shagnik.backend.exception.*;
import org.shagnik.backend.repository.CaptionRepository;
import org.shagnik.backend.repository.PostRepository;
import org.shagnik.backend.repository.UserRepository;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class CaptionService {

    private final CaptionRepository captionRepository;
    private final PostRepository postRepository;
    private final UserRepository userRepository;

    @Transactional
    public CaptionResponse submitCaption(UUID postId, CaptionRequest request, String username) {

        // 1. Verify the post exists
        Post post = postRepository.findById(postId)
                .orElseThrow(() -> new ResourceNotFoundException("Post not found: " + postId));

        // 2. Verify the authenticated user exists
        User author = userRepository.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + username));

        // 3. Verify the post is still OPEN
        if (post.getStatus() != PostStatus.OPEN) {
            throw new PostClosedException("This post is no longer accepting captions");
        }

        // 4. Poster cannot caption their own post (FR6)
        if (post.getPoster().getId().equals(author.getId())) {
            throw new ForbiddenActionException("You cannot caption your own post");
        }

        // 5. One caption per user per post (FR8) — pre-check before insert
        if (captionRepository.existsByPostAndAuthor(post, author)) {
            throw new DuplicateResourceException("You have already submitted a caption for this post");
        }

        Caption caption = new Caption();
        caption.setPost(post);
        caption.setAuthor(author);
        caption.setText(request.getText());
        // createdAt is set automatically via @PrePersist

        try {
            caption = captionRepository.save(caption);
        } catch (DataIntegrityViolationException e) {
            // Fallback: DB unique constraint caught a race condition
            // where two requests passed the existsBy check simultaneously
            throw new DuplicateResourceException("You have already submitted a caption for this post");
        }

        return toResponse(caption);
    }

    public Page<CaptionResponse> getCaptions(UUID postId, String sort, int page, int size) {
        Post post = postRepository.findById(postId)
                .orElseThrow(() -> new ResourceNotFoundException("Post not found: " + postId));

        Sort sortOrder = switch (sort == null ? "new" : sort.toLowerCase()) {
            case "old" -> Sort.by(Sort.Direction.ASC, "createdAt");
            // "top" temporarily falls back to newest-first until scoring exists (Day 6)
            case "top", "new" -> Sort.by(Sort.Direction.DESC, "createdAt");
            default -> throw new InvalidRequestException("Invalid sort mode: " + sort);
        };

        Pageable pageable = PageRequest.of(page, size, sortOrder);
        return captionRepository.findByPost(post, pageable)
                .map(this::toResponse);
    }

    private CaptionResponse toResponse(Caption caption) {
        return new CaptionResponse(
                caption.getId(),
                caption.getText(),
                caption.getAuthor().getUsername(),
                caption.getCreatedAt()
        );
    }
}