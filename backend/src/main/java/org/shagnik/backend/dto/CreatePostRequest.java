package org.shagnik.backend.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.util.List;

public class CreatePostRequest {

    @NotBlank(message = "imageKey is required")
    private String imageKey;

    private String title; // optional per PRD

    // Cheap upfront guard; the service does the real normalized/deduped check,
    // since raw duplicates (e.g. "Fun","fun") would pass this check but still
    // need to be caught after normalization.
    @Size(max = 5, message = "A post can have at most 5 tags")
    private List<String> tags;

    public CreatePostRequest() {}

    public String getImageKey() { return imageKey; }
    public void setImageKey(String imageKey) { this.imageKey = imageKey; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public List<String> getTags() { return tags; }
    public void setTags(List<String> tags) { this.tags = tags; }
}