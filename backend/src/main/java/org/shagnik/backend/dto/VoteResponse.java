package org.shagnik.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;

import java.util.UUID;

@Getter
@AllArgsConstructor
public class VoteResponse {
    private UUID captionId;
    private int netScore;
    private Integer myVote; // null if the user has no vote on this caption
}