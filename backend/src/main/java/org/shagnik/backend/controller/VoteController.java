package org.shagnik.backend.controller;

import org.shagnik.backend.dto.VoteRequest;
import org.shagnik.backend.dto.VoteResponse;
import org.shagnik.backend.service.RateLimitService;
import org.shagnik.backend.service.VoteService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/captions")
@RequiredArgsConstructor
public class VoteController {

    private final VoteService voteService;
    private final RateLimitService rateLimitService;
    @PostMapping("/{id}/vote")
    public ResponseEntity<VoteResponse> vote(
            @PathVariable UUID id,
            @Valid @RequestBody VoteRequest request,
            Authentication authentication
    ) {
        rateLimitService.enforce("vote", authentication.getName(), 30, 60);
        return ResponseEntity.ok(voteService.vote(id, request, authentication));
    }
}