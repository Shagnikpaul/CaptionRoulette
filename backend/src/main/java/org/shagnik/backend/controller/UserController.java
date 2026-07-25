package org.shagnik.backend.controller;

import jakarta.validation.Valid;
import org.shagnik.backend.dto.PostResponse;
import org.shagnik.backend.dto.user.UpdateProfileRequest;
import org.shagnik.backend.dto.user.UpdateProfileResponse;
import org.shagnik.backend.entity.UserPublicProfileResponse;
import org.shagnik.backend.service.PostQueryService;
import org.shagnik.backend.service.UserService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/users")
public class UserController {

    private final UserService userService;
    private final PostQueryService postQueryService;

    public UserController(UserService userService, PostQueryService postQueryService) {
        this.userService = userService;
        this.postQueryService = postQueryService;
    }

    @GetMapping("/{username}")
    public ResponseEntity<UserPublicProfileResponse> getProfile(@PathVariable String username) {
        return ResponseEntity.ok(userService.getPublicProfile(username));
    }

    @GetMapping("/{username}/posts")
    public ResponseEntity<Page<PostResponse>> getUserPosts(
            @PathVariable String username,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        Pageable pageable = PageRequest.of(page, size);
        return ResponseEntity.ok(postQueryService.getPostsByUser(username, pageable));
    }

    @PutMapping("/me")
    public ResponseEntity<UpdateProfileResponse> updateProfile(
            Authentication authentication,
            @Valid @RequestBody UpdateProfileRequest request) {
        if (authentication == null || !authentication.isAuthenticated()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        String currentUsername = authentication.getName();
        return ResponseEntity.ok(userService.updateProfile(currentUsername, request));
    }
}