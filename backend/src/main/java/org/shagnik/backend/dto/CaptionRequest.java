package org.shagnik.backend.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class CaptionRequest {

    @NotBlank(message = "Caption text is required")
    @Size(max = 280, message = "Caption text must be at most 280 characters")
    private String text;
}