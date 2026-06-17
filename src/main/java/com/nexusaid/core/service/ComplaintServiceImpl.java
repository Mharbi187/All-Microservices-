package com.nexusaid.core.service;

import com.nexusaid.core.dto.complaint.ComplaintAttachmentDto;
import com.nexusaid.core.dto.complaint.ComplaintCreateDto;
import com.nexusaid.core.dto.complaint.ComplaintDto;
import com.nexusaid.core.dto.complaint.ComplaintResponseDto;
import com.nexusaid.core.dto.complaint.ComplaintStatusUpdateDto;
import com.nexusaid.core.entity.*;
import com.nexusaid.core.entity.enums.ComplaintStatus;
import com.nexusaid.core.entity.enums.ComplaintVisibility;
import com.nexusaid.core.entity.enums.CommitteeType;
import com.nexusaid.core.repository.CommitteeRepository;
import com.nexusaid.core.repository.CommitteeRoleRepository;
import com.nexusaid.core.repository.ComplaintAttachmentRepository;
import com.nexusaid.core.repository.ComplaintRepository;
import com.nexusaid.core.repository.ComplaintResponseRepository;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ComplaintServiceImpl implements ComplaintService {

    private final ComplaintRepository complaintRepository;
    private final ComplaintAttachmentRepository attachmentRepository;
    private final ComplaintResponseRepository responseRepository;
    private final CommitteeRepository committeeRepository;
    private final CommitteeRoleRepository committeeRoleRepository;
    private final AuthService authService;
    private final CloudinaryService cloudinaryService;
    private final EmailService emailService;
    private final NotificationService notificationService;


    @Override
    @Transactional
    public ComplaintDto createComplaint(ComplaintCreateDto dto, List<MultipartFile> files) {
        User currentUser = authService.getCurrentUser();
        Committee targetCommittee = committeeRepository.findById(dto.getTargetCommitteeId())
                .orElseThrow(() -> new RuntimeException("Committee not found"));

        Complaint complaint = Complaint.builder()
                .subject(dto.getSubject())
                .message(dto.getMessage())
                .targetCommittee(targetCommittee)
                .submitter(currentUser)
                .visibility(dto.getVisibility() != null ? dto.getVisibility() : ComplaintVisibility.VISIBLE)
                .status(ComplaintStatus.EN_ATTENTE)
                .build();

        Complaint savedComplaint = complaintRepository.save(complaint);

        // Upload files to Cloudinary up to 5 max
        if (files != null && !files.isEmpty()) {
            if (files.size() > 5) {
                throw new RuntimeException("Maximum 5 files allowed");
            }
            for (MultipartFile file : files) {
                try {
                    Map<String, Object> uploadResult = cloudinaryService.uploadFile(
                            file.getBytes(),
                            "complaints/" + savedComplaint.getId(),
                            file.getOriginalFilename()
                    );
                    
                    ComplaintAttachment attachment = ComplaintAttachment.builder()
                            .complaint(savedComplaint)
                            .fileName(file.getOriginalFilename())
                            .fileUrl(uploadResult.get("secure_url").toString())
                            .publicId(uploadResult.get("public_id").toString())
                            .fileType(uploadResult.get("format") != null ? uploadResult.get("format").toString() : "unknown")
                            .build();
                    attachmentRepository.save(attachment);
                    savedComplaint.getAttachments().add(attachment);
                } catch (IOException e) {
                    throw new RuntimeException("Error uploading file to Cloudinary", e);
                }
            }
        }

        return mapToDto(savedComplaint, currentUser.getId());
    }

    @Override
    @Transactional(readOnly = true)
    public List<ComplaintDto> getMyComplaints() {
        User currentUser = authService.getCurrentUser();
        return complaintRepository.findBySubmitterIdOrderByCreatedAtDesc(currentUser.getId())
                .stream()
                .map(c -> mapToDto(c, currentUser.getId()))
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<ComplaintDto> getComplaintsByTargetCommittee(UUID committeeId) {
        // Here we'd verify if the current user is a PRESIDENT, SG, or VP of this committee.
        // For brevity and based on existing auth, we assume @PreAuthorize handles access
        User currentUser = authService.getCurrentUser();
        Committee committee = committeeRepository.findById(committeeId)
                .orElseThrow(() -> new RuntimeException("Committee not found"));

        List<UUID> targetCommitteeIds = new java.util.ArrayList<>();
        targetCommitteeIds.add(committeeId);

        if (committee.getType() == CommitteeType.REGIONAL) {
            for (Committee sub : committee.getSubCommittees()) {
                targetCommitteeIds.add(sub.getId());
            }
        }

        return complaintRepository.findByTargetCommitteeIdInOrderByCreatedAtDesc(targetCommitteeIds)
                .stream()
                .map(c -> mapToDto(c, currentUser.getId()))
                .collect(Collectors.toList());
    }


    @Override
    @Transactional(readOnly = true)
    public List<ComplaintDto> getAllComplaints() {
        // Only accessible by National President
        User currentUser = authService.getCurrentUser();
        return complaintRepository.findAll()
                .stream()
                .map(c -> mapToDto(c, currentUser.getId()))
                .collect(Collectors.toList());
    }

    private String translateStatus(ComplaintStatus status) {
        if (status == null) return "Inconnu";
        switch (status) {
            case EN_ATTENTE: return "En attente";
            case EN_COURS: return "En cours";
            case RESOLU: return "Résolu";
            case REJETE: return "Rejeté";
            default: return status.name();
        }
    }

    @Override
    @Transactional
    public ComplaintDto updateComplaintStatus(UUID complaintId, ComplaintStatusUpdateDto updateDto) {
        Complaint complaint = complaintRepository.findById(complaintId)
                .orElseThrow(() -> new RuntimeException("Complaint not found"));
                
        ComplaintStatus oldStatus = complaint.getStatus();
        ComplaintStatus newStatus = updateDto.getStatus();
        
        complaint.setStatus(newStatus);
        complaintRepository.save(complaint);
        
        User currentUser = authService.getCurrentUser();
        
        if (complaint.getSubmitter() != null && oldStatus != newStatus) {
            String managerName = complaint.getVisibility() == ComplaintVisibility.ANONYMOUS 
                    ? "Un responsable" 
                    : currentUser.getFullName();

            emailService.sendComplaintStatusChangedEmail(
                complaint.getSubmitter().getEmail(),
                complaint.getSubmitter().getFullName(),
                complaint.getSubject(),
                translateStatus(oldStatus),
                translateStatus(newStatus)
            );
            
            notificationService.sendNotification(
                complaint.getSubmitter(),
                "COMPLAINT_STATUS_CHANGED",
                "Statut de réclamation mis à jour",
                "Le statut de votre réclamation '" + complaint.getSubject() + "' a été changé de " 
                    + translateStatus(oldStatus) + " à " + translateStatus(newStatus) + " par " + managerName + ".",
                "/volunteer/complaints"
            );
        }
        
        if (updateDto.getResponseMessage() != null && !updateDto.getResponseMessage().isEmpty()) {
            addResponse(complaintId, updateDto.getResponseMessage());
        }

        return mapToDto(complaint, currentUser.getId());
    }

    @Override
    @Transactional
    public ComplaintDto addResponse(UUID complaintId, String message) {
        Complaint complaint = complaintRepository.findById(complaintId)
                .orElseThrow(() -> new RuntimeException("Complaint not found"));
        User currentUser = authService.getCurrentUser();

        ComplaintResponse response = ComplaintResponse.builder()
                .complaint(complaint)
                .responder(currentUser)
                .message(message)
                .build();
        
        responseRepository.save(response);
        complaint.getResponses().add(response);
        
        // Notify submitter if responder is not the submitter
        boolean isSubmitter = complaint.getSubmitter() != null && complaint.getSubmitter().getId().equals(currentUser.getId());
        if (!isSubmitter && complaint.getSubmitter() != null) {
            String responderName = complaint.getVisibility() == ComplaintVisibility.ANONYMOUS 
                    ? "Un responsable" 
                    : currentUser.getFullName();
                    
            emailService.sendComplaintResponseEmail(
                complaint.getSubmitter().getEmail(),
                complaint.getSubmitter().getFullName(),
                complaint.getSubject(),
                responderName,
                message
            );
            
            notificationService.sendNotification(
                complaint.getSubmitter(),
                "COMPLAINT_RESPONSE",
                "Nouvelle réponse à votre réclamation",
                "Une nouvelle réponse a été ajoutée à votre réclamation '" + complaint.getSubject() + "' par " + responderName + ".",
                "/volunteer/complaints"
            );
        }
        
        return mapToDto(complaint, currentUser.getId());
    }

    @Override
    @Transactional(readOnly = true)
    public ComplaintDto getComplaintById(UUID complaintId) {
        Complaint complaint = complaintRepository.findById(complaintId)
                .orElseThrow(() -> new RuntimeException("Complaint not found"));
        return mapToDto(complaint, authService.getCurrentUser().getId());
    }

    @Override
    @Transactional
    public ComplaintDto viewComplaint(UUID complaintId) {
        Complaint complaint = complaintRepository.findById(complaintId)
                .orElseThrow(() -> new RuntimeException("Complaint not found"));
        User currentUser = authService.getCurrentUser();
        
        boolean isSubmitter = complaint.getSubmitter() != null && complaint.getSubmitter().getId().equals(currentUser.getId());
        if (!isSubmitter && complaint.getSubmitter() != null) {
            String currentStatusStr = complaint.getStatus().name();
            if (complaint.getLastNotifiedStatus() == null || !complaint.getLastNotifiedStatus().equals(currentStatusStr)) {
                complaint.setLastNotifiedStatus(currentStatusStr);
                complaintRepository.save(complaint);
                
                String viewerName = complaint.getVisibility() == ComplaintVisibility.ANONYMOUS 
                        ? "Un responsable" 
                        : currentUser.getFullName();
                
                emailService.sendComplaintViewedEmail(
                    complaint.getSubmitter().getEmail(),
                    complaint.getSubmitter().getFullName(),
                    complaint.getSubject(),
                    viewerName
                );
                
                notificationService.sendNotification(
                    complaint.getSubmitter(),
                    "COMPLAINT_VIEWED",
                    "Réclamation consultée",
                    "Votre réclamation '" + complaint.getSubject() + "' a été consultée par " + viewerName + ".",
                    "/volunteer/complaints"
                );
            }
        }
        
        return mapToDto(complaint, currentUser.getId());
    }

    private ComplaintDto mapToDto(Complaint complaint, UUID currentUserId) {
        boolean isAnonymous = complaint.getVisibility() == ComplaintVisibility.ANONYMOUS;
        boolean isSubmitter = complaint.getSubmitter() != null && complaint.getSubmitter().getId().equals(currentUserId);
        
        String submitterType = "VOLONTAIRE";
        if (complaint.getSubmitter() != null) {
            boolean hasApprovedRole = committeeRoleRepository.findByVolunteerId(complaint.getSubmitter().getId())
                    .stream()
                    .anyMatch(r -> r.getStatus() == com.nexusaid.core.entity.enums.CommitteeRoleStatus.APPROVED);
            if (hasApprovedRole) {
                submitterType = "RESPONSABLE";
            }
        }

        List<ComplaintAttachmentDto> attachmentDtos = complaint.getAttachments().stream().map(a ->
                ComplaintAttachmentDto.builder()
                        .id(a.getId())
                        .fileName(a.getFileName())
                        .fileUrl(a.getFileUrl())
                        .fileType(a.getFileType())
                        .build()
        ).collect(Collectors.toList());

        List<ComplaintResponseDto> responseDtos = complaint.getResponses().stream().map(r ->
                ComplaintResponseDto.builder()
                        .id(r.getId())
                        .message(r.getMessage())
                        .createdAt(r.getCreatedAt())
                        .responderId(r.getResponder().getId())
                        .responderName(r.getResponder().getFullName())
                        .responderAvatar(r.getResponder().getAvatar())
                        .build()
        ).collect(Collectors.toList());

        return ComplaintDto.builder()
                .id(complaint.getId())
                .subject(complaint.getSubject())
                .message(complaint.getMessage())
                .visibility(complaint.getVisibility())
                .status(complaint.getStatus())
                .createdAt(complaint.getCreatedAt())
                .updatedAt(complaint.getUpdatedAt())
                .targetCommitteeId(complaint.getTargetCommittee().getId())
                .targetCommitteeName(complaint.getTargetCommittee().getName())
                // Hide submitter unless it's visible or the current user is the submitter
                .submitterId(isAnonymous && !isSubmitter ? null : (complaint.getSubmitter() != null ? complaint.getSubmitter().getId() : null))
                .submitterName(isAnonymous && !isSubmitter ? "Anonymous" : (complaint.getSubmitter() != null ? complaint.getSubmitter().getFullName() : "Anonymous"))
                .submitterType(submitterType)
                .attachments(attachmentDtos)
                .responses(responseDtos)
                .build();
    }
}
