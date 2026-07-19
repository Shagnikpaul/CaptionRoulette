package org.shagnik.backend.service;

import io.lettuce.core.KeyValue;
import io.lettuce.core.RedisClient;
import io.lettuce.core.api.StatefulRedisConnection;
import io.lettuce.core.api.sync.RedisCommands;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import jakarta.annotation.PreDestroy;
import java.util.*;

@Slf4j
@Service
public class RedisService {

    private final RedisClient redisClient;
    private final StatefulRedisConnection<String, String> connection;
    private final boolean enabled;

    public RedisService(@Value("${REDIS_URL:}") String redisUrl) {
        boolean hasCredentials = redisUrl != null && !redisUrl.isBlank()
                && !redisUrl.contains("your-upstash-redis-url")
                && (redisUrl.startsWith("redis://") || redisUrl.startsWith("rediss://"));

        RedisClient client = null;
        StatefulRedisConnection<String, String> conn = null;
        boolean isEnabled = false;

        if (hasCredentials) {
            try {
                log.info("Connecting to Redis (Lettuce) at: {}", redisUrl.replaceAll(":([^@]+)@", ":****@")); // hide password in logs
                client = RedisClient.create(redisUrl);
                conn = client.connect();
                isEnabled = true;
                log.info("Redis Lettuce connection initialized successfully.");
            } catch (Exception e) {
                log.error("Failed to initialize Redis Lettuce connection. Redis features will be disabled.", e);
                if (client != null) {
                    try {
                        client.shutdown();
                    } catch (Exception ex) {
                        // ignore
                    }
                    client = null;
                }
                conn = null;
            }
        } else {
            log.warn("Redis is DISABLED because REDIS_URL environment variable is missing, invalid, or set to placeholder.");
        }

        this.redisClient = client;
        this.connection = conn;
        this.enabled = isEnabled;
    }

    public boolean isEnabled() {
        return enabled;
    }

    private RedisCommands<String, String> getCommands() {
        if (!enabled || connection == null) {
            return null;
        }
        return connection.sync();
    }

    public String get(String key) {
        RedisCommands<String, String> commands = getCommands();
        if (commands == null) {
            return null;
        }
        try {
            return commands.get(key);
        } catch (Exception e) {
            log.warn("Redis GET failed for key {}: {}", key, e.getMessage());
            return null;
        }
    }

    public void set(String key, String value) {
        RedisCommands<String, String> commands = getCommands();
        if (commands == null) {
            return;
        }
        try {
            commands.set(key, value);
        } catch (Exception e) {
            log.warn("Redis SET failed for key {}: {}", key, e.getMessage());
        }
    }

    public void setex(String key, long seconds, String value) {
        RedisCommands<String, String> commands = getCommands();
        if (commands == null) {
            return;
        }
        try {
            commands.setex(key, seconds, value);
        } catch (Exception e) {
            log.warn("Redis SETEX failed for key {}: {}", key, e.getMessage());
        }
    }

    public void del(String key) {
        RedisCommands<String, String> commands = getCommands();
        if (commands == null) {
            return;
        }
        try {
            commands.del(key);
        } catch (Exception e) {
            log.warn("Redis DEL failed for key {}: {}", key, e.getMessage());
        }
    }

    public Long incr(String key) {
        RedisCommands<String, String> commands = getCommands();
        if (commands == null) {
            return null;
        }
        try {
            return commands.incr(key);
        } catch (Exception e) {
            log.warn("Redis INCR failed for key {}: {}", key, e.getMessage());
            return null;
        }
    }

    public void expire(String key, long seconds) {
        RedisCommands<String, String> commands = getCommands();
        if (commands == null) {
            return;
        }
        try {
            commands.expire(key, seconds);
        } catch (Exception e) {
            log.warn("Redis EXPIRE failed for key {}: {}", key, e.getMessage());
        }
    }

    public List<String> mget(List<String> keys) {
        if (keys == null || keys.isEmpty()) {
            return Collections.emptyList();
        }
        RedisCommands<String, String> commands = getCommands();
        if (commands == null) {
            return new ArrayList<>(Collections.nCopies(keys.size(), null));
        }
        try {
            return commands.mget(keys.toArray(new String[0])).stream()
                    .map(kv -> kv.hasValue() ? kv.getValue() : null)
                    .toList();
        } catch (Exception e) {
            log.warn("Redis MGET failed for keys {}: {}", keys, e.getMessage());
            return new ArrayList<>(Collections.nCopies(keys.size(), null));
        }
    }

    @PreDestroy
    public void shutdown() {
        log.info("Shutting down Redis connections...");
        try {
            if (connection != null) {
                connection.close();
            }
        } catch (Exception e) {
            // ignore
        }
        try {
            if (redisClient != null) {
                redisClient.shutdown();
            }
        } catch (Exception e) {
            // ignore
        }
    }
}
