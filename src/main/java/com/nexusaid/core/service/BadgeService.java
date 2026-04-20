package com.nexusaid.core.service;

import com.google.zxing.BarcodeFormat;
import com.google.zxing.client.j2se.MatrixToImageWriter;
import com.google.zxing.common.BitMatrix;
import com.google.zxing.qrcode.QRCodeWriter;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class BadgeService {

    public byte[] generateBadgeQrCode(UUID volunteerId, String name, String matricule, String committeeName) {
        try {
            String qrData = "NEXUSAID_BADGE|" + volunteerId + "|" + matricule + "|" + committeeName;
            QRCodeWriter writer = new QRCodeWriter();
            BitMatrix bitMatrix = writer.encode(qrData, BarcodeFormat.QR_CODE, 250, 250);

            ByteArrayOutputStream baos = new ByteArrayOutputStream();
            MatrixToImageWriter.writeToStream(bitMatrix, "PNG", baos);
            return baos.toByteArray();
        } catch (Exception e) {
            throw new RuntimeException("Failed to generate QR badge", e);
        }
    }
}
