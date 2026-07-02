package org.shagnik.backend.service;

import org.shagnik.backend.dto.auth.AuthResponse;
import org.shagnik.backend.dto.auth.LoginRequest;
import org.shagnik.backend.dto.auth.RegisterRequest;
import org.shagnik.backend.entity.User;
import org.shagnik.backend.entity.UserRole;
import org.shagnik.backend.exception.BannedUserException;
import org.shagnik.backend.exception.DuplicateResourceException;
import org.shagnik.backend.exception.InvalidCredentialsException;
import org.shagnik.backend.repository.UserRepository;
import org.shagnik.backend.security.JwtUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;
    private final AuthenticationManager authenticationManager;

    public void register(RegisterRequest request) {
        if (userRepository.existsByUsername(request.getUsername())) {
            throw new DuplicateResourceException("Username already taken");
        }
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new DuplicateResourceException("Email already registered");
        }

        User user = new User();
        user.setUsername(request.getUsername());
        user.setEmail(request.getEmail());
        user.setPasswordHash(passwordEncoder.encode(request.getPassword()));
        user.setRole(UserRole.USER);
        user.setBanned(false);

        userRepository.save(user);
    }

    public AuthResponse login(LoginRequest request) {
        // Resolve usernameOrEmail to an actual username, since
        // AuthenticationManager/UserDetailsService work by username
        User user = userRepository.findByUsernameOrEmail(
                request.getUsernameOrEmail(), request.getUsernameOrEmail()
        ).orElseThrow(() -> new InvalidCredentialsException("Invalid username or password"));

        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(user.getUsername(), request.getPassword())
        );

        if (user.isBanned()) {
            throw new BannedUserException("This account has been banned");
        }

        String token = jwtUtil.generateToken(user.getUsername());
        return new AuthResponse(token);
    }

    public User getCurrentUser(String username) {
        return userRepository.findByUsername(username)
                .orElseThrow(() -> new UsernameNotFoundException("User not found: " + username));
    }
}