package org.shagnik.backend.exception;

public class PostClosedException extends RuntimeException {
    public PostClosedException(String message) {
        super(message);
    }
}