package com.nexusaid.admin.service;

import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.Cipher;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.util.Base64;

/**
 * AES-256-GCM encryption service for sensitive data (victim records, etc.).
 *
 * IMPORTANT: The master key (`aes.master.key`) MUST be a Base64-encoded 32-byte
 * value.
 * Example generation: `openssl rand -base64 32`
 *
 * MIGRATION NOTE: If your current .env has a raw ASCII string like
 * "12345678901234567890123456789012", you must Base64-encode it before use:
 * echo -n "12345678901234567890123456789012" | base64
 * → yields "MTIzNDU2Nzg5MDEyMzQ1Njc4OTAxMjM0NTY3ODkwMTI="
 * Use that Base64 string as the AES_KEY value.
 */
@Service
public class EncryptionService {

    private static final String ALGORITHM = "AES/GCM/NoPadding";
    private static final int GCM_TAG_LENGTH = 128; // bits
    private static final int GCM_IV_LENGTH = 12; // bytes
    private static final int AES_KEY_LENGTH = 32; // bytes for AES-256

    @Value("${aes.master.key}")
    private String masterKeyString;

    private SecretKey secretKey;

    @PostConstruct
    public void init() {
        byte[] keyBytes;
        try {
            keyBytes = Base64.getDecoder().decode(masterKeyString);
        } catch (IllegalArgumentException e) {
            throw new IllegalStateException(
                    "AES master key is not valid Base64. " +
                            "Set AES_KEY to a Base64-encoded 32-byte value. " +
                            "Generate with: openssl rand -base64 32",
                    e);
        }

        if (keyBytes.length != AES_KEY_LENGTH) {
            throw new IllegalStateException(
                    String.format("AES master key must decode to exactly %d bytes, got %d. " +
                            "Generate with: openssl rand -base64 32",
                            AES_KEY_LENGTH, keyBytes.length));
        }

        this.secretKey = new SecretKeySpec(keyBytes, "AES");
    }

    public EncryptedData encrypt(String plainText) {
        if (plainText == null || plainText.isEmpty()) {
            return null;
        }
        try {
            byte[] iv = new byte[GCM_IV_LENGTH];
            new SecureRandom().nextBytes(iv);

            Cipher cipher = Cipher.getInstance(ALGORITHM);
            GCMParameterSpec parameterSpec = new GCMParameterSpec(GCM_TAG_LENGTH, iv);

            cipher.init(Cipher.ENCRYPT_MODE, secretKey, parameterSpec);

            byte[] cipherText = cipher.doFinal(plainText.getBytes(StandardCharsets.UTF_8));

            return new EncryptedData(
                    Base64.getEncoder().encodeToString(cipherText),
                    Base64.getEncoder().encodeToString(iv));
        } catch (Exception e) {
            throw new RuntimeException("Encryption failed", e);
        }
    }

    public String decrypt(EncryptedData encryptedData) {
        try {
            byte[] decodedIv = Base64.getDecoder().decode(encryptedData.getIv());
            byte[] decodedCipher = Base64.getDecoder().decode(encryptedData.getCipherText());

            Cipher cipher = Cipher.getInstance(ALGORITHM);
            GCMParameterSpec parameterSpec = new GCMParameterSpec(GCM_TAG_LENGTH, decodedIv);

            cipher.init(Cipher.DECRYPT_MODE, secretKey, parameterSpec);

            byte[] plainTextBytes = cipher.doFinal(decodedCipher);
            return new String(plainTextBytes, StandardCharsets.UTF_8);

        } catch (Exception e) {
            throw new RuntimeException("Decryption failed", e);
        }
    }

    public static class EncryptedData {
        private final String cipherText;
        private final String iv;

        public EncryptedData(String cipherText, String iv) {
            this.cipherText = cipherText;
            this.iv = iv;
        }

        public String getCipherText() {
            return cipherText;
        }

        public String getIv() {
            return iv;
        }
    }
}
