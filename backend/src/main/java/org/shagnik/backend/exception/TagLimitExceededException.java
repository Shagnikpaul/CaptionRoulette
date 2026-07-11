package org.shagnik.backend.exception;

public class TagLimitExceededException extends RuntimeException {
    public TagLimitExceededException(String message) {
        super(message);
    }
}