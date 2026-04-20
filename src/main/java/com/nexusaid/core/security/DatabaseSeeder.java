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

import java.time.LocalDate;
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
}
