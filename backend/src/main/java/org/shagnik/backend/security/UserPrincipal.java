package org.shagnik.backend.security;

import org.shagnik.backend.entity.User;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.Collection;
import java.util.List;

public class UserPrincipal implements UserDetails {

    private final User user;

    public UserPrincipal(User user) {
        this.user = user;
    }

    // Gives access to the underlying entity when the full User object is needed
    public User getUser() {
        return user;
    }

    // Converts the enum role into a Spring Security authority (e.g. ROLE_USER)
    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return List.of(new SimpleGrantedAuthority("ROLE_" + user.getRole().name()));
    }

    // Returns the hashed password for Security's internal comparison
    @Override
    public String getPassword() {
        return user.getPasswordHash();
    }

    @Override
    public String getUsername() {
        return user.getUsername();
    }

    @Override
    public boolean isAccountNonExpired() {
        return true;
    }

    // Banned users are treated as "locked"
    @Override
    public boolean isAccountNonLocked() {
        return !user.isBanned();
    }

    @Override
    public boolean isCredentialsNonExpired() {
        return true;
    }

    // Banned users are treated as "disabled" — blocks login entirely
    @Override
    public boolean isEnabled() {
        return !user.isBanned();
    }
}