package org.shagnik.backend.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.shagnik.backend.dto.CaptionRequest;
import org.shagnik.backend.dto.CaptionResponse;
import org.shagnik.backend.service.CaptionService;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/posts/{postId}/captions")
@RequiredArgsConstructor
public class CaptionController {

    private final CaptionService captionService;

    // POST /api/posts/{postId}/captions
    @PostMapping
    public ResponseEntity<CaptionResponse> submitCaption(
            @PathVariable UUID postId,
            @Valid @RequestBody CaptionRequest request,
            @AuthenticationPrincipal UserDetails principal
    ) {
        CaptionResponse response = captionService.submitCaption(postId, request, principal.getUsername());
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    // GET /api/posts/{postId}/captions?sort=top|new|old&page=0&size=20
    @GetMapping
    public ResponseEntity<Page<CaptionResponse>> getCaptions(
            @PathVariable UUID postId,
            @RequestParam(defaultValue = "new") String sort,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            Authentication authentication
    ) {
        Page<CaptionResponse> captions = captionService.getCaptions(postId, sort, page, size, authentication);
        return ResponseEntity.ok(captions);
    }
}