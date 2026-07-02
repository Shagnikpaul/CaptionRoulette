package org.shagnik.backend.dto.auth;

import org.shagnik.backend.entity.UserRole;
import lombok.AllArgsConstructor;
import lombok.Getter;

import java.time.LocalDateTime;
import java.util.UUID;

@Getter
@AllArgsConstructor
public class UserProfileResponse {

    private UUID id;
    private String username;
    private String email;
    private UserRole role;
    private boolean banned;
    private LocalDateTime createdAt;
}
