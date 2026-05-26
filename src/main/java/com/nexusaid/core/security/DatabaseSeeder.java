package com.nexusaid.core.security;

import com.nexusaid.core.entity.Committee;
import com.nexusaid.core.entity.CommitteeRole;
import com.nexusaid.core.entity.Volunteer;
import com.nexusaid.core.entity.enums.AccountStatus;
import com.nexusaid.core.entity.enums.CommitteeType;
import com.nexusaid.core.entity.enums.RoleTitle;
import com.nexusaid.core.entity.enums.UserType;
import com.nexusaid.core.repository.CommitteeRepository;
import com.nexusaid.core.repository.CommitteeRoleRepository;
import com.nexusaid.core.repository.VolunteerRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.password.PasswordEncoder;

import com.nexusaid.core.entity.donations.DonationNeed;
import com.nexusaid.core.entity.donations.Donation;
import com.nexusaid.core.entity.donations.DonationReceipt;
import com.nexusaid.core.repository.donations.DonationNeedRepository;
import com.nexusaid.core.repository.donations.DonationRepository;
import com.nexusaid.core.repository.donations.DonationReceiptRepository;
import com.nexusaid.core.repository.DonorRepository;
import com.nexusaid.core.repository.UserRepository;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Configuration
@RequiredArgsConstructor
public class DatabaseSeeder {

    @Bean
    public CommandLineRunner seedDatabase(
            CommitteeRepository committeeRepository,
            VolunteerRepository volunteerRepository,
            CommitteeRoleRepository roleRepository,
            PasswordEncoder passwordEncoder) {
        return args -> {
            if (committeeRepository.count() > 0) {
                System.out.println("Database already seeded. Skipping initialization.");
                return;
            }

            System.out.println("Starting Database Seeding (Hierarchy & Roles)...");

            // 1. Create Committee Hierarchy
            Committee national = new Committee();
            national.setName("CRT National Hub");
            national.setType(CommitteeType.NATIONAL);
            national.setRegion("Tunisia");
            national = committeeRepository.save(national);

            Committee regional = new Committee();
            regional.setName("Comité Régional de Tunis");
            regional.setType(CommitteeType.REGIONAL);
            regional.setRegion("Tunis");
            regional.setParentCommittee(national);
            regional = committeeRepository.save(regional);

            Committee local = new Committee();
            local.setName("Comité Local d'Ariana");
            local.setType(CommitteeType.LOCAL);
            local.setRegion("Ariana");
            local.setParentCommittee(regional);
            local = committeeRepository.save(local);

            // 2. Create the 3 Presidents (National, Regional, Local)
            Volunteer natPres = createVolunteer("president.national@crt.tn", "National President", passwordEncoder,
                    volunteerRepository, national);
            assignRole(national, natPres, RoleTitle.PRESIDENT, roleRepository);

            Volunteer regPres = createVolunteer("president.tunis@crt.tn", "Regional President Tunis", passwordEncoder,
                    volunteerRepository, regional);
            assignRole(regional, regPres, RoleTitle.PRESIDENT, roleRepository);

            Volunteer locPres = createVolunteer("president.ariana@crt.tn", "Local President Ariana", passwordEncoder,
                    volunteerRepository, local);
            assignRole(local, locPres, RoleTitle.PRESIDENT, roleRepository);

            // 3. Populate ALL 11 Roles in the Local Committee
            assignRole(local,
                    createVolunteer("vp.ariana@crt.tn", "Vice President", passwordEncoder, volunteerRepository, local),
                    RoleTitle.VICE_PRESIDENT, roleRepository);
            assignRole(local, createVolunteer("sg.ariana@crt.tn", "Secrétaire Général", passwordEncoder,
                    volunteerRepository, local), RoleTitle.SECRETAIRE_GENERAL, roleRepository);
            assignRole(local, createVolunteer("sec.ariana@crt.tn", "Responsable Secourisme", passwordEncoder,
                    volunteerRepository, local), RoleTitle.RESP_SECOURISME, roleRepository);
            assignRole(local, createVolunteer("diff.ariana@crt.tn", "Responsable Diffusion", passwordEncoder,
                    volunteerRepository, local), RoleTitle.RESP_DIFFUSION, roleRepository);
            assignRole(local, createVolunteer("jeu.ariana@crt.tn", "Responsable Jeunesse", passwordEncoder,
                    volunteerRepository, local), RoleTitle.RESP_JEUNESSE, roleRepository);
            assignRole(local, createVolunteer("san.ariana@crt.tn", "Responsable Santé", passwordEncoder,
                    volunteerRepository, local), RoleTitle.RESP_SANTE, roleRepository);
            assignRole(local, createVolunteer("cat.ariana@crt.tn", "Responsable Catastrophes", passwordEncoder,
                    volunteerRepository, local), RoleTitle.RESP_CATASTROPHES, roleRepository);
            assignRole(local, createVolunteer("soc.ariana@crt.tn", "Responsable Action Sociale", passwordEncoder,
                    volunteerRepository, local), RoleTitle.RESP_ACTION_SOCIALE, roleRepository);
            assignRole(local, createVolunteer("imm.ariana@crt.tn", "Responsable Immigration", passwordEncoder,
                    volunteerRepository, local), RoleTitle.RESP_IMMIGRATION, roleRepository);
            assignRole(local, createVolunteer("vff.ariana@crt.tn", "Responsable VFF", passwordEncoder,
                    volunteerRepository, local), RoleTitle.RESP_VFF, roleRepository);

            System.out.println("Database Seeding Complete!");
            System.out.println("Login with: president.national@crt.tn / pass");
            System.out.println("Login with: president.tunis@crt.tn / pass");
            System.out.println("Login with: president.ariana@crt.tn / pass");
            System.out.println("Login with: sec.ariana@crt.tn / pass (Responsable Secourisme)");
        };
    }

    private Volunteer createVolunteer(String email, String fullName, PasswordEncoder encoder, VolunteerRepository repo,
            Committee committee) {
        Volunteer v = new Volunteer();
        v.setEmail(email);
        v.setFullName(fullName);
        v.setPassword(encoder.encode("pass"));
        v.setCin(String.valueOf(System.currentTimeMillis()).substring(3));
        v.setPhone("12345678");
        v.setType(UserType.VOLUNTEER);
        v.setAccountStatus(AccountStatus.APPROVED); // Auto-approve for seeding
        v.setMatricule("MAT-" + System.currentTimeMillis() % 1000);
        v.setDateAdhesion(LocalDate.now());
        v.setHoursVolunteered(0.0);
        v.setCommitteeId(committee.getId());
        return repo.save(v);
    }

    private void assignRole(Committee committee, Volunteer volunteer, RoleTitle title, CommitteeRoleRepository repo) {
        CommitteeRole role = new CommitteeRole();
        role.setCommittee(committee);
        role.setVolunteer(volunteer);
        role.setTitle(title);
        repo.save(role);
    }

    @Bean
    public CommandLineRunner seedDonations(
            CommitteeRepository committeeRepository,
            DonationNeedRepository needRepository,
            DonationRepository donationRepository,
            DonationReceiptRepository receiptRepository,
            DonorRepository donorRepository,
            UserRepository userRepository) {
        return args -> {
            if (needRepository.count() > 0) {
                System.out.println("Donation needs already seeded. Skipping.");
                return;
            }

            System.out.println("Starting Database Seeding for Donation Needs...");

            List<Committee> committees = committeeRepository.findAll();
            if (committees.isEmpty()) {
                System.out.println("No committees found. Skipping donation need seeding.");
                return;
            }

            // Find key committees by region/name
            Committee tunis = committees.stream().filter(c -> c.getName().contains("Tunis")).findFirst().orElse(committees.get(0));
            Committee sousse = committees.stream().filter(c -> c.getName().contains("Sousse")).findFirst().orElse(committees.get(0));
            Committee sfax = committees.stream().filter(c -> c.getName().contains("Sfax")).findFirst().orElse(committees.get(0));
            Committee bizerte = committees.stream().filter(c -> c.getName().contains("Bizerte")).findFirst().orElse(committees.get(0));
            Committee nabeul = committees.stream().filter(c -> c.getName().contains("Nabeul")).findFirst().orElse(committees.get(0));
            Committee kairouan = committees.stream().filter(c -> c.getName().contains("Kairouan")).findFirst().orElse(committees.get(0));

            // 1. Create Needs
            DonationNeed need1 = createNeed(tunis, "Alimentaire", "URGENT", "Besoin urgent de 200 paniers alimentaires de première nécessité pour les familles vulnérables de la banlieue de Tunis.", "200 paniers", 120, needRepository);
            DonationNeed need2 = createNeed(sousse, "Médical", "NORMAL", "Besoin de 50 kits de secours de base (pansements, désinfectants, bandages) pour les interventions locales.", "50 kits", 340, needRepository);
            DonationNeed need3 = createNeed(sfax, "Équipement", "LOW", "Appel à contribution pour 10 tentes d'urgence d'une capacité de 6 personnes pour renforcer notre stock de réserve.", "10 tentes", 50, needRepository);
            DonationNeed need4 = createNeed(bizerte, "Vêtements", "URGENT", "Distribution hivernale : collecte urgente de vêtements chauds et couvertures pour enfants en bas âge.", "150 couvertures", 80, needRepository);
            DonationNeed need5 = createNeed(nabeul, "Urgence", "NORMAL", "Fonds de secours d'urgence pour la prise en charge immédiate des sinistrés suite aux récentes inondations locales.", "Fonds d'urgence", 200, needRepository);
            DonationNeed need6 = createNeed(kairouan, "Alimentaire", "LOW", "Collecte de denrées non périssables pour soutenir les banques alimentaires scolaires de la région.", "500 kg riz/pates", 150, needRepository);

            // 2. Create sample donations & receipts
            var donors = donorRepository.findAll();
            var users = userRepository.findAll();
            if (!donors.isEmpty() && !users.isEmpty()) {
                var donor = donors.get(0);
                var admin = users.get(0);

                // Sample validated donation
                Donation don1 = createDonation(donor, need1, "Alimentaire", "Don de 150 paniers alimentaires", "150", "VALIDATED", donationRepository);
                createReceipt(don1, admin, "Don validé par le responsable régional de Tunis", receiptRepository);

                // Sample pending donation
                createDonation(donor, need2, "Médical", "Don de 20 kits de secours", "20", "PENDING_RECEPTION", donationRepository);
            }

            System.out.println("Donation Needs Seeding Complete!");
        };
    }

    private DonationNeed createNeed(Committee c, String type, String priority, String desc, String qty, int beneficiaries, DonationNeedRepository repo) {
        DonationNeed need = new DonationNeed();
        need.setCommittee(c);
        need.setType(type);
        need.setPriority(priority);
        need.setDescription(desc);
        need.setQuantityNeeded(qty);
        need.setBeneficiaries(beneficiaries);
        need.setStatus("OPEN");
        return repo.save(need);
    }

    private Donation createDonation(com.nexusaid.core.entity.Donor donor, DonationNeed need, String type, String desc, String qty, String status, DonationRepository repo) {
        Donation d = new Donation();
        d.setDonationNumber("DON-2026-" + (System.currentTimeMillis() % 100000));
        d.setDonor(donor);
        d.setNeed(need);
        d.setDonationType(type);
        d.setDescription(desc);
        d.setQuantity(qty);
        d.setStatus(status);
        return repo.save(d);
    }

    private void createReceipt(Donation d, com.nexusaid.core.entity.User validator, String note, DonationReceiptRepository repo) {
        DonationReceipt r = new DonationReceipt();
        r.setReceiptNumber("REC-2026-" + (System.currentTimeMillis() % 100000));
        r.setDonation(d);
        r.setValidatedAt(LocalDateTime.now());
        r.setValidatedBy(validator);
        r.setValidationNote(note);
        r.setCreatedAt(LocalDateTime.now());
        repo.save(r);
    }
}
