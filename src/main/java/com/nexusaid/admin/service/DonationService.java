package com.nexusaid.admin.service;

import com.nexusaid.admin.dto.DonationDtos.*;
import com.nexusaid.admin.entity.DonationNeed;
import com.nexusaid.admin.entity.InKindDonation;
import com.nexusaid.admin.entity.MonetaryDonation;
import com.nexusaid.admin.entity.enums.NeedsStatus;
import com.nexusaid.admin.repository.DonationNeedRepository;
import com.nexusaid.admin.repository.InKindDonationRepository;
import com.nexusaid.admin.repository.MonetaryDonationRepository;
import com.nexusaid.admin.event.EventPublisher;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class DonationService {

    private final DonationNeedRepository needRepository;
    private final MonetaryDonationRepository monetaryRepository;
    private final InKindDonationRepository inKindRepository;
    private final EventPublisher eventPublisher;

    public DonationNeed createNeed(CreateNeedRequest request, UUID creatorRoleOrUserId, String creatorRoleName) {
        DonationNeed need = DonationNeed.builder()
                .committeeId(request.getCommitteeId())
                .title(request.getTitle())
                .description(request.getDescription())
                .category(request.getCategory())
                .status(NeedsStatus.ACTIVE)
                .targetAmount(request.getTargetAmount())
                .targetQuantity(request.getTargetQuantity())
                .createdByRole(creatorRoleOrUserId)
                .creatorRoleName(creatorRoleName)
                .build();
        return needRepository.save(need);
    }

    public List<DonationNeed> getActiveNeeds() {
        return needRepository.findByStatus(NeedsStatus.ACTIVE);
    }

    @Transactional
    public DonationReceiptResponse processMonetaryDonation(CreateMonetaryDonationRequest request,
            UUID receivedByVolunteer) {
        String receiptNum = "DON-MON-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
        String qrData = "NEXUSAID|" + receiptNum + "|" + request.getAmount() + "|" + request.getPaymentMethod();

        DonationNeed need = null;
        if (request.getNeedId() != null) {
            need = needRepository.findById(request.getNeedId()).orElse(null);
            if (need != null && need.getTargetAmount() != null) {
                // Update amount
                float current = need.getCurrentAmount() == null ? 0 : need.getCurrentAmount().floatValue();
                need.setCurrentAmount(java.math.BigDecimal.valueOf(current + request.getAmount().floatValue()));
                if (need.getCurrentAmount().compareTo(need.getTargetAmount()) >= 0) {
                    need.setStatus(NeedsStatus.FULFILLED);
                }
                needRepository.save(need);
            }
        }

        MonetaryDonation donation = MonetaryDonation.builder()
                .donorId(request.getDonorId() != null ? request.getDonorId() : UUID.randomUUID()) // Keep track or dummy
                .donorName(request.getDonorName())
                .donorCin(request.getDonorCin())
                .need(need)
                .amount(request.getAmount())
                .paymentMethod(request.getPaymentMethod())
                .receiptNumber(receiptNum)
                .receiptDate(LocalDate.now())
                .qrCodeData(qrData)
                .receivedBy(receivedByVolunteer)
                .build();

        monetaryRepository.save(donation);

        // CDC Hook
        eventPublisher.publishDonationReceived(donation.getId(), donation.getDonorId(), "MONETARY",
                request.getAmount().doubleValue());

        DonationReceiptResponse response = new DonationReceiptResponse();
        response.setReceiptNumber(receiptNum);
        response.setMessage("Don monétaire enregistré avec succès.");
        response.setQrCodeData(qrData);
        response.setPdfDownloadLink("/api/v1/admin/donations/receipts/pdf/" + receiptNum);
        return response;
    }

    @Transactional
    public DonationReceiptResponse processInKindDonation(CreateInKindDonationRequest request,
            UUID receivedByVolunteer) {
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

        // CDC Hook
        eventPublisher.publishDonationReceived(donation.getId(), donation.getDonorId(), "INKIND", 0.0);

        DonationReceiptResponse response = new DonationReceiptResponse();
        response.setReceiptNumber(receiptNum);
        response.setMessage("Don en nature enregistré avec succès.");
        response.setQrCodeData(qrData);
        response.setPdfDownloadLink("/api/v1/admin/donations/receipts/pdf/" + receiptNum);
        return response;
    }
}
