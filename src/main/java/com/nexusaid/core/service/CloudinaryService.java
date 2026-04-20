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
}
