package org.shagnik.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.UUID;

@Getter
@Setter
@AllArgsConstructor
public class CaptionResponse {

    private UUID id;
    private String text;
    private String authorUsername;
    private LocalDateTime createdAt;
    private int score;
    private Integer myVote;
}