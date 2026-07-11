package org.shagnik.backend.entity;

public class UserSummary {
    private String username;
    private String profileImage;

    public UserSummary() {}

    public UserSummary(String username, String profileImage) {
        this.username = username;
        this.profileImage = profileImage;
    }

    public String getUsername() { return username; }
    public String getProfileImage() { return profileImage; }
}