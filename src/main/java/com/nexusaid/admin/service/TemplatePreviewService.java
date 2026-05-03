package com.nexusaid.admin.service;

import com.fasterxml.jackson.databind.JsonNode;
import org.springframework.stereotype.Service;

/**
 * Renders a JSONB template structure to HTML for preview or PDF generation.
 *
 * Supports 11 element types:
 * heading, paragraph, divider, image, table, text_input, textarea,
 * checkbox, radio, date_picker, signature_block
 *
 * The HTML output uses inline CSS for maximum PDF/print compatibility.
 */
@Service
public class TemplatePreviewService {

    private static final String PAGE_STYLE =
            "body{font-family:Arial,Helvetica,sans-serif;font-size:12pt;color:#222;margin:0;padding:0;}" +
            "@page { size: A4; margin: 10mm; }" +
            ".page{width:100%;min-height:100%;box-sizing:border-box;background:#fff;}" +
            "h1,h2,h3{margin:0 0 8pt 0;}" +
            "hr{border:none;border-top:1px solid #bbb;margin:12pt 0;}" +
            "table{width:100%;border-collapse:collapse;margin:8pt 0;}" +
            "th,td{border:1px solid #bbb;padding:6pt;text-align:left;}" +
            "th{background:#f5f5f5;}" +
            ".field-label{font-weight:bold;font-size:10pt;color:#555;margin-bottom:3pt;}" +
            ".field-input{border:1px solid #bbb;border-radius:3px;padding:6pt;min-height:24pt;width:100%;box-sizing:border-box;}" +
            ".field-input.textarea{min-height:60pt;}" +
            ".signature-box{border:2px dashed #bbb;border-radius:4px;min-height:80pt;display:flex;" +
            "align-items:center;justify-content:center;color:#aaa;font-style:italic;}" +
            ".checkbox-row,.radio-row{display:flex;align-items:center;gap:6pt;margin:3pt 0;}" +
            ".element{margin-bottom:12pt; page-break-inside: avoid; break-inside: avoid;}";

    /**
     * Renders the template structure to HTML (blank fields — for design preview).
     */
    public String renderToHtml(JsonNode structure) {
        return renderHtml(structure, null);
    }

    /**
     * Renders the template structure with filled data values (for report viewing / PDF).
     */
    public String renderFilledHtml(JsonNode structure, JsonNode filledData) {
        return renderHtml(structure, filledData);
    }

    private String renderHtml(JsonNode structure, JsonNode filledData) {
        StringBuilder sb = new StringBuilder();
        sb.append("<!DOCTYPE html><html><head><meta charset='UTF-8'>")
          .append("<style>").append(PAGE_STYLE).append("</style></head>")
          .append("<body><div class='page'>");

        if (structure != null && structure.isArray()) {
            for (JsonNode element : structure) {
                sb.append(renderElement(element, filledData));
            }
        }

        sb.append("</div></body></html>");
        return sb.toString();
    }

    private String renderElement(JsonNode el, JsonNode filledData) {
        String type = el.path("type").asText("paragraph");
        String id   = el.path("id").asText("");
        JsonNode props = el.path("props");

        String filledValue = (filledData != null && filledData.has(id))
                ? filledData.get(id).asText("")
                : "";

        return switch (type) {
            case "heading" -> {
                int level = props.path("level").asInt(1);
                String text = filledValue.isEmpty() ? props.path("text").asText("") : filledValue;
                yield "<div class='element'><h" + level + ">" + escape(text) + "</h" + level + "></div>";
            }
            case "paragraph" -> {
                String text = filledValue.isEmpty() ? props.path("text").asText("") : filledValue;
                yield "<div class='element'><p>" + escape(text) + "</p></div>";
            }
            case "divider" -> "<div class='element'><hr/></div>";
            case "image" -> {
                String src = props.path("src").asText("");
                String alt = props.path("alt").asText("image");
                yield "<div class='element'><img src='" + escape(src) + "' alt='" + escape(alt) +
                      "' style='max-width:100%;'/></div>";
            }
            case "table" -> renderTable(props);
            case "text_input" -> {
                String label = props.path("label").asText("");
                String placeholder = props.path("placeholder").asText("");
                String value = escape(filledValue.isEmpty() ? placeholder : filledValue);
                yield "<div class='element'><div class='field-label'>" + escape(label) + "</div>" +
                      "<div class='field-input'>" + value + "&nbsp;</div></div>";
            }
            case "textarea" -> {
                String label = props.path("label").asText("");
                String value = escape(filledValue.isEmpty() ? "" : filledValue);
                yield "<div class='element'><div class='field-label'>" + escape(label) + "</div>" +
                      "<div class='field-input textarea'>" + value + "&nbsp;</div></div>";
            }
            case "checkbox" -> {
                String label = props.path("label").asText("");
                boolean checked = "true".equals(filledValue);
                String box = checked ? "☑" : "☐";
                yield "<div class='element'><div class='checkbox-row'><span>" + box + "</span>" +
                      "<span>" + escape(label) + "</span></div></div>";
            }
            case "radio" -> renderRadio(props, filledValue);
            case "date_picker" -> {
                String label = props.path("label").asText("");
                String value = filledValue.isEmpty() ? "____-__-__" : escape(filledValue);
                yield "<div class='element'><div class='field-label'>" + escape(label) + "</div>" +
                      "<div class='field-input'>" + value + "</div></div>";
            }
            case "signature_block" -> {
                String label = props.path("label").asText("Signature");
                String content = filledValue.isEmpty()
                        ? "<span style='color:#aaa;font-style:italic'>Signature requise</span>"
                        : "<img src='" + filledValue + "' style='max-height:70pt;'/>";
                yield "<div class='element'><div class='field-label'>" + escape(label) + "</div>" +
                      "<div class='signature-box'>" + content + "</div></div>";
            }
            default -> "<div class='element'><p>[Unsupported element: " + escape(type) + "]</p></div>";
        };
    }

    private String renderTable(JsonNode props) {
        StringBuilder sb = new StringBuilder("<div class='element'><table>");
        JsonNode headers = props.path("headers");
        if (headers.isArray() && !headers.isEmpty()) {
            sb.append("<thead><tr>");
            for (JsonNode h : headers) sb.append("<th>").append(escape(h.asText())).append("</th>");
            sb.append("</tr></thead>");
        }
        JsonNode rows = props.path("rows");
        if (rows.isArray()) {
            sb.append("<tbody>");
            for (JsonNode row : rows) {
                sb.append("<tr>");
                if (row.isArray()) {
                    for (JsonNode cell : row) sb.append("<td>").append(escape(cell.asText())).append("</td>");
                }
                sb.append("</tr>");
            }
            sb.append("</tbody>");
        }
        sb.append("</table></div>");
        return sb.toString();
    }

    private String renderRadio(JsonNode props, String selectedValue) {
        String label = props.path("label").asText("");
        JsonNode options = props.path("options");
        StringBuilder sb = new StringBuilder("<div class='element'><div class='field-label'>")
                .append(escape(label)).append("</div>");
        if (options.isArray()) {
            for (JsonNode opt : options) {
                String val = opt.asText();
                String mark = val.equals(selectedValue) ? "●" : "○";
                sb.append("<div class='radio-row'><span>").append(mark).append("</span><span>")
                  .append(escape(val)).append("</span></div>");
            }
        }
        sb.append("</div>");
        return sb.toString();
    }

    private String escape(String text) {
        if (text == null) return "";
        return text.replace("&", "&amp;")
                   .replace("<", "&lt;")
                   .replace(">", "&gt;")
                   .replace("\"", "&quot;");
    }
}
