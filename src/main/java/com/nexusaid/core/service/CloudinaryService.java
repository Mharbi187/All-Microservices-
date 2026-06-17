package com.nexusaid.core.service;

import com.cloudinary.Cloudinary;
import com.cloudinary.utils.ObjectUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.util.Map;

/**
 * Service for administrative Cloudinary operations.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class CloudinaryService {

    private final Cloudinary cloudinary;

    /**
     * Deletes an image from Cloudinary by its public ID.
     * 
     * @param publicId the public ID of the image to delete.
     */
    public void deleteImage(String publicId) {
        if (publicId == null || publicId.isEmpty()) {
            return;
        }

        try {
            log.info("Attempting to delete image from Cloudinary: {}", publicId);
            Map<String, Object> result = cloudinary.uploader().destroy(publicId, ObjectUtils.emptyMap());

            if ("ok".equals(result.get("result"))) {
                log.info("Successfully deleted image from Cloudinary: {}", publicId);
            } else {
                log.warn("Cloudinary deletion returned non-ok result for {}: {}", publicId, result);
            }
        } catch (IOException e) {
            log.error("Failed to delete image from Cloudinary: {}", publicId, e);
            // We don't throw an exception here to avoid breaking the main flow
            // if the deletion fails (e.g., image already manualy deleted).
        }
    }

    /**
     * Uploads a file (image or document) to Cloudinary.
     *
     * @param fileData the file bytes
     * @param folder the folder name in Cloudinary
     * @param filename the original filename
     * @return map with the upload results containing keys like 'url' and 'public_id'
     * @throws IOException if upload fails
     */
    public Map<String, Object> uploadFile(byte[] fileData, String folder, String filename) throws IOException {
        String resourceType = "auto"; // allows Cloudinary to decide based on file (raw for pdfs sometimes)
        if (filename != null && (filename.toLowerCase().endsWith(".pdf") || filename.toLowerCase().endsWith(".docx"))) {
            resourceType = "raw"; // Force raw for documents to avoid issues on some Cloudinary setups
        }
        
        Map<String, Object> options = ObjectUtils.asMap(
                "folder", folder,
                "resource_type", resourceType
        );
        log.info("Uploading file to Cloudinary in folder: {}", folder);
        return cloudinary.uploader().upload(fileData, options);
    }
}
