package org.shagnik.backend.entity;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonProperty;

public class UserSummary {
    private String username;
    private String profileImage;

    public UserSummary() {}

    @JsonCreator // NEW
    public UserSummary(@JsonProperty("username") String username,
                       @JsonProperty("profileImage") String profileImage) {
        this.username = username;
        this.profileImage = profileImage;
    }

    public String getUsername() { return username; }
    public String getProfileImage() { return profileImage; }
}