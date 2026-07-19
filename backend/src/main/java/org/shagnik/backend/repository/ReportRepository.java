package org.shagnik.backend.repository;

import org.shagnik.backend.entity.Report;
import org.shagnik.backend.entity.ReportTargetType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

public interface ReportRepository extends JpaRepository<Report, UUID> {

    boolean existsByTargetTypeAndTargetIdAndReporterId(
            ReportTargetType targetType, UUID targetId, UUID reporterId);


    @Modifying
    @Query("DELETE FROM Report r WHERE r.targetType = :targetType AND r.targetId = :targetId")
    void deleteByTargetTypeAndTargetId(@Param("targetType") ReportTargetType targetType,
                                       @Param("targetId") UUID targetId);

    @Modifying
    @Query("DELETE FROM Report r WHERE r.targetType = :targetType AND r.targetId IN :targetIds")
    void deleteByTargetTypeAndTargetIdIn(@Param("targetType") ReportTargetType targetType,
                                         @Param("targetIds") List<UUID> targetIds);
}