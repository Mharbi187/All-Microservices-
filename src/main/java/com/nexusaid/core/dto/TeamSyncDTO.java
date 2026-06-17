package com.nexusaid.core.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TeamSyncDTO {
    private String id;
    private String name;
    private String team_type;
    private LocationDTO base_location;
    private List<String> skills;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class LocationDTO {
        private double lat;
        private double lon;
        private String name;
        private String region;
    }
}
