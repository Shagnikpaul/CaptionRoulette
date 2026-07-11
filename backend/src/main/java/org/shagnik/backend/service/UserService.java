package org.shagnik.backend.service;

import org.shagnik.backend.entity.User;
import org.shagnik.backend.entity.UserPublicProfileResponse;
import org.shagnik.backend.repository.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class UserService {

    private final UserRepository userRepository;

    public UserService(UserRepository userRepository) {
        this.userRepository = userRepository;
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
}