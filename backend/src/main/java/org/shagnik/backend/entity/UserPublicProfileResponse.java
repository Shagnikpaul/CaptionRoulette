package org.shagnik.backend.entity;

import java.time.LocalDateTime;

public class UserPublicProfileResponse {
    private String username;
    private String profileImage;
    private LocalDateTime joinedAt;

    public UserPublicProfileResponse() {}

    public UserPublicProfileResponse(String username, String profileImage, LocalDateTime joinedAt) {
        this.username = username;
        this.profileImage = profileImage;
        this.joinedAt = joinedAt;
    }

    public String getUsername() { return username; }
    public String getProfileImage() { return profileImage; }
    public LocalDateTime getJoinedAt() { return joinedAt; }
}
