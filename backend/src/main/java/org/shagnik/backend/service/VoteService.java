package org.shagnik.backend.service;

import org.shagnik.backend.dto.VoteRequest;
import org.shagnik.backend.dto.VoteResponse;
import org.shagnik.backend.entity.Caption;
import org.shagnik.backend.entity.Post;
import org.shagnik.backend.entity.PostStatus;
import org.shagnik.backend.entity.User;
import org.shagnik.backend.entity.Vote;
import org.shagnik.backend.exception.ForbiddenActionException;
import org.shagnik.backend.exception.InvalidRequestException;
import org.shagnik.backend.exception.ResourceNotFoundException;
import org.shagnik.backend.repository.CaptionRepository;
import org.shagnik.backend.repository.VoteRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class VoteService {

    private final VoteRepository voteRepository;
    private final CaptionRepository captionRepository;
    private final AuthService authService;
    private final RedisService redisService;

    @Transactional
    public VoteResponse vote(UUID captionId, VoteRequest request, Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            throw new ForbiddenActionException("You must be logged in to vote");
        }
        User user = authService.getCurrentUser(authentication.getName());

        Caption caption = captionRepository.findById(captionId)
                .orElseThrow(() -> new ResourceNotFoundException("Caption not found: " + captionId));

        Post post = caption.getPost();

        if (post.getStatus() != PostStatus.OPEN) {
            throw new ForbiddenActionException("Voting is closed — this post has been settled");
        }

        if (caption.getAuthor().getId().equals(user.getId())) {
            throw new ForbiddenActionException("You cannot vote on your own caption");
        }

        // allow for now
//        if (post.getPoster().getId().equals(user.getId())) {
//            throw new ForbiddenActionException("You cannot vote on captions on your own post");
//        }

        int value = request.getValue();
        if (value != 1 && value != -1 && value != 0) {
            throw new InvalidRequestException("Vote value must be 1, -1, or 0");
        }

        Optional<Vote> existing = voteRepository.findByCaptionIdAndUserId(captionId, user.getId());

        if (value == 0) {
            existing.ifPresent(voteRepository::delete);
        } else if (existing.isPresent()) {
            Vote v = existing.get();
            v.setValue((short) value);
            voteRepository.save(v);
        } else {
            Vote v = new Vote();
            v.setCaption(caption);
            v.setUser(user);
            v.setValue((short) value);
            voteRepository.save(v);
        }

        int netScore = voteRepository.sumScoreByCaptionId(captionId).intValue();
        Integer myVote = value == 0 ? null : value;
        redisService.del(PostService.postCacheKey(post.getId()));
        return new VoteResponse(captionId, netScore, myVote);
    }
}