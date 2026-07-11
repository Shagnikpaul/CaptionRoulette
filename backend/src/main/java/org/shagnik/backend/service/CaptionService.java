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
import org.shagnik.backend.repository.VoteRepository;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class CaptionService {

    private final CaptionRepository captionRepository;
    private final PostRepository postRepository;
    private final UserRepository userRepository;
    private final VoteRepository voteRepository;
    private final AuthService authService;

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

        // Brand-new caption — no votes exist yet, so score is 0 and myVote is null
        return toResponse(caption, 0, null);
    }

    public Page<CaptionResponse> getCaptions(UUID postId, String sort, int page, int size, Authentication authentication) {
        Post post = postRepository.findById(postId)
                .orElseThrow(() -> new ResourceNotFoundException("Post not found: " + postId));

        String normalizedSort = sort == null ? "new" : sort.toLowerCase();

        Page<Caption> captionsPage = switch (normalizedSort) {
            case "old" -> captionRepository.findByPost(post,
                    PageRequest.of(page, size, Sort.by(Sort.Direction.ASC, "createdAt")));
            case "new" -> captionRepository.findByPost(post,
                    PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt")));
            case "top" -> captionRepository.findByPostIdOrderByScoreDescThenOldest(postId,
                    PageRequest.of(page, size)); // no Sort here — ORDER BY is baked into the query
            default -> throw new InvalidRequestException("Invalid sort mode: " + sort);
        };

        List<UUID> captionIds = captionsPage.getContent().stream().map(Caption::getId).toList();

        // Bulk net scores
        Map<UUID, Integer> scores = new HashMap<>();
        if (!captionIds.isEmpty()) {
            voteRepository.getScoresForCaptions(captionIds)
                    .forEach(p -> scores.put(p.getCaptionId(), p.getScore().intValue()));
        }

        // Bulk "my vote" — only if authenticated
        Map<UUID, Integer> myVotes = new HashMap<>();
        if (authentication != null && authentication.isAuthenticated()
                && !"anonymousUser".equals(authentication.getPrincipal()) && !captionIds.isEmpty()) {
            User currentUser = authService.getCurrentUser(authentication.getName());
            voteRepository.findByCaptionIdInAndUserId(captionIds, currentUser.getId())
                    .forEach(v -> myVotes.put(v.getCaption().getId(), v.getValue().intValue()));
        }

        return captionsPage.map(c -> toResponse(
                c,
                scores.getOrDefault(c.getId(), 0),
                myVotes.get(c.getId())
        ));
    }

    private CaptionResponse toResponse(Caption caption, int score, Integer myVote) {
        return new CaptionResponse(
                caption.getId(),
                caption.getText(),
                caption.getAuthor().getUsername(),
                caption.getCreatedAt(),
                score,
                myVote
        );
    }
}