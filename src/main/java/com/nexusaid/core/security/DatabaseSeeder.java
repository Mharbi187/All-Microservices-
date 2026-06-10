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

import com.nexusaid.core.entity.domains.vff.VictimCase;
import com.nexusaid.core.entity.domains.vff.VictimSupportPath;
import com.nexusaid.core.entity.domains.vff.ProtectionCampaign;
import com.nexusaid.core.entity.domains.vff.Shelter;
import com.nexusaid.core.entity.domains.vff.Partner;
import com.nexusaid.core.repository.domains.vff.VictimCaseRepository;
import com.nexusaid.core.repository.domains.vff.VictimSupportPathRepository;
import com.nexusaid.core.repository.domains.vff.ProtectionCampaignRepository;
import com.nexusaid.core.repository.domains.vff.ShelterRepository;
import com.nexusaid.core.repository.domains.vff.PartnerRepository;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

import com.nexusaid.core.entity.CalendarEvent;
import com.nexusaid.core.repository.CalendarEventRepository;
import com.nexusaid.core.entity.NewsItem;
import com.nexusaid.core.repository.NewsRepository;

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
            UserRepository userRepository,
            PasswordEncoder passwordEncoder) {
        return args -> {
            if (needRepository.count() > 0) {
                System.out.println("Donation needs already seeded. Skipping.");
                return;
            }

            System.out.println("Starting Database Seeding for Donation Needs...");

            // Seed a test donor if none exist
            if (donorRepository.count() == 0) {
                System.out.println("Seeding test Donor...");
                com.nexusaid.core.entity.Donor testDonor = new com.nexusaid.core.entity.Donor();
                testDonor.setEmail("donor@nexus.tn");
                testDonor.setFullName("Jean Donateur");
                testDonor.setPassword(passwordEncoder.encode("pass"));
                testDonor.setCin("09876543");
                testDonor.setPhone("22334455");
                testDonor.setType(UserType.DONOR);
                testDonor.setAccountStatus(AccountStatus.APPROVED);
                testDonor.setTotalDonationsCount(0);
                testDonor.setPreferredCategories(List.of("Alimentaire", "Médical"));
                testDonor.setTargetZones(List.of("Tunis", "Ariana"));
                donorRepository.save(testDonor);
            }

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

    @Bean
    public CommandLineRunner seedVffData(
            VictimCaseRepository caseRepository,
            VictimSupportPathRepository supportPathRepository,
            ProtectionCampaignRepository campaignRepository,
            VolunteerRepository volunteerRepository,
            ShelterRepository shelterRepository,
            PartnerRepository partnerRepository) {
        return args -> {
            System.out.println("Starting Database Seeding for VFF domain...");

            List<Volunteer> volunteers = volunteerRepository.findAll();
            UUID volunteerId = volunteers.isEmpty() ? UUID.randomUUID() : volunteers.get(0).getId();

            // 1. Create Victim Cases & Support Paths
            if (caseRepository.count() < 3) {
                System.out.println("Seeding VFF Victim Cases...");
                VictimCase case1 = createVictimCase(34, "FEMME", "Woman", "PHYSIQUE", LocalDate.now().minusDays(15), "CRITICAL", true, true, volunteerId, "VFF-884210", caseRepository);
                VictimCase case2 = createVictimCase(22, "FEMME", "Woman", "PSYCHOLOGIQUE", LocalDate.now().minusDays(20), "HIGH", true, true, volunteerId, "VFF-310495", caseRepository);
                VictimCase case3 = createVictimCase(10, "ENFANT_F", "Child", "ENFANT", LocalDate.now().minusDays(5), "CRITICAL", true, true, volunteerId, "VFF-723019", caseRepository);
                VictimCase case4 = createVictimCase(28, "FEMME", "Woman", "ECONOMIQUE", LocalDate.now().minusDays(30), "MEDIUM", true, true, volunteerId, "VFF-105284", caseRepository);
                VictimCase case5 = createVictimCase(45, "FEMME", "Woman", "SEXUELLE", LocalDate.now().minusDays(2), "CRITICAL", true, true, volunteerId, "VFF-902148", caseRepository);
                VictimCase case6 = createVictimCase(16, "ENFANT_M", "Child", "MARIAGE", LocalDate.now().minusDays(45), "HIGH", true, true, volunteerId, "VFF-663201", caseRepository);

                createSupportPath(case1.getId(), "ACCOMMODATED", true, "COURT-2026-098", 
                    Map.of("doctor", "Dr. Sonia Belhaj", "details", "Consultation d'urgence. Certificat médical rédigé (15 jours d'ITT).", "status", "COMPLETED"),
                    Map.of("therapist", "Mme. Ines Chaari", "sessionsCount", 3, "notes", "Soutien psychologique hebdomadaire en cours. État d'anxiété sévère en régression."),
                    Map.of("lawyer", "Me. Kamel Ben Amor", "status", "Complaint filed", "details", "Plainte déposée auprès du procureur de Tunis."),
                    Map.of("center", "Centre Amel - Tunis", "arrivalDate", "2026-05-17", "allocatedBeds", "Room 4"),
                    supportPathRepository);

                createSupportPath(case2.getId(), "LEGAL_ACTION", true, "COURT-2026-102",
                    Map.of("doctor", "Hôpital La Rabta", "details", "Suivi de routine. Pas de blessures physiques directes.", "status", "COMPLETED"),
                    Map.of("therapist", "Association ATFD", "sessionsCount", 5, "notes", "Grande détresse émotionnelle. Suivie de très près."),
                    Map.of("lawyer", "Me. Selma Hedi", "status", "Trial pending", "details", "Audience de conciliation fixée."),
                    Map.of("center", "Non hébergée", "arrivalDate", "—", "allocatedBeds", "—"),
                    supportPathRepository);

                createSupportPath(case3.getId(), "ACCOMMODATED", true, "COURT-2026-044",
                    Map.of("doctor", "Pédiatre d'urgence", "details", "Traitement des traumatismes légers.", "status", "COMPLETED"),
                    Map.of("therapist", "Mme. Fatma Jlassi", "sessionsCount", 2, "notes", "Séances de thérapie par le jeu. Enfant très craintive."),
                    Map.of("lawyer", "Délégué de Protection de l'Enfance", "status", "Active placement", "details", "Ordonnance de garde provisoire obtenue."),
                    Map.of("center", "Centre de la Femme et de l'Enfant - Tunis", "arrivalDate", "2026-05-27", "allocatedBeds", "Chambre 2"),
                    supportPathRepository);

                createSupportPath(case4.getId(), "RECOVERED", false, "—",
                    Map.of("doctor", "—", "details", "Aucun soin nécessaire", "status", "NONE"),
                    Map.of("therapist", "—", "sessionsCount", 0, "notes", "Aucun suivi nécessaire"),
                    Map.of("lawyer", "—", "status", "None", "details", "—"),
                    Map.of("center", "Non hébergée", "arrivalDate", "—", "allocatedBeds", "—"),
                    supportPathRepository);

                createSupportPath(case5.getId(), "REPORTED", true, "—",
                    Map.of("doctor", "Urgences gynécologiques", "details", "Examen médico-légal complet effectué. Prélèvements conservés.", "status", "COMPLETED"),
                    Map.of("therapist", "Mme. Ines Chaari", "sessionsCount", 1, "notes", "État de choc post-traumatique aigu. Séance d'urgence réalisée."),
                    Map.of("lawyer", "Me. Kamel Ben Amor", "status", "Preparing filing", "details", "Rédaction de la plainte en cours."),
                    Map.of("center", "Centre Amel - Tunis", "arrivalDate", "2026-05-30", "allocatedBeds", "Chambre d'urgence 1"),
                    supportPathRepository);
            }

            // 3. Create Protection Campaigns
            if (campaignRepository.count() == 0) {
                System.out.println("Seeding VFF Protection Campaigns...");
                createCampaign("Tous Unis contre la Violence", "Femmes", "Violence conjugale", "Maison de la Culture, Tunis", LocalDate.now().minusDays(10), 120, List.of("Brochures", "Affiches"), campaignRepository);
                createCampaign("Sécurité des Enfants dans le Milieu Scolaire", "Parents & Enseignants", "Maltraitance infantile", "Comité Régional Sfax", LocalDate.now().plusDays(15), 0, List.of("Présentation PPT", "Livrets de sensibilisation"), campaignRepository);
                createCampaign("Sensibilisation contre le Mariage des Mineurs", "Jeunes & Familles", "Mariage précoce", "Palais des Congrès, Sousse", LocalDate.now().plusDays(25), 0, List.of("Kakemonos", "Dépliant juridique"), campaignRepository);
            }

            // 4. Create Shelters
            if (shelterRepository.count() == 0) {
                System.out.println("Seeding VFF Shelters...");
                shelterRepository.save(new Shelter(null, "Centre Amel - Tunis", "Av. de la République, Tunis", "Dr. Sonia Belhaj", "71 890 456", 30, 8, "Tunis", List.of("Hébergement", "Soutien psychologique", "Aide juridique")));
                shelterRepository.save(new Shelter(null, "Centre Espoir - Sfax", "Rue Ibn Khaldoun, Sfax", "Mme. Fatma Jlassi", "74 231 789", 20, 3, "Sfax", List.of("Hébergement", "Accompagnement social")));
                shelterRepository.save(new Shelter(null, "Refuge Soleil - Sousse", "Av. Kheireddine, Sousse", "Mme. Ines Chaari", "73 209 100", 15, 0, "Sousse", List.of("Hébergement d'urgence")));
            }

            // 5. Create Partners
            if (partnerRepository.count() < 5) {
                System.out.println("Seeding VFF Partners...");
                partnerRepository.save(new Partner(null, "police", "Commissariat Central de Tunis", "Tunis", "71 340 000", "Av. Habib Bourguiba, Tunis", 36.7992, 10.1802));
                partnerRepository.save(new Partner(null, "hospital", "Hôpital La Rabta", "Tunis", "71 562 444", "Rue Jebel Lakhdar, Tunis", 36.8113, 10.1695));
                partnerRepository.save(new Partner(null, "center", "Centre de la Femme et de l'Enfant - Tunis", "Tunis", "71 774 222", "Cité El Khadra, Tunis", 36.8346, 10.2138));
                partnerRepository.save(new Partner(null, "protection", "Délégation de Protection de l'Enfance", "Tunis", "71 890 100", "Av. du Président Bourguiba", 36.8018, 10.1786));
                partnerRepository.save(new Partner(null, "association", "Association Femmes Tunisiennes (ATFD)", "Tunis", "71 892 784", "Rue Chia, Bab Bnet, Tunis", 36.7950, 10.1720));
                partnerRepository.save(new Partner(null, "police", "Commissariat de Sfax", "Sfax", "74 225 000", "Av. Hédi Chaker, Sfax", 34.7406, 10.7603));
                partnerRepository.save(new Partner(null, "hospital", "CHU Hédi Chaker - Sfax", "Sfax", "74 241 733", "Av. du Maghreb Arabe, Sfax", 34.7498, 10.7628));
                partnerRepository.save(new Partner(null, "center", "Centre d'Hébergement Sousse", "Sousse", "73 225 400", "Av. Mohamed V, Sousse", 35.8256, 10.6369));
                partnerRepository.save(new Partner(null, "hospital", "CHU Farhat Hached - Sousse", "Sousse", "73 221 411", "Av. Farhat Hached, Sousse", 35.8347, 10.6362));
            }

            System.out.println("VFF Data Seeding Complete!");
        };
    }

    private VictimCase createVictimCase(int age, String gender, String type, String incident, LocalDate date, String level, boolean confidential, boolean restricted, UUID volId, String ref, VictimCaseRepository repo) {
        VictimCase c = new VictimCase();
        c.setCaseReference(ref);
        c.setVictimAge(age);
        c.setVictimGender(gender);
        c.setVictimType(type);
        c.setIncidentType(incident);
        c.setIncidentDate(date);
        c.setRiskLevel(level);
        c.setConfidential(confidential);
        c.setAccessRestricted(restricted);
        c.setAssignedVolunteerId(volId);
        c.setEncryptionKey(UUID.randomUUID().toString());
        return repo.save(c);
    }

    private void createSupportPath(UUID caseId, String stage, boolean police, String courtRef, Map<String, Object> medical, Map<String, Object> psycho, Map<String, Object> legal, Map<String, Object> shelter, VictimSupportPathRepository repo) {
        VictimSupportPath p = new VictimSupportPath();
        p.setVictimCaseId(caseId);
        p.setCurrentStage(stage);
        p.setPoliceReport(police);
        p.setCourtCaseRef(courtRef);
        p.setMedicalFollowUp(medical);
        p.setPsychologicalFollowUp(psycho);
        p.setLegalFollowUp(legal);
        p.setShelterInfo(shelter);
        p.setUpdatedAt(LocalDateTime.now());
        repo.save(p);
    }

    private void createCampaign(String title, String audience, String topic, String location, LocalDate date, int participants, List<String> materials, ProtectionCampaignRepository repo) {
        ProtectionCampaign c = new ProtectionCampaign();
        c.setTitle(title);
        c.setTargetAudience(audience);
        c.setTopic(topic);
        c.setLocation(location);
        c.setDate(date);
        c.setParticipantsCount(participants);
        c.setMaterialsUsed(materials);
        c.setDescription("Campagne de sensibilisation sur : " + topic);
        c.setStartDate(date.toString());
        c.setEndDate(date.plusDays(2).toString());
        c.setStatus("ACTIVE");
        repo.save(c);
    }

    @Bean
    public CommandLineRunner seedEventsData(
            CalendarEventRepository eventRepository,
            CommitteeRepository committeeRepository,
            UserRepository userRepository) {
        return args -> {
            if (eventRepository.count() > 0) {
                System.out.println("Calendar events already seeded. Skipping.");
                return;
            }
            System.out.println("Starting Database Seeding for Calendar Events...");

            var users = userRepository.findAll();
            if (users.isEmpty()) return;
            var admin = users.stream().filter(u -> u.getEmail().contains("president.national")).findFirst().orElse(users.get(0));

            var committees = committeeRepository.findAll();
            if (committees.isEmpty()) return;
            Committee national = committees.stream().filter(c -> c.getType() == CommitteeType.NATIONAL).findFirst().orElse(committees.get(0));
            Committee regional = committees.stream().filter(c -> c.getType() == CommitteeType.REGIONAL).findFirst().orElse(national);
            Committee local = committees.stream().filter(c -> c.getType() == CommitteeType.LOCAL).findFirst().orElse(regional);

            eventRepository.save(CalendarEvent.builder()
                .title("Formation Premiers Secours")
                .description("Formation de base pour tous les nouveaux bénévoles.")
                .type("FORMATION")
                .startDate(OffsetDateTime.now().plusDays(2).withHour(9).withMinute(0).withSecond(0).withNano(0))
                .endDate(OffsetDateTime.now().plusDays(2).withHour(17).withMinute(0).withSecond(0).withNano(0))
                .location("Siège Ariana")
                .organizer(admin)
                .committee(local)
                .targetScope(CommitteeType.LOCAL)
                .status("VALIDE")
                .maxParticipants(30)
                .build());

            eventRepository.save(CalendarEvent.builder()
                .title("Campagne de Don de Sang")
                .description("Grande campagne régionale de collecte de sang en collaboration avec l'hôpital.")
                .type("COLLECTE")
                .startDate(OffsetDateTime.now().plusDays(5).withHour(8).withMinute(0).withSecond(0).withNano(0))
                .endDate(OffsetDateTime.now().plusDays(5).withHour(14).withMinute(0).withSecond(0).withNano(0))
                .location("Hôpital Charles Nicolle, Tunis")
                .organizer(admin)
                .committee(regional)
                .targetScope(CommitteeType.REGIONAL)
                .status("VALIDE")
                .maxParticipants(100)
                .build());

            eventRepository.save(CalendarEvent.builder()
                .title("Réunion Nationale Annuelle")
                .description("Bilan annuel et planification stratégique pour l'année prochaine.")
                .type("REUNION")
                .startDate(OffsetDateTime.now().plusDays(15).withHour(10).withMinute(0).withSecond(0).withNano(0))
                .endDate(OffsetDateTime.now().plusDays(15).withHour(16).withMinute(0).withSecond(0).withNano(0))
                .location("Hôtel El Mouradi, Gammarth")
                .organizer(admin)
                .committee(national)
                .targetScope(CommitteeType.NATIONAL)
                .status("VALIDE")
                .maxParticipants(200)
                .build());

            System.out.println("Calendar Events Seeding Complete!");
        };
    }

    @Bean
    public CommandLineRunner seedNewsData(
            NewsRepository newsRepository,
            CommitteeRepository committeeRepository,
            UserRepository userRepository) {
        return args -> {
            if (newsRepository.count() > 0) {
                System.out.println("News already seeded. Skipping.");
                return;
            }
            System.out.println("Starting Database Seeding for News...");

            var users = userRepository.findAll();
            if (users.isEmpty()) return;
            var admin = users.stream().filter(u -> u.getEmail().contains("president.national")).findFirst().orElse(users.get(0));

            var committees = committeeRepository.findAll();
            if (committees.isEmpty()) return;
            Committee national = committees.stream().filter(c -> c.getType() == CommitteeType.NATIONAL).findFirst().orElse(committees.get(0));
            Committee regional = committees.stream().filter(c -> c.getType() == CommitteeType.REGIONAL).findFirst().orElse(national);

            newsRepository.save(NewsItem.builder()
                .title("Bilan de la caravane de santé hivernale")
                .summary("Notre caravane a visité 5 villages et examiné plus de 300 patients.")
                .content("La caravane médicale organisée par le Croissant Rouge Tunisien a achevé sa tournée hivernale. L'équipe médicale composée de 15 médecins bénévoles a pu distribuer des médicaments et effectuer des consultations gratuites.")
                .category("EVENT")
                .imageUrl("https://picsum.photos/seed/crt-sante/800/400")
                .targetScope(CommitteeType.NATIONAL)
                .status("PUBLIE")
                .isPublic(true)
                .author(admin)
                .committee(national)
                .publishedAt(OffsetDateTime.now().minusDays(2))
                .build());

            newsRepository.save(NewsItem.builder()
                .title("Alerte Canicule : Consignes de sécurité")
                .summary("Des températures très élevées sont attendues cette semaine. Protégez-vous.")
                .content("Nous appelons tous les citoyens à rester chez eux pendant les heures de pic de chaleur (12h - 16h) et à bien s'hydrater. Nos bénévoles distribueront des bouteilles d'eau aux abords des stations de transport en commun.")
                .category("URGENCE")
                .imageUrl("https://picsum.photos/seed/crt-alert/800/400")
                .targetScope(CommitteeType.NATIONAL)
                .status("PUBLIE")
                .isPublic(true)
                .author(admin)
                .committee(national)
                .publishedAt(OffsetDateTime.now().minusHours(5))
                .build());

            newsRepository.save(NewsItem.builder()
                .title("Félicitations à nos nouveaux secouristes")
                .summary("Une promotion de 20 secouristes vient de valider sa formation.")
                .content("Le Comité Régional est fier d'accueillir 20 nouveaux secouristes certifiés qui ont complété avec succès les 40 heures de formation aux premiers secours. Ils sont désormais prêts à intervenir.")
                .category("FORMATION")
                .imageUrl("https://picsum.photos/seed/crt-secours/800/400")
                .targetScope(CommitteeType.REGIONAL)
                .status("PUBLIE")
                .isPublic(true)
                .author(admin)
                .committee(regional)
                .publishedAt(OffsetDateTime.now().minusDays(10))
                .build());

            System.out.println("News Seeding Complete!");
        };
    }
}
