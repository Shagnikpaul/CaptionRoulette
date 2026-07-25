package org.shagnik.backend.service;

import org.shagnik.backend.dto.auth.UserProfileResponse;
import org.shagnik.backend.dto.user.UpdateProfileRequest;
import org.shagnik.backend.dto.user.UpdateProfileResponse;
import org.shagnik.backend.entity.User;
import org.shagnik.backend.entity.UserPublicProfileResponse;
import org.shagnik.backend.repository.UserRepository;
import org.shagnik.backend.security.JwtUtil;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class UserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;

    public UserService(UserRepository userRepository, PasswordEncoder passwordEncoder, JwtUtil jwtUtil) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtUtil = jwtUtil;
    }

    public UserPublicProfileResponse getPublicProfile(String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));

        return new UserPublicProfileResponse(
                user.getUsername(),
                user.getProfileImageKey(),
                user.getCreatedAt()
        );
    }

    public UpdateProfileResponse updateProfile(String currentUsername, UpdateProfileRequest request) {
        User user = userRepository.findByUsername(currentUsername)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));

        boolean usernameChanged = false;
        String newAccessToken = null;

        // 1. Username change validation
        if (request.getUsername() != null && !request.getUsername().isBlank()
                && !request.getUsername().trim().equalsIgnoreCase(user.getUsername())) {
            String targetUsername = request.getUsername().trim();
            if (userRepository.existsByUsername(targetUsername)) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "Username is already taken");
            }
            user.setUsername(targetUsername);
            usernameChanged = true;
        }

        // 2. Password change validation
        if (request.getNewPassword() != null && !request.getNewPassword().isBlank()) {
            if (request.getConfirmPassword() == null || !request.getNewPassword().equals(request.getConfirmPassword())) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Passwords do not match");
            }
            if (request.getNewPassword().length() < 6) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Password must be at least 6 characters");
            }
            user.setPasswordHash(passwordEncoder.encode(request.getNewPassword()));
        }

        // 3. Profile image key
        if (request.getProfileImageKey() != null) {
            user.setProfileImageKey(request.getProfileImageKey().isBlank() ? null : request.getProfileImageKey().trim());
        }

        User updatedUser = userRepository.save(user);

        if (usernameChanged) {
            newAccessToken = jwtUtil.generateToken(updatedUser.getUsername());
        }

        UserProfileResponse profileResponse = new UserProfileResponse(
                updatedUser.getId(),
                updatedUser.getUsername(),
                updatedUser.getEmail(),
                updatedUser.getRole(),
                updatedUser.isBanned(),
                updatedUser.getCreatedAt(),
                updatedUser.getProfileImageKey()
        );

        return new UpdateProfileResponse(profileResponse, newAccessToken);
    }
}