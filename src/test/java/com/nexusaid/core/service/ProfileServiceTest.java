package com.nexusaid.core.service;

import com.nexusaid.core.entity.User;
import com.nexusaid.core.entity.Volunteer;
import com.nexusaid.core.entity.enums.AccountStatus;
import com.nexusaid.core.entity.enums.RoleTitle;
import com.nexusaid.core.entity.enums.UserType;
import com.nexusaid.core.repository.CommitteeRepository;
import com.nexusaid.core.repository.CommitteeRoleRepository;
import com.nexusaid.core.repository.TrainerRepository;
import com.nexusaid.core.repository.UserRepository;
import com.nexusaid.core.repository.VolunteerRepository;
import com.nexusaid.core.service.CloudinaryService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.security.access.AccessDeniedException;

import java.util.Optional;
import java.util.UUID;

import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class ProfileServiceTest {

    @Mock
    private VolunteerRepository volunteerRepository;

    @Mock
    private CommitteeRoleRepository committeeRoleRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private CommitteeRepository committeeRepository;

    @Mock
    private TrainerRepository trainerRepository;

    @Mock
    private CloudinaryService cloudinaryService;

    @InjectMocks
    private ProfileService profileService;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
    }

    @Test
    void approveVolunteer_whenUserIsPresident_shouldApprove() {
        // Arrange
        UUID volunteerId = UUID.randomUUID();
        UUID presidentId = UUID.randomUUID();
        UUID committeeId = UUID.randomUUID();

        Volunteer volunteer = new Volunteer();
        volunteer.setId(volunteerId);
        volunteer.setCommitteeId(committeeId);
        volunteer.setAccountStatus(AccountStatus.PENDING);

        User presidentUser = new User();
        presidentUser.setId(presidentId);
        presidentUser.setType(UserType.VOLUNTEER);

        when(userRepository.findById(presidentId)).thenReturn(Optional.of(presidentUser));
        when(volunteerRepository.findById(volunteerId)).thenReturn(Optional.of(volunteer));
        when(committeeRoleRepository.existsByCommitteeIdAndTitleAndVolunteerId(
                committeeId, RoleTitle.PRESIDENT, presidentId)).thenReturn(true);

        // Act
        profileService.approveVolunteer(volunteerId, presidentId);

        // Assert
        assertEquals(AccountStatus.APPROVED, volunteer.getAccountStatus());
        verify(volunteerRepository, times(1)).save(volunteer);
    }

    @Test
    void approveVolunteer_whenUserIsNotPresident_shouldThrowException() {
        // Arrange
        UUID volunteerId = UUID.randomUUID();
        UUID normalUserId = UUID.randomUUID();
        UUID committeeId = UUID.randomUUID();

        Volunteer volunteer = new Volunteer();
        volunteer.setId(volunteerId);
        volunteer.setCommitteeId(committeeId);
        volunteer.setAccountStatus(AccountStatus.PENDING);

        User normalUser = new User();
        normalUser.setId(normalUserId);
        normalUser.setType(UserType.VOLUNTEER);

        when(userRepository.findById(normalUserId)).thenReturn(Optional.of(normalUser));
        when(volunteerRepository.findById(volunteerId)).thenReturn(Optional.of(volunteer));
        when(committeeRoleRepository.existsByCommitteeIdAndTitleAndVolunteerId(
                committeeId, RoleTitle.PRESIDENT, normalUserId)).thenReturn(false);

        // Act & Assert
        assertThrows(AccessDeniedException.class, () -> {
            profileService.approveVolunteer(volunteerId, normalUserId);
        });

        verify(volunteerRepository, never()).save(any());
    }

    @Test
    void markFirstLoginCompleted_shouldSetFlagAndSaveUser() {
        // Arrange
        UUID userId = UUID.randomUUID();
        User user = new User();
        user.setId(userId);
        user.setType(UserType.VOLUNTEER);
        user.setFirstLoginCompleted(false);

        when(userRepository.findById(userId)).thenReturn(Optional.of(user));

        // Act
        profileService.markFirstLoginCompleted(userId);

        // Assert
        assertTrue(user.isFirstLoginCompleted());
        verify(userRepository, times(1)).save(user);
    }
}
