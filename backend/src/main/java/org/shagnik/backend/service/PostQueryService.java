package org.shagnik.backend.service;

import org.shagnik.backend.dto.PostResponse;
import org.shagnik.backend.entity.Post;
import org.shagnik.backend.entity.Tag;
import org.shagnik.backend.entity.User;
import org.shagnik.backend.repository.PostRepository;
import org.shagnik.backend.repository.TagRepository;
import org.shagnik.backend.repository.UserRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class PostQueryService {

    private final PostRepository postRepository;
    private final TagRepository tagRepository;
    private final UserRepository userRepository;
    private final SettlementService settlementService;
    private final PostService postService; // reuse existing toResponse(Post)

    public PostQueryService(PostRepository postRepository,
                            TagRepository tagRepository,
                            UserRepository userRepository,
                            SettlementService settlementService,
                            PostService postService) {
        this.postRepository = postRepository;
        this.tagRepository = tagRepository;
        this.userRepository = userRepository;
        this.settlementService = settlementService;
        this.postService = postService;
    }

    public Page<PostResponse> getPostsByTag(String tagName, Pageable pageable) {
        String normalized = tagName.trim().toLowerCase();
        Tag tag = tagRepository.findByName(normalized)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Tag not found"));

        Page<Post> posts = postRepository.findByTagName(tag.getName(), pageable);
        return posts.map(post -> postService.toPostResponse(settlementService.autoSettleIfNeeded(post)));
    }

    public Page<PostResponse> getPostsByUser(String username, Pageable pageable) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));

        Page<Post> posts = postRepository.findByPoster(user, pageable);
        return posts.map(post -> postService.toPostResponse(settlementService.autoSettleIfNeeded(post)));
    }
}