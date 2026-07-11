package org.shagnik.backend.service;

import org.shagnik.backend.dto.SearchResponse;
import org.shagnik.backend.entity.UserSummary;
import org.shagnik.backend.repository.TagRepository;
import org.shagnik.backend.repository.UserRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class SearchService {

    private final TagRepository tagRepository;
    private final UserRepository userRepository;

    public SearchService(TagRepository tagRepository, UserRepository userRepository) {
        this.tagRepository = tagRepository;
        this.userRepository = userRepository;
    }

    public SearchResponse search(String query) {
        if (query == null || query.isBlank()) {
            return new SearchResponse(List.of(), List.of());
        }
        String normalized = query.trim();

        List<String> tags = tagRepository
                .findTop10ByNameContainingIgnoreCaseOrderByNameAsc(normalized)
                .stream()
                .map(tag -> "#" + tag.getName())
                .collect(Collectors.toList());

        List<UserSummary> users = userRepository
                .findTop10ByUsernameContainingIgnoreCaseOrderByUsernameAsc(normalized)
                .stream()
                .map(u -> new UserSummary(u.getUsername(), u.getProfileImageKey()))
                .collect(Collectors.toList());

        return new SearchResponse(tags, users);
    }
}
