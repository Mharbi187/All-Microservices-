package com.nexusaid.admin.service;

import com.google.zxing.BarcodeFormat;
import com.google.zxing.client.j2se.MatrixToImageWriter;
import com.google.zxing.common.BitMatrix;
import com.google.zxing.qrcode.QRCodeWriter;
import com.lowagie.text.*;
import com.lowagie.text.pdf.PdfWriter;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.io.IOException;

@Service
public class PdfReceiptGeneratorService {

    public byte[] generatePdfReceipt(String receiptNumber, String donorName, String amountOrItems, String date,
            String qrCodeData) {
        try (ByteArrayOutputStream baos = new ByteArrayOutputStream()) {
            Document document = new Document();
            PdfWriter.getInstance(document, baos);
            document.open();

            // Header
            Font titleFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 18);
            Paragraph title = new Paragraph("Croissant-Rouge Tunisien - Reçu Officiel", titleFont);
            title.setAlignment(Element.ALIGN_CENTER);
            document.add(title);
            document.add(new Paragraph(" ")); // spacing

            // Body
            document.add(new Paragraph("Numéro de Reçu : " + receiptNumber));
            document.add(new Paragraph("Date : " + date));
            document.add(new Paragraph("Donateur : " + (donorName != null ? donorName : "Anonyme")));
            document.add(new Paragraph("Montant / Objet : " + amountOrItems));
            document.add(new Paragraph(" ")); // spacing

            // QR Code Image
            try {
                byte[] qrBytes = generateQrCodeImage(qrCodeData, 150, 150);
                Image qrImage = Image.getInstance(qrBytes);
                qrImage.setAlignment(Element.ALIGN_CENTER);
                document.add(qrImage);
            } catch (Exception e) {
                document.add(new Paragraph("Erreur génération QR : " + qrCodeData));
            }

            document.add(new Paragraph(" "));
            Paragraph footer = new Paragraph(
                    "Merci pour votre générosité. Ce reçu est généré automatiquement par NexusAid.");
            footer.setAlignment(Element.ALIGN_CENTER);
            document.add(footer);

            document.close();
            return baos.toByteArray();
        } catch (Exception e) {
            throw new RuntimeException("Erreur lors de la génération du PDF", e);
        }
    }

    public byte[] generateQrCodeImage(String text, int width, int height) throws Exception {
        QRCodeWriter qrCodeWriter = new QRCodeWriter();
        BitMatrix bitMatrix = qrCodeWriter.encode(text, BarcodeFormat.QR_CODE, width, height);

        try (ByteArrayOutputStream baos = new ByteArrayOutputStream()) {
            MatrixToImageWriter.writeToStream(bitMatrix, "PNG", baos);
            return baos.toByteArray();
        }
    }
}
