package org.shagnik.backend.repository;

import org.shagnik.backend.entity.Vote;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface VoteRepository extends JpaRepository<Vote, UUID> {

    Optional<Vote> findByCaptionIdAndUserId(UUID captionId, UUID userId);

    @Query("SELECT COALESCE(SUM(v.value), 0) FROM Vote v WHERE v.caption.id = :captionId")
    Long sumScoreByCaptionId(@Param("captionId") UUID captionId);

    @Query("SELECT v.caption.id AS captionId, COALESCE(SUM(v.value), 0) AS score " +
            "FROM Vote v WHERE v.caption.id IN :captionIds GROUP BY v.caption.id")
    List<CaptionScoreProjection> getScoresForCaptions(@Param("captionIds") List<UUID> captionIds);

    List<Vote> findByCaptionIdInAndUserId(List<UUID> captionIds, UUID userId);

    long countByCaptionIdAndValue(UUID captionId, Short value);

    interface CaptionScoreProjection {
        UUID getCaptionId();
        Long getScore();
    }
}