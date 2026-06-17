package com.nexusaid.admin.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "sensitive_data_vault", uniqueConstraints = {
        @UniqueConstraint(columnNames = { "report_id", "block_id" })
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SensitiveDataVault {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "report_id", nullable = false)
    private ReportInstance report;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "block_id", nullable = false)
    private TemplateBlock templateBlock;

    @Column(name = "encrypted_content", columnDefinition = "TEXT", nullable = false)
    private String encryptedContent; // Base64 AES/GCM CipherText (includes Auth Tag)

    @Column(nullable = false, length = 64)
    private String iv; // Base64 Initialization Vector

    @Column(name = "key_version")
    @Builder.Default
    private Integer keyVersion = 1;

    @Column(name = "encrypted_at", updatable = false)
    private LocalDateTime encryptedAt;

    @PrePersist
    protected void onCreate() {
        this.encryptedAt = LocalDateTime.now();
    }
}
