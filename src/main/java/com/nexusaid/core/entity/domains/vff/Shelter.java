package com.nexusaid.core.entity.domains.vff;

import io.hypersistence.utils.hibernate.type.json.JsonBinaryType;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.Type;

import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "vff_shelters")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Shelter {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @Column(nullable = false)
    private String name;

    private String address;

    private String manager;

    private String phone;

    private int capacity;

    private int available;

    private String region;

    @Type(JsonBinaryType.class)
    @Column(columnDefinition = "jsonb")
    private List<String> services;
}
