package com.nexusaid.admin.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

import java.time.Duration;
import java.util.Map;

/**
 * Generates PDFs by delegating to the external pdf-service (Node.js + Puppeteer).
 *
 * Architecture:
 * - PRIMARY: Calls pdf-service via HTTP — full CSS/HTML fidelity with Chromium rendering.
 * - FALLBACK: If PDF_ENGINE=openpdf or pdf-service is unavailable, a basic text PDF is returned.
 *
 * The pdf-service renders HTML with puppeteer-core + system Chromium for a minimal Docker footprint.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class PdfGenerationService {

    private final WebClient.Builder webClientBuilder;

    @Value("${pdf-service.url:http://pdf-service:3001}")
    private String pdfServiceUrl;

    @Value("${pdf-service.engine:puppeteer}")
    private String pdfEngine;

    /**
     * Generates a PDF from an HTML string.
     *
     * @param html fully rendered HTML (including inline CSS)
     * @return raw PDF bytes
     */
    public byte[] generateFromHtml(String html) {
        if ("openpdf".equalsIgnoreCase(pdfEngine)) {
            log.warn("Using OpenPDF fallback engine (limited CSS support).");
            return generateOpenPdfFallback(html);
        }
        return callPuppeteerService(html);
    }

    private byte[] callPuppeteerService(String html) {
        try {
            return webClientBuilder.build()
                    .post()
                    .uri(pdfServiceUrl + "/render")
                    .contentType(MediaType.APPLICATION_JSON)
                    .bodyValue(Map.of("html", html))
                    .retrieve()
                    .bodyToMono(byte[].class)
                    .timeout(Duration.ofSeconds(60))
                    .block();
        } catch (Exception e) {
            log.error("pdf-service call failed, falling back to OpenPDF: {}", e.getMessage());
            return generateOpenPdfFallback(html);
        }
    }

    /**
     * Basic OpenPDF fallback — strips HTML tags and generates a simple plain text PDF.
     * Used only when Puppeteer is unavailable or PDF_ENGINE=openpdf.
     */
    private byte[] generateOpenPdfFallback(String html) {
        try {
            com.lowagie.text.Document document = new com.lowagie.text.Document();
            java.io.ByteArrayOutputStream baos = new java.io.ByteArrayOutputStream();
            com.lowagie.text.pdf.PdfWriter.getInstance(document, baos);
            document.open();

            // Strip HTML tags for plain text fallback
            String plainText = html.replaceAll("<[^>]+>", " ").replaceAll("\\s+", " ").trim();
            document.add(new com.lowagie.text.Paragraph(plainText));
            document.close();
            return baos.toByteArray();
        } catch (Exception e) {
            throw new RuntimeException("PDF generation failed completely.", e);
        }
    }
}
