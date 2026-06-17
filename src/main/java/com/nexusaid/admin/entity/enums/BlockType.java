package com.nexusaid.admin.entity.enums;

public enum BlockType {
    HEADING, // H1-H6 Headers
    TEXT, // Standard multiline text area (can be encrypted if isSensitive=true)
    LINK, // Hyperlinks
    RADIO, // Mutually exclusive options
    CHECKBOX, // Multiple choice options
    TABLE, // Data grids
    IMAGE, // Up to 150MB image uploads
    SENDER_ID // Automatically captures the user who submits the report
}
