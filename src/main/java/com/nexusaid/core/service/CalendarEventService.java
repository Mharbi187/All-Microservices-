package com.nexusaid.core.service;

import com.nexusaid.core.dto.CalendarEventCreateDTO;
import com.nexusaid.core.dto.CalendarEventDTO;
import com.nexusaid.core.entity.CalendarEvent;
import com.nexusaid.core.entity.Committee;
import com.nexusaid.core.entity.User;
import com.nexusaid.core.entity.Volunteer;
import com.nexusaid.core.entity.enums.CommitteeType;
import com.nexusaid.core.repository.CalendarEventRepository;
import com.nexusaid.core.repository.CommitteeRepository;
import com.nexusaid.core.repository.UserRepository;
import com.nexusaid.core.repository.VolunteerRepository;
import com.nexusaid.core.entity.enums.UserType;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class CalendarEventService {

    private final CalendarEventRepository eventRepository;
    private final UserRepository userRepository;
    private final CommitteeRepository committeeRepository;
    private final VolunteerRepository volunteerRepository;
    private final AuthService authService;

    @Transactional(readOnly = true)
    public List<CalendarEventDTO> getUpcomingEvents() {
        User currentUser = authService.getCurrentUser();
        UUID committeeId = null;

        if (currentUser.getType() == UserType.VOLUNTEER) {
            Volunteer volunteer = volunteerRepository.findById(currentUser.getId()).orElse(null);
            if (volunteer != null && volunteer.getCommitteeId() != null) {
                committeeId = volunteer.getCommitteeId();
            }
        }

        List<CalendarEvent> events;
        if (committeeId != null) {
            events = eventRepository.findUpcomingEvents(committeeId, OffsetDateTime.now());
        } else {
            events = eventRepository.findAllOrdered();
        }

        return events.stream()
                .map(event -> mapToDTO(event, currentUser.getId()))
                .collect(Collectors.toList());
    }

    @Transactional
    public CalendarEventDTO createEvent(CalendarEventCreateDTO createDTO) {
        User currentUser = authService.getCurrentUser();

        Committee committee = null;
        if (createDTO.getCommitteeId() != null) {
            committee = committeeRepository.findById(createDTO.getCommitteeId())
                    .orElseThrow(() -> new IllegalArgumentException("Committee not found"));
        }

        // Déterminer la portée hiérarchique
        CommitteeType scope = CommitteeType.LOCAL;
        if (createDTO.getTargetScope() != null) {
            try { scope = CommitteeType.valueOf(createDTO.getTargetScope()); } catch (Exception ignored) {}
        }

        // Événements NATIONAL : auto-validés
        String status = scope == CommitteeType.NATIONAL ? "VALIDE" : "EN_ATTENTE";

        CalendarEvent event = CalendarEvent.builder()
                .title(createDTO.getTitle())
                .description(createDTO.getDescription())
                .type(createDTO.getType() == null ? "EVENT" : createDTO.getType())
                .startDate(createDTO.getStartDate())
                .endDate(createDTO.getEndDate())
                .location(createDTO.getLocation())
                .maxParticipants(createDTO.getMaxParticipants())
                .organizer(currentUser)
                .committee(committee)
                .targetScope(scope)
                .status(status)
                .build();

        CalendarEvent saved = eventRepository.save(event);
        return mapToDTO(saved, currentUser.getId());
    }

    @Transactional
    public CalendarEventDTO registerForEvent(UUID eventId) {
        User currentUser = authService.getCurrentUser();
        Volunteer volunteer = volunteerRepository.findById(currentUser.getId())
                .orElseThrow(() -> new IllegalArgumentException("Only volunteers can register for events"));

        CalendarEvent event = eventRepository.findById(eventId)
                .orElseThrow(() -> new IllegalArgumentException("Event not found"));

        if (event.getMaxParticipants() != null && event.getParticipants().size() >= event.getMaxParticipants() && !event.getParticipants().contains(volunteer)) {
            throw new IllegalStateException("Event is already full");
        }

        if (event.getParticipants().contains(volunteer)) {
            event.getParticipants().remove(volunteer); // Unregister
        } else {
            event.getParticipants().add(volunteer); // Register
        }

        CalendarEvent saved = eventRepository.save(event);
        return mapToDTO(saved, currentUser.getId());
    }

    @Transactional
    public void deleteEvent(UUID eventId) {
        eventRepository.deleteById(eventId);
    }

    private CalendarEventDTO mapToDTO(CalendarEvent entity, UUID currentUserId) {
        CalendarEventDTO dto = new CalendarEventDTO();
        dto.setId(entity.getId());
        dto.setTitle(entity.getTitle());
        dto.setDescription(entity.getDescription());
        dto.setType(entity.getType());
        dto.setStartDate(entity.getStartDate());
        dto.setEndDate(entity.getEndDate());
        dto.setLocation(entity.getLocation());
        dto.setOrganizerName(entity.getOrganizer().getFullName());
        dto.setCommitteeId(entity.getCommittee() != null ? entity.getCommittee().getId() : null);
        dto.setCommitteeName(entity.getCommittee() != null ? entity.getCommittee().getName() : null);
        dto.setMaxParticipants(entity.getMaxParticipants());
        dto.setRegisteredCount(entity.getParticipants().size());
        dto.setTargetScope(entity.getTargetScope() != null ? entity.getTargetScope().name() : "LOCAL");
        dto.setStatus(entity.getStatus());

        boolean isRegistered = entity.getParticipants().stream()
                .anyMatch(v -> v.getId().equals(currentUserId));
        dto.setRegistered(isRegistered);

        return dto;
    }
}
