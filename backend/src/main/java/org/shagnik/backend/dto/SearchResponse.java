package org.shagnik.backend.dto;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonProperty;
import org.shagnik.backend.entity.UserSummary;

import java.util.List;

public class SearchResponse {
    private List<String> tags;
    private List<UserSummary> users;

    public SearchResponse() {}

    @JsonCreator
    public SearchResponse(@JsonProperty("tags") List<String> tags,
                          @JsonProperty("users") List<UserSummary> users) {
        this.tags = tags;
        this.users = users;
    }

    public List<String> getTags() { return tags; }
    public List<UserSummary> getUsers() { return users; }
}