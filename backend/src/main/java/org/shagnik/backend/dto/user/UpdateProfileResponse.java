package org.shagnik.backend.dto.user;

import org.shagnik.backend.dto.auth.UserProfileResponse;
import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public class UpdateProfileResponse {
    private UserProfileResponse user;
    private String accessToken;
}
