package org.shagnik.backend.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class VoteRequest {

    @NotNull
    @Min(-1)
    @Max(1)
    private Integer value; // 1 = upvote, -1 = downvote, 0 = remove vote
}