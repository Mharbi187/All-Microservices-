package com.nexusaid.core.service;

import com.nexusaid.core.entity.*;
import com.nexusaid.core.entity.enums.InterventionStatus;
import com.nexusaid.core.messaging.EventPublisher;
import com.nexusaid.core.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class InterventionService {

    private final InterventionRepository interventionRepo;
    private final InterventionParticipantRepository participantRepo;
    private final VolunteerRepository volunteerRepo;
    private final CommitteeRepository committeeRepo;
    private final EventPublisher eventPublisher;
    private final ApplicationEventPublisher applicationEventPublisher;

    // -- Domain events fired AFTER transaction commits --
    public record InterventionCreatedEvent(UUID id, String title, String type, UUID committeeId) {}
    public record InterventionClosedEvent(UUID id) {}

    public List<Intervention> findAll() {
        return interventionRepo.findAll();
    }

    public Intervention create(UUID committeeId, UUID responsibleId, Intervention intervention) {
        Committee committee = committeeRepo.findById(committeeId)
                .orElseThrow(() -> new RuntimeException("Committee not found"));
        intervention.setCommittee(committee);

        if (responsibleId != null) {
            Volunteer responsible = volunteerRepo.findById(responsibleId)
                    .orElseThrow(() -> new RuntimeException("Volunteer not found"));
            intervention.setResponsible(responsible);
        }

        intervention.setStatus(InterventionStatus.PLANNED);
        Intervention saved = interventionRepo.save(intervention);

        // CDC: Event fires ONLY after DB commit succeeds (TransactionalEventListener)
        applicationEventPublisher.publishEvent(new InterventionCreatedEvent(
                saved.getId(), saved.getTitle(),
                saved.getInterventionType() != null ? saved.getInterventionType().name() : "UNKNOWN",
                committeeId));

        return saved;
    }

    public List<Intervention> findByCommittee(UUID committeeId) {
        return interventionRepo.findByCommitteeId(committeeId);
    }

    public Intervention findById(UUID id) {
        return interventionRepo.findById(id)
                .orElseThrow(() -> new RuntimeException("Intervention not found"));
    }

    public List<Intervention> findByVolunteer(UUID volunteerId) {
        List<InterventionParticipant> participations = participantRepo.findByVolunteerId(volunteerId);
        return participations.stream().map(InterventionParticipant::getIntervention).toList();
    }

    @Transactional
    public Intervention startIntervention(UUID interventionId) {
        Intervention intervention = findById(interventionId);
        intervention.setStatus(InterventionStatus.IN_PROGRESS);
        return interventionRepo.save(intervention);
    }

    @Transactional
    public Intervention completeIntervention(UUID interventionId, String reportContent, Integer beneficiariesCount) {
        Intervention intervention = findById(interventionId);
        intervention.setStatus(InterventionStatus.COMPLETED);
        intervention.setReportContent(reportContent);
        if (beneficiariesCount != null)
            intervention.setBeneficiariesCount(beneficiariesCount);

        // Update hours for all participants
        List<InterventionParticipant> participants = participantRepo.findByInterventionId(interventionId);
        for (InterventionParticipant p : participants) {
            if (p.getAttended() && p.getHoursContributed() != null) {
                Volunteer v = p.getVolunteer();
                double current = v.getHoursVolunteered() != null ? v.getHoursVolunteered() : 0;
                v.setHoursVolunteered(current + p.getHoursContributed().doubleValue());
                volunteerRepo.save(v);
            }
        }

        intervention.setParticipantsCount(participants.size());
        Intervention completed = interventionRepo.save(intervention);

        // CDC: Event fires ONLY after DB commit succeeds (TransactionalEventListener)
        applicationEventPublisher.publishEvent(new InterventionClosedEvent(completed.getId()));

        return completed;
    }

    @Transactional
    public InterventionParticipant addParticipant(UUID interventionId, UUID volunteerId, String role,
            BigDecimal hours) {
        Intervention intervention = findById(interventionId);
        Volunteer volunteer = volunteerRepo.findById(volunteerId)
                .orElseThrow(() -> new RuntimeException("Volunteer not found"));

        InterventionParticipant participant = InterventionParticipant.builder()
                .intervention(intervention)
                .volunteer(volunteer)
                .role(role)
                .hoursContributed(hours != null ? hours : BigDecimal.ZERO)
                .attended(true)
                .build();

        return participantRepo.save(participant);
    }

    public List<InterventionParticipant> getParticipants(UUID interventionId) {
        return participantRepo.findByInterventionId(interventionId);
    }

    // -- Listeners: publish to RabbitMQ ONLY after DB commit --

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onInterventionCreated(InterventionCreatedEvent event) {
        log.info("[AFTER_COMMIT] Publishing intervention.created for {}", event.id());
        eventPublisher.publishInterventionCreated(event.id(), event.title(), event.type(), event.committeeId());
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onInterventionClosed(InterventionClosedEvent event) {
        log.info("[AFTER_COMMIT] Publishing intervention.closed for {}", event.id());
        eventPublisher.publishInterventionClosed(event.id());
    }
}
