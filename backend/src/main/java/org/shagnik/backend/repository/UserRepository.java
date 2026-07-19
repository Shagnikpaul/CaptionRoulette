package org.shagnik.backend.repository;


import org.shagnik.backend.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
@Repository
public interface UserRepository extends JpaRepository<User, UUID> {
    // Find a user by their username
    Optional<User> findByUsername(String username);

    // Find a user by their email
    Optional<User> findByEmail(String email);
    Optional<User> findByUsernameOrEmail(String username, String email);

    List<User> findTop10ByUsernameContainingIgnoreCaseOrderByUsernameAsc(String query);

    // Check if a username or email already exists
    boolean existsByUsername(String username);
    boolean existsByEmail(String email);
}
