package com.nexusaid.core.security;

import com.nexusaid.core.entity.CommitteeRole;
import com.nexusaid.core.entity.User;
import com.nexusaid.core.entity.enums.AccountStatus;
import lombok.Getter;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.ArrayList;
import java.util.Collection;
import java.util.List;

public class UserDetailsImpl implements UserDetails {

    @Getter
    private final User user;
    private final List<CommitteeRole> committeeRoles;

    public UserDetailsImpl(User user) {
        this.user = user;
        this.committeeRoles = List.of();
    }

    public UserDetailsImpl(User user, List<CommitteeRole> committeeRoles) {
        this.user = user;
        this.committeeRoles = committeeRoles != null ? committeeRoles : List.of();
    }

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        List<GrantedAuthority> authorities = new ArrayList<>();

        // Base role from UserType (VOLUNTEER, DONOR, etc.)
        authorities.add(new SimpleGrantedAuthority("ROLE_" + user.getType().name()));

        // Add CommitteeRole titles as additional authorities (PRESIDENT, RESP_SECOURISME, etc.)
        for (CommitteeRole role : committeeRoles) {
            authorities.add(new SimpleGrantedAuthority("ROLE_" + role.getTitle().name()));
        }

        return authorities;
    }

    @Override
    public String getPassword() {
        return user.getPassword();
    }

    @Override
    public String getUsername() {
        return user.getEmail();
    }

    @Override
    public boolean isAccountNonExpired() {
        return true;
    }

    @Override
    public boolean isAccountNonLocked() {
        return user.getAccountStatus() != AccountStatus.SUSPENDED;
    }

    @Override
    public boolean isCredentialsNonExpired() {
        return true;
    }

    @Override
    public boolean isEnabled() {
        return user.getAccountStatus() == AccountStatus.APPROVED;
    }
}
