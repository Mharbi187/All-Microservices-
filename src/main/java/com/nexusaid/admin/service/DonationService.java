package com.nexusaid.admin.service;

import com.nexusaid.admin.dto.DonationDtos.*;
import com.nexusaid.admin.entity.DonationNeed;
import com.nexusaid.admin.entity.InKindDonation;
import com.nexusaid.admin.entity.MonetaryDonation;
import com.nexusaid.admin.entity.enums.NeedsStatus;
import com.nexusaid.admin.event.EventPublisher;
import com.nexusaid.admin.repository.DonationNeedRepository;
import com.nexusaid.admin.repository.InKindDonationRepository;
import com.nexusaid.admin.repository.MonetaryDonationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class DonationService {

    private final DonationNeedRepository needRepository;
    private final MonetaryDonationRepository monetaryRepository;
    private final InKindDonationRepository inKindRepository;
    private final EventPublisher eventPublisher;

    // ─── Gestion des Besoins (Workflow) ───────────────────────────────────────

    @Transactional
    public DonationNeed createNeed(CreateNeedRequest request, UUID creatorId, String creatorName, String creatorRoleName) {
        DonationNeed need = DonationNeed.builder()
                .committeeId(request.getCommitteeId())
                .committeeType(request.getCommitteeType())
                .committeeName(request.getCommitteeName())
                .title(request.getTitle())
                .description(request.getDescription())
                .category(request.getCategory())
                .status(NeedsStatus.PENDING_VALIDATION) // Le workflow commence ici
                .targetAmount(request.getTargetAmount())
                .targetQuantity(request.getTargetQuantity())
                .currentAmount(BigDecimal.ZERO)
                .currentQuantity(0)
                .createdBy(creatorId)
                .creatorName(creatorName)
                .creatorRoleName(creatorRoleName)
                .build();
                
        DonationNeed saved = needRepository.save(need);
        eventPublisher.publishDonationNeedCreated(saved.getId(), saved.getCommitteeId(), saved.getTitle(), creatorId);
        return saved;
    }

    @Transactional
    public DonationNeed validateNeed(UUID needId, UUID validatorId, ValidateNeedRequest request) {
        DonationNeed need = needRepository.findById(needId)
                .orElseThrow(() -> new RuntimeException("Need not found"));

        if (!NeedsStatus.PENDING_VALIDATION.equals(need.getStatus())) {
            throw new RuntimeException("Need is not pending validation");
        }

        if ("VALIDATE".equalsIgnoreCase(request.getAction())) {
            need.setStatus(NeedsStatus.VALIDATED);
            need.setValidatedBy(validatorId);
            need.setValidatorName(request.getValidatorName());
            need.setValidatedAt(LocalDateTime.now());
            eventPublisher.publishDonationNeedValidated(need.getId(), need.getCommitteeId(), need.getTitle(), validatorId, need.getCreatedBy());
        } else if ("REJECT".equalsIgnoreCase(request.getAction())) {
            if (request.getReason() == null || request.getReason().trim().isEmpty()) {
                throw new RuntimeException("Rejection reason is mandatory");
            }
            need.setStatus(NeedsStatus.REJECTED);
            need.setRejectedBy(validatorId);
            need.setRejectorName(request.getValidatorName());
            need.setRejectedAt(LocalDateTime.now());
            need.setRejectionReason(request.getReason());
            eventPublisher.publishDonationNeedRejected(need.getId(), need.getTitle(), validatorId, request.getReason(), need.getCreatedBy());
        } else {
            throw new RuntimeException("Invalid action");
        }

        return needRepository.save(need);
    }

    // ─── Consultations avec RBAC ──────────────────────────────────────────────

    public Page<DonationNeed> getPendingNeeds(List<UUID> accessibleCommitteeIds, Pageable pageable) {
        return needRepository.findByCommitteeIdInAndStatus(accessibleCommitteeIds, NeedsStatus.PENDING_VALIDATION, pageable);
    }

    public Page<DonationNeed> getCommitteeNeeds(List<UUID> accessibleCommitteeIds, Pageable pageable) {
        return needRepository.findByCommitteeIdIn(accessibleCommitteeIds, pageable);
    }

    public List<DonationNeed> getMyCreatedNeeds(UUID userId) {
        return needRepository.findByCreatedBy(userId);
    }

    public List<DonationNeed> getActivePublicNeeds() {
        return needRepository.findByStatus(NeedsStatus.VALIDATED);
    }

    // ─── Traitement des Dons ──────────────────────────────────────────────────

    @Transactional
    public DonationReceiptResponse processMonetaryDonation(CreateMonetaryDonationRequest request, UUID receivedByVolunteer) {
        String receiptNum = "DON-MON-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
        String qrData = "NEXUSAID|" + receiptNum + "|" + request.getAmount() + "|" + request.getPaymentMethod();

        DonationNeed need = null;
        if (request.getNeedId() != null) {
            need = needRepository.findById(request.getNeedId()).orElse(null);
            if (need != null && need.getTargetAmount() != null) {
                BigDecimal current = need.getCurrentAmount() != null ? need.getCurrentAmount() : BigDecimal.ZERO;
                need.setCurrentAmount(current.add(request.getAmount()));
                if (need.getCurrentAmount().compareTo(need.getTargetAmount()) >= 0) {
                    need.setStatus(NeedsStatus.FULFILLED);
                }
                needRepository.save(need);
            }
        }

        MonetaryDonation donation = MonetaryDonation.builder()
                .donorId(request.getDonorId() != null ? request.getDonorId() : UUID.randomUUID())
                .donorName(request.getDonorName())
                .donorCin(request.getDonorCin())
                .need(need)
                .amount(request.getAmount())
                .currency(request.getCurrency() != null ? request.getCurrency() : "TND")
                .paymentMethod(request.getPaymentMethod())
                .receiptNumber(receiptNum)
                .receiptDate(LocalDate.now())
                .qrCodeData(qrData)
                .receivedBy(receivedByVolunteer)
                .build();

        monetaryRepository.save(donation);

        UUID committeeId = need != null ? need.getCommitteeId() : null;
        eventPublisher.publishDonationReceived(donation.getId(), donation.getDonorId(), "MONETARY", request.getAmount().doubleValue(), committeeId);
        
        String pdfLink = "/api/v1/admin/donations/receipts/pdf/" + receiptNum;
        if (request.getDonorEmail() != null && !request.getDonorEmail().isEmpty()) {
            eventPublisher.publishDonationFiscalReceipt(donation.getId(), donation.getDonorId(), pdfLink, request.getDonorEmail());
        }

        DonationReceiptResponse response = new DonationReceiptResponse();
        response.setReceiptNumber(receiptNum);
        response.setMessage("Don monétaire enregistré avec succès.");
        response.setQrCodeData(qrData);
        response.setPdfDownloadLink(pdfLink);
        return response;
    }

    @Transactional
    public DonationReceiptResponse processInKindDonation(CreateInKindDonationRequest request, UUID receivedByVolunteer) {
        String receiptNum = "DON-KIND-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
        String qrData = "NEXUSAID|" + receiptNum + "|INKIND";

        DonationNeed need = null;
        if (request.getNeedId() != null) {
            need = needRepository.findById(request.getNeedId()).orElse(null);
        }

        InKindDonation donation = InKindDonation.builder()
                .donorId(request.getDonorId() != null ? request.getDonorId() : UUID.randomUUID())
                .donorName(request.getDonorName())
                .donorCin(request.getDonorCin())
                .need(need)
                .itemsDescription(request.getItemsDescription())
                .receiptDate(LocalDate.now())
                .receiptNumber(receiptNum)
                .qrCodeData(qrData)
                .receivedBy(receivedByVolunteer)
                .build();

        inKindRepository.save(donation);

        UUID committeeId = need != null ? need.getCommitteeId() : null;
        eventPublisher.publishDonationReceived(donation.getId(), donation.getDonorId(), "INKIND", 0.0, committeeId);
        
        String pdfLink = "/api/v1/admin/donations/receipts/pdf/" + receiptNum;
        if (request.getDonorEmail() != null && !request.getDonorEmail().isEmpty()) {
            eventPublisher.publishDonationFiscalReceipt(donation.getId(), donation.getDonorId(), pdfLink, request.getDonorEmail());
        }

        DonationReceiptResponse response = new DonationReceiptResponse();
        response.setReceiptNumber(receiptNum);
        response.setMessage("Don en nature enregistré avec succès.");
        response.setQrCodeData(qrData);
        response.setPdfDownloadLink(pdfLink);
        return response;
    }

    public DonationStatsResponse getStats(List<UUID> committeeIds) {
        DonationStatsResponse stats = new DonationStatsResponse();
        stats.setCommitteeIds(committeeIds);
        stats.setPendingNeeds(needRepository.countByCommitteeIdInAndStatus(committeeIds, NeedsStatus.PENDING_VALIDATION));
        stats.setValidatedNeeds(needRepository.countByCommitteeIdInAndStatus(committeeIds, NeedsStatus.VALIDATED));
        stats.setRejectedNeeds(needRepository.countByCommitteeIdInAndStatus(committeeIds, NeedsStatus.REJECTED));
        stats.setFulfilledNeeds(needRepository.countByCommitteeIdInAndStatus(committeeIds, NeedsStatus.FULFILLED));
        stats.setTotalNeeds(stats.getPendingNeeds() + stats.getValidatedNeeds() + stats.getRejectedNeeds() + stats.getFulfilledNeeds());
        
        // On the real system, you would sum monetary and count in-kind for these committees.
        // For simplicity here we just use the need amount sum.
        stats.setTotalMonetaryReceived(needRepository.sumCurrentAmountByCommitteeIds(committeeIds));
        stats.setTotalInKindDonations(0); // Optional implementation
        
        return stats;
    }
}
