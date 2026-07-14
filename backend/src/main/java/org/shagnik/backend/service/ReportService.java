package org.shagnik.backend.service;

import lombok.RequiredArgsConstructor;
import org.shagnik.backend.dto.ReportRequest;
import org.shagnik.backend.dto.ReportResponse;
import org.shagnik.backend.entity.Report;
import org.shagnik.backend.entity.User;
import org.shagnik.backend.exception.DuplicateResourceException;
import org.shagnik.backend.exception.ResourceNotFoundException;
import org.shagnik.backend.repository.CaptionRepository;
import org.shagnik.backend.repository.PostRepository;
import org.shagnik.backend.repository.ReportRepository;
import org.shagnik.backend.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class ReportService {

    private final ReportRepository reportRepository;
    private final PostRepository postRepository;
    private final CaptionRepository captionRepository;
    private final UserRepository userRepository;

    @Transactional
    public ReportResponse submitReport(String username, ReportRequest request) {
        User reporter = userRepository.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + username));

        // Verify the target actually exists
        boolean targetExists = switch (request.getTargetType()) {
            case POST -> postRepository.existsById(request.getTargetId());
            case CAPTION -> captionRepository.existsById(request.getTargetId());
        };
        if (!targetExists) {
            throw new ResourceNotFoundException(
                    request.getTargetType() + " not found: " + request.getTargetId());
        }

        // Prevent duplicate reports from the same user on the same target
        if (reportRepository.existsByTargetTypeAndTargetIdAndReporterId(
                request.getTargetType(), request.getTargetId(), reporter.getId())) {
            throw new DuplicateResourceException(
                    "You have already reported this " + request.getTargetType().name().toLowerCase());
        }

        Report report = new Report();
        report.setTargetType(request.getTargetType());
        report.setTargetId(request.getTargetId());
        report.setReporter(reporter);
        report.setReason(request.getReason());

        report = reportRepository.save(report);
        return toResponse(report);
    }

    private ReportResponse toResponse(Report r) {
        return new ReportResponse(
                r.getId(),
                r.getTargetType(),
                r.getTargetId(),
                r.getReporter().getUsername(),
                r.getReason(),
                r.getStatus(),
                r.getCreatedAt()
        );
    }
}