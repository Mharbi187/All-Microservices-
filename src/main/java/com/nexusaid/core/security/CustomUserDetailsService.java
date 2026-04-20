package com.nexusaid.core.security;

import com.nexusaid.core.entity.CommitteeRole;
import com.nexusaid.core.entity.User;
import com.nexusaid.core.entity.Volunteer;
import com.nexusaid.core.repository.CommitteeRoleRepository;
import com.nexusaid.core.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class CustomUserDetailsService implements UserDetailsService {

    private final UserRepository userRepository;
    private final CommitteeRoleRepository committeeRoleRepository;

    @Autowired
    public CustomUserDetailsService(UserRepository userRepository, CommitteeRoleRepository committeeRoleRepository) {
        this.userRepository = userRepository;
        this.committeeRoleRepository = committeeRoleRepository;
    }

    @Override
    public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
        User user = userRepository.findByEmail(username)
                .orElseThrow(() -> new UsernameNotFoundException("User not found with email: " + username));

        // Load committee roles for Volunteer users
        List<CommitteeRole> roles = List.of();
        if (user instanceof Volunteer) {
            roles = committeeRoleRepository.findByVolunteerId(user.getId());
        }

        return new UserDetailsImpl(user, roles);
    }
}
