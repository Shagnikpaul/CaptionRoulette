package org.shagnik.backend.exception;

public class InvalidImageKeyException extends RuntimeException {
    public InvalidImageKeyException(String message) {
        super(message);
    }
}