package org.shagnik.backend.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.shagnik.backend.exception.RateLimitExceededException;

@Service
@RequiredArgsConstructor
public class RateLimitService {

    private final RedisService redisService;

    public void enforce(String action, String username, int maxRequests, long windowSeconds) {
        if (!redisService.isEnabled()) {
            return; // fail open
        }
        String key = "rate:limit:" + action + ":" + username;
        Long count = redisService.incr(key);
        if (count == null) {
            return; // redis call itself failed — fail open
        }
        if (count == 1L) {
            redisService.expire(key, windowSeconds);
        }
        if (count > maxRequests) {
            throw new RateLimitExceededException(
                    "Rate limit exceeded for " + action + ". Please try again later."
            );
        }
    }
}