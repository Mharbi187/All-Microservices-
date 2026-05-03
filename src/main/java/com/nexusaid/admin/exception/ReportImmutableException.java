package com.nexusaid.admin.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

/**
 * Thrown when a modification is attempted on an ARCHIVED report.
 * Archived reports are immutable by design.
 */
@ResponseStatus(HttpStatus.CONFLICT)
public class ReportImmutableException extends RuntimeException {

    public ReportImmutableException(String reportId) {
        super("Report [" + reportId + "] is ARCHIVED and immutable. No modifications are allowed.");
    }
}
