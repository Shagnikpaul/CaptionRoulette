package org.shagnik.backend.dto.user;

import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class UpdateProfileRequest {
    @Size(min = 3, max = 30, message = "Username must be between 3 and 30 characters")
    private String username;

    private String newPassword;
    private String confirmPassword;
    private String profileImageKey;
}
