package org.shagnik.backend.dto;

import org.shagnik.backend.entity.UserSummary;

import java.util.List;

public class SearchResponse {
    private List<String> tags;
    private List<UserSummary> users;

    public SearchResponse() {}

    public SearchResponse(List<String> tags, List<UserSummary> users) {
        this.tags = tags;
        this.users = users;
    }

    public List<String> getTags() { return tags; }
    public List<UserSummary> getUsers() { return users; }
}