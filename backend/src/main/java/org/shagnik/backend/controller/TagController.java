package org.shagnik.backend.controller;

import org.shagnik.backend.dto.PostResponse;
import org.shagnik.backend.service.PostQueryService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/tags")
public class TagController {

    private final PostQueryService postQueryService;

    public TagController(PostQueryService postQueryService) {
        this.postQueryService = postQueryService;
    }

    @GetMapping("/{tagName}/posts")
    public ResponseEntity<Page<PostResponse>> getPostsByTag(
            @PathVariable String tagName,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        Pageable pageable = PageRequest.of(page, size);
        return ResponseEntity.ok(postQueryService.getPostsByTag(tagName, pageable));
    }
}