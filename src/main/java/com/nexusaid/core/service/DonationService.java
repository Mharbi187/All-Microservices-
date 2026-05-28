package com.nexusaid.core.service;

import com.nexusaid.core.dto.DonationDtos.*;
import com.nexusaid.core.entity.Committee;
import com.nexusaid.core.entity.Donor;
import com.nexusaid.core.entity.User;
import com.nexusaid.core.entity.donations.Donation;
import com.nexusaid.core.entity.donations.DonationNeed;
import com.nexusaid.core.entity.donations.DonationReceipt;
import com.nexusaid.core.entity.donations.DonorNotification;
import com.nexusaid.core.repository.CommitteeRepository;
import com.nexusaid.core.repository.DonorRepository;
import com.nexusaid.core.repository.UserRepository;
import com.nexusaid.core.repository.donations.DonationNeedRepository;
import com.nexusaid.core.repository.donations.DonationReceiptRepository;
import com.nexusaid.core.repository.donations.DonationRepository;
import com.nexusaid.core.repository.donations.DonorNotificationRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class DonationService {

    private final DonationNeedRepository needRepository;
    private final DonationRepository donationRepository;
    private final DonationReceiptRepository receiptRepository;
    private final DonorNotificationRepository notificationRepository;
    private final DonorRepository donorRepository;
    private final CommitteeRepository committeeRepository;
    private final UserRepository userRepository;

    // --- NEEDS ---

    public List<DonationNeedDto> getAllActiveNeeds() {
        return needRepository.findByStatusNot("COMPLETED").stream()
                .map(this::mapToNeedDto)
                .collect(Collectors.toList());
    }

    @Transactional
    public DonationNeedDto createNeed(UUID committeeId, DonationNeedCreateDto dto) {
        Committee committee = committeeRepository.findById(committeeId)
                .orElseThrow(() -> new EntityNotFoundException("Committee not found"));

        DonationNeed need = new DonationNeed();
        need.setCommittee(committee);
        need.setType(dto.getType());
        need.setPriority(dto.getPriority());
        need.setDescription(dto.getDescription());
        need.setQuantityNeeded(dto.getQuantityNeeded());
        need.setBeneficiaries(dto.getBeneficiaries());
        need.setStatus("OPEN");

        need = needRepository.save(need);

        // Notify all donors (simplified logic for now)
        notifyAllDonorsOfNewNeed(need);

        return mapToNeedDto(need);
    }

    // --- DONATIONS ---

    @Transactional
    public DonationDto createDonation(UUID donorId, DonationCreateDto dto) {
        Donor donor = donorRepository.findById(donorId)
                .orElseThrow(() -> new EntityNotFoundException("Donor not found"));

        DonationNeed need = needRepository.findById(dto.getNeedId())
                .orElseThrow(() -> new EntityNotFoundException("Need not found"));

        Donation donation = new Donation();
        donation.setDonationNumber("DON-" + LocalDateTime.now().getYear() + "-" + (System.currentTimeMillis() % 100000));
        donation.setDonor(donor);
        donation.setNeed(need);
        donation.setDonationType(dto.getDonationType());
        donation.setDescription(dto.getDescription());
        donation.setQuantity(dto.getQuantity());
        donation.setNote(dto.getNote());
        donation.setPhotoUrl(dto.getPhotoUrl());
        donation.setStatus("PENDING_RECEPTION");

        donation = donationRepository.save(donation);

        // Increment donor stats (safely handle possible null values from database)
        Integer currentCount = donor.getTotalDonationsCount();
        donor.setTotalDonationsCount((currentCount != null ? currentCount : 0) + 1);
        donorRepository.save(donor);

        createNotification(donorId, "INFO", "Don soumis avec succès", "Votre don " + donation.getDonationNumber() + " est en attente de réception.", "/donor/receipts", null);

        return mapToDonationDto(donation);
    }

    // --- RECEIPTS & VALIDATION ---

    public List<DonationReceiptDto> getMyReceipts(UUID donorId) {
        List<Donation> donations = donationRepository.findByDonorIdOrderByCreatedAtDesc(donorId);
        return donations.stream().map(this::mapToReceiptDto).collect(Collectors.toList());
    }

    public DonationReceiptDto getDonationById(UUID id) {
        Donation donation = donationRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Donation not found"));
        return mapToReceiptDto(donation);
    }

    public DonationReceiptDto getDonationByNumber(String donationNumber) {
        Donation donation = donationRepository.findByDonationNumber(donationNumber)
                .orElseThrow(() -> new EntityNotFoundException("Donation not found"));
        return mapToReceiptDto(donation);
    }

    public List<DonationReceiptDto> getCommitteeDonations(UUID committeeId) {
        List<Donation> donations = donationRepository.findByNeedCommitteeIdOrderByCreatedAtDesc(committeeId);
        return donations.stream().map(this::mapToReceiptDto).collect(Collectors.toList());
    }

    @Transactional
    public DonationReceiptDto validateDonation(UUID donationId, UUID validatorId, String note) {
        Donation donation = donationRepository.findById(donationId)
                .orElseThrow(() -> new EntityNotFoundException("Donation not found"));
        
        User validator = userRepository.findById(validatorId)
                .orElseThrow(() -> new EntityNotFoundException("Validator not found"));

        donation.setStatus("VALIDATED");
        donationRepository.save(donation);

        DonationReceipt receipt = new DonationReceipt();
        receipt.setReceiptNumber("REC-" + LocalDateTime.now().getYear() + "-" + (System.currentTimeMillis() % 100000));
        receipt.setDonation(donation);
        receipt.setValidatedAt(LocalDateTime.now());
        receipt.setValidatedBy(validator);
        receipt.setValidationNote(note);

        receipt = receiptRepository.save(receipt);

        // Notify donor
        createNotification(
                donation.getDonor().getId(),
                "DON_VALIDE",
                "Don Validé !",
                "Votre don " + donation.getDonationNumber() + " a été validé. Reçu " + receipt.getReceiptNumber() + " disponible.",
                "/donor/receipts",
                null
        );

        return mapToReceiptDto(donation); // Using donation as it handles both with and without receipt
    }

    // --- STATS ---

    public DonorStatsDto getDonorStats(UUID donorId) {
        List<Donation> donations = donationRepository.findByDonorIdOrderByCreatedAtDesc(donorId);
        
        DonorStatsDto stats = new DonorStatsDto();
        stats.setTotalDonations(donations.size());
        stats.setValidatedDonations(donations.stream().filter(d -> "VALIDATED".equals(d.getStatus())).count());
        
        // Calculate zones covered (unique committee regions)
        long zones = donations.stream()
                .map(d -> d.getNeed().getCommittee().getRegion())
                .distinct()
                .count();
        stats.setZonesCovered(zones);

        // Calculate beneficiaries
        long beneficiaries = donations.stream()
                .filter(d -> d.getNeed().getBeneficiaries() != null)
                .mapToLong(d -> d.getNeed().getBeneficiaries())
                .sum();
        stats.setBeneficiariesHelped(beneficiaries);

        Map<String, Integer> byCat = new HashMap<>();
        donations.forEach(d -> {
            byCat.put(d.getDonationType(), byCat.getOrDefault(d.getDonationType(), 0) + 1);
        });
        stats.setDonationsByCategory(byCat);

        return stats;
    }

    // --- MAPPERS ---

    private DonationNeedDto mapToNeedDto(DonationNeed need) {
        DonationNeedDto dto = new DonationNeedDto();
        dto.setId(need.getId());
        dto.setCommitteeId(need.getCommittee().getId());
        dto.setCommitteeName(need.getCommittee().getName());
        dto.setCommitteeRegion(need.getCommittee().getRegion());
        dto.setType(need.getType());
        dto.setPriority(need.getPriority());
        dto.setDescription(need.getDescription());
        dto.setQuantityNeeded(need.getQuantityNeeded());
        dto.setBeneficiaries(need.getBeneficiaries());
        dto.setStatus(need.getStatus());
        dto.setPublishedAt(need.getPublishedAt());
        return dto;
    }

    private DonationDto mapToDonationDto(Donation donation) {
        DonationDto dto = new DonationDto();
        dto.setId(donation.getId());
        dto.setDonationNumber(donation.getDonationNumber());
        dto.setNeed(mapToNeedDto(donation.getNeed()));
        dto.setDonationType(donation.getDonationType());
        dto.setDescription(donation.getDescription());
        dto.setQuantity(donation.getQuantity());
        dto.setNote(donation.getNote());
        dto.setPhotoUrl(donation.getPhotoUrl());
        dto.setStatus(donation.getStatus());
        dto.setCreatedAt(donation.getCreatedAt());
        return dto;
    }

    private DonationReceiptDto mapToReceiptDto(Donation donation) {
        DonationReceiptDto dto = new DonationReceiptDto();
        dto.setDonationId(donation.getId());
        dto.setDonationNumber(donation.getDonationNumber());
        dto.setDonationType(donation.getDonationType());
        dto.setQuantity(donation.getQuantity());
        dto.setDescription(donation.getDescription());
        dto.setNeedId(donation.getNeed().getId());
        dto.setCommitteeName(donation.getNeed().getCommittee().getName());
        dto.setStatus(donation.getStatus());
        dto.setCreatedAt(donation.getCreatedAt());

        if (donation.getReceipt() != null) {
            dto.setId(donation.getReceipt().getId());
            dto.setReceiptNumber(donation.getReceipt().getReceiptNumber());
            dto.setValidatedAt(donation.getReceipt().getValidatedAt());
            dto.setValidationNote(donation.getReceipt().getValidationNote());
        }

        return dto;
    }

    // --- NOTIFICATIONS UTIL ---
    
    private void createNotification(UUID userId, String type, String title, String message, String link, Map<String, String> meta) {
        User user = userRepository.findById(userId).orElse(null);
        if (user == null) return;
        
        DonorNotification n = new DonorNotification();
        n.setUser(user);
        n.setType(type);
        n.setTitle(title);
        n.setMessage(message);
        n.setLink(link);
        n.setMetadata(meta);
        notificationRepository.save(n);
    }

    private void notifyAllDonorsOfNewNeed(DonationNeed need) {
        List<Donor> donors = donorRepository.findAll();
        for (Donor d : donors) {
            createNotification(
                    d.getId(),
                    "NOUVEAU_BESOIN",
                    "Nouveau Besoin URGENT",
                    need.getCommittee().getName() + " a publié un besoin urgent : " + need.getDescription(),
                    "/donor/map",
                    null
            );
        }
    }
}
