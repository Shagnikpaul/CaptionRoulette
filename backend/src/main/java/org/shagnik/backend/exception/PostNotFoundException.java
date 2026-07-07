package org.shagnik.backend.exception;

import java.util.UUID;

/**
 * PostNotFound
 */
public class PostNotFoundException extends RuntimeException {
    public PostNotFoundException(String id) {
        super("Post not found: " + id);
    }
}
