package com.nexusaid.core.controller;

import com.nexusaid.core.dto.TeamSyncDTO;
import com.nexusaid.core.entity.Committee;
import com.nexusaid.core.entity.Volunteer;
import com.nexusaid.core.entity.enums.AccountStatus;
import com.nexusaid.core.repository.CommitteeRepository;
import com.nexusaid.core.repository.VolunteerRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.*;

@RestController
@RequestMapping("/api/v1/sync")
@RequiredArgsConstructor
public class TeamSyncController {

    private final CommitteeRepository committeeRepository;
    private final VolunteerRepository volunteerRepository;

    @GetMapping("/teams")
    public ResponseEntity<List<TeamSyncDTO>> getTeamsForDisasterDetection() {
        List<Committee> committees = committeeRepository.findAll();
        List<TeamSyncDTO> teams = new ArrayList<>();

        for (Committee c : committees) {
            List<Volunteer> volunteers = volunteerRepository.findByCommitteeIdAndAccountStatus(c.getId(),
                    AccountStatus.APPROVED);
            if (volunteers.isEmpty())
                continue;

            Set<String> aggregatedSkills = new HashSet<>();
            for (Volunteer v : volunteers) {
                if (v.getSkills() != null) {
                    aggregatedSkills.addAll(v.getSkills());
                }
            }

            double lat = 36.8;
            double lon = 10.18;
            if (c.getRegion() != null) {
                if (c.getRegion().equalsIgnoreCase("Sfax")) {
                    lat = 34.7405;
                    lon = 10.7603;
                } else if (c.getRegion().equalsIgnoreCase("Gabes")) {
                    lat = 33.8815;
                    lon = 10.0982;
                } else if (c.getRegion().equalsIgnoreCase("Jendouba")) {
                    lat = 36.5011;
                    lon = 8.7802;
                } else if (c.getRegion().equalsIgnoreCase("Sousse")) {
                    lat = 35.8256;
                    lon = 10.6369;
                } else if (c.getRegion().equalsIgnoreCase("Nabeul")) {
                    lat = 36.4513;
                    lon = 10.7381;
                }
            }

            TeamSyncDTO team = TeamSyncDTO.builder()
                    .id(c.getId().toString())
                    .name(c.getName())
                    .team_type(c.getType().name())
                    .base_location(TeamSyncDTO.LocationDTO.builder()
                            .lat(lat)
                            .lon(lon)
                            .name(c.getRegion() + " Regional Base")
                            .region(c.getRegion())
                            .build())
                    .skills(new ArrayList<>(aggregatedSkills))
                    .build();

            teams.add(team);
        }

        return ResponseEntity.ok(teams);
    }
}
