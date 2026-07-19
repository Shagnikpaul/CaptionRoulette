package org.shagnik.backend.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.shagnik.backend.dto.SearchResponse;
import org.shagnik.backend.entity.UserSummary;
import org.shagnik.backend.repository.TagRepository;
import org.shagnik.backend.repository.UserRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@Service
public class SearchService {

    private final TagRepository tagRepository;
    private final UserRepository userRepository;
    private final RedisService redisService;       // NEW
    private final ObjectMapper objectMapper;        // NEW

    private static final long SEARCH_CACHE_TTL_SECONDS = 1800; // 30 minutes

    public SearchService(TagRepository tagRepository,
                         UserRepository userRepository,
                         RedisService redisService,
                         ObjectMapper objectMapper) {
        this.tagRepository = tagRepository;
        this.userRepository = userRepository;
        this.redisService = redisService;
        this.objectMapper = objectMapper;
    }

    public SearchResponse search(String query) {
        if (query == null || query.isBlank()) {
            return new SearchResponse(List.of(), List.of());
        }

        // Normalize BEFORE using as both the cache key and the actual query,
        // so "AWS", " aws ", and "aws" all hit the same cache entry instead of
        // fragmenting into three separate keys for what's the same lookup.
        String normalized = query.trim().toLowerCase();
        String cacheKey = "search:query:" + normalized;

        String cached = redisService.get(cacheKey);
        if (cached != null) {
            try {
                return objectMapper.readValue(cached, SearchResponse.class);
            } catch (Exception e) {
                log.warn("Failed to deserialize cached search result for '{}': {}", normalized, e.getMessage());
                // fall through to live DB query below
            }
        }

        SearchResponse response = performSearch(normalized);

        try {
            redisService.setex(cacheKey, SEARCH_CACHE_TTL_SECONDS, objectMapper.writeValueAsString(response));
        } catch (Exception e) {
            log.warn("Failed to cache search result for '{}': {}", normalized, e.getMessage());
        }

        return response;
    }

    private SearchResponse performSearch(String normalized) {
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