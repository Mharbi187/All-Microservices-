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
            "@page {" +
            "  size: A4 portrait;" +
            "  margin: 20mm 15mm;" +
            "}" +
            "*" +
            "{" +
            "  box-sizing: border-box;" +
            "  margin: 0;" +
            "  padding: 0;" +
            "  -webkit-print-color-adjust: exact !important;" +
            "  print-color-adjust: exact !important;" +
            "}" +
            "body" +
            "{" +
            "  width: 100%;" +
            "  font-family: 'Segoe UI', Arial, sans-serif;" +
            "  font-size: 11pt;" +
            "  background: white;" +
            "  color: #222;" +
            "}" +
            ".page { width: 100%; position: relative; }" +
            ".print-header { width: 100%; background: white; }" +
            ".print-footer { width: 100%; background: white; }" +
            ".page-number::after {" +
            "  content: \"Page \" counter(page) \" / \" counter(pages);" +
            "  font-size: 7.5pt;" +
            "  color: #999;" +
            "}" +
            ".print-body { position: relative; z-index: 1; width: 100%; }" +
            "h1,h2,h3,h4,h5,h6 { break-after: avoid; margin-bottom: 6pt; }" +
            "p { margin-bottom: 8pt; line-height: 1.7; }" +
            ".element { break-inside: avoid; page-break-inside: avoid; margin-bottom: 12pt; }" +
            ".element table { width: 100%; border-collapse: collapse; font-size: 10pt; margin: 8pt 0; }" +
            ".element th, .element td { border: 0.5px solid #E5E7EB; padding: 4pt 6pt; text-align: left; }" +
            ".element th { background: #F9FAFB; font-weight: 600; }" +
            "[dir=\"rtl\"] { direction: rtl; text-align: right; }" +
            ".field-label { font-weight: bold; font-size: 9pt; color: #374151; margin-bottom: 3pt; }" +
            ".field-input { border: 1px solid #E5E7EB; border-radius: 3pt; padding: 6pt; min-height: 24pt; width: 100%; box-sizing: border-box; background: white; }" +
            ".field-input.textarea { min-height: 60pt; }" +
            ".signature-box { border: 1px solid #E5E7EB; border-radius: 3pt; min-height: 80pt; display: flex; align-items: center; justify-content: center; color: #aaa; font-style: italic; background: white; }" +
            ".checkbox-row, .radio-row { display: flex; align-items: center; gap: 6pt; margin: 3pt 0; }";

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
        StringBuilder bodyHtml = new StringBuilder();
        if (structure != null && structure.isArray()) {
            for (JsonNode element : structure) {
                bodyHtml.append(renderElement(element, filledData)).append("\n");
            }
        }

        String headerHtml = buildHeaderHtml();
        String footerHtml = buildFooterHtml();

        StringBuilder sb = new StringBuilder();
        sb.append("<!DOCTYPE html><html><head><meta charset='UTF-8'>")
          .append("<style>").append(PAGE_STYLE).append("</style></head>")
          .append("<body>")
          .append("<div class='page'>")
          .append("  <table style=\"width: 100%; border: none; border-collapse: collapse; margin: 0; padding: 0;\">")
          .append("    <thead style=\"display: table-header-group;\">")
          .append("      <tr>")
          .append("        <td style=\"padding: 0; border: none;\">")
          .append("          ").append(headerHtml)
          .append("          <!-- Espace de respiration entre l'en-tête et le contenu -->")
          .append("          <div style=\"height: 30px;\"></div>")
          .append("        </td>")
          .append("      </tr>")
          .append("    </thead>")
          .append("    <tbody>")
          .append("      <tr>")
          .append("        <td style=\"padding: 0; border: none; vertical-align: top;\">")
          .append("          <div class=\"print-body\">")
          .append("            ").append(bodyHtml)
          .append("          </div>")
          .append("        </td>")
          .append("      </tr>")
          .append("    </tbody>")
          .append("    <tfoot style=\"display: table-footer-group;\">")
          .append("      <tr>")
          .append("        <td style=\"padding: 0; border: none;\">")
          .append("          <!-- Espace de respiration entre le contenu et le pied de page -->")
          .append("          <div style=\"height: 25px;\"></div>")
          .append("          ").append(footerHtml)
          .append("        </td>")
          .append("      </tr>")
          .append("    </tfoot>")
          .append("  </table>")
          .append("</div>")
          .append("</body></html>");

        return sb.toString();
    }

    private String buildHeaderHtml() {
        String logo = "/logos/logo_symbole.png";
        String orgAr = "الهلال الأحمر التونسي";
        String subAr = "الهيئة الوطنية";
        String orgFr = "Croissant Rouge Tunisien";
        String orgEn = "Tunisian Red Crescent";
        String headerEn = "Tunisian Red Crescent";
        String subEn = "National Committee";
        String color = "#C8102E";
        int logoSize = 60;
        int headerHeight = 110;

        return "<div class=\"print-header\" style=\"height: " + headerHeight + "px;\">" +
               "  <div style=\"display:flex;align-items:flex-start;justify-content:space-between;width:100%;\">" +
               "    <!-- Bloc Gauche : Anglais / Français (LTR, 30%) -->" +
               "    <div style=\"width:30%; text-align:left; direction:ltr; font-family:'Segoe UI', sans-serif;\">" +
               "      <div style=\"font-size:10px;font-weight:700;color:#9B0B22;line-height:1.5;\">" +
               "        " + headerEn + "<br/>" + subEn + "" +
               "      </div>" +
               "    </div>" +
               "    <!-- Bloc Central : Logo + Titres (40%) -->" +
               "    <div style=\"width:40%; display:flex;flex-direction:column;align-items:center;gap:4px;\">" +
               "      <img src=\"" + logo + "\" alt=\"Logo CRT\" style=\"width:" + logoSize + "px;height:" + logoSize + "px;object-fit:contain;display:block;\" />" +
               "      <div style=\"font-size:9.5px;color:" + color + ";font-weight:700;text-align:center;direction:rtl;line-height:1.2;\">" + orgAr + "</div>" +
               "      <div style=\"font-size:7.5px;color:#555;text-align:center;line-height:1.2;\">" + orgFr + "</div>" +
               "      <div style=\"font-size:7.5px;color:#555;text-align:center;line-height:1.2;\">" + orgEn + "</div>" +
               "    </div>" +
               "    <!-- Bloc Droit : Arabe (RTL, 30%) -->" +
               "    <div style=\"width:30%; text-align:right; direction:rtl; font-family:'Times New Roman',serif;\">" +
               "      <div style=\"font-size:11px;color:#333;font-weight:700;line-height:1.6;\">" +
               "        " + orgAr + "<br/>" + subAr + "" +
               "      </div>" +
               "    </div>" +
               "  </div>" +
               "  <!-- Ligne rouge institutionnelle -->" +
               "  <div style=\"height:3px;background:" + color + ";margin-top:10px;width:100%;\"></div>" +
               "</div>";
    }

    private String buildFooterHtml() {
        String text = "المقر الاجتماعي: 19 نهج الجلاترا تونس 1000 | الهاتف: 71320151 | contact@croissant-rouge.tn";
        int footerHeight = 60;
        return "<div class=\"print-footer\" style=\"height: " + footerHeight + "px;\">" +
               "  <div style=\"font-size:8.5px;color:#666;text-align:center;direction:rtl;line-height:1.6;\">" + text + "</div>" +
               "  <div style=\"font-size:8px;color:#999;text-align:center;margin-top:4px;\" class=\"page-number\"></div>" +
               "</div>";
    }

    private String renderElement(JsonNode el, JsonNode filledData) {
        String type = el.path("type").asText("paragraph");
        String id = el.path("id").asText("");
        JsonNode props = el.path("props");

        String filledValue = (filledData != null && filledData.has(id))
                ? filledData.get(id).asText("")
                : "";

        return switch (type) {
            case "heading" -> {
                int level = props.path("level").asInt(1);
                String text = filledValue.isEmpty() ? props.path("text").asText("Titre") : filledValue;
                String color = props.has("color") ? props.get("color").asText() : "#1F2937";
                String textAlign = props.has("textAlign") ? props.get("textAlign").asText() : "left";
                int size = switch (level) {
                    case 1 -> 22;
                    case 2 -> 17;
                    case 3 -> 15;
                    case 4 -> 13;
                    case 5 -> 12;
                    case 6 -> 11;
                    default -> 16;
                };
                yield "<div class='element'><h" + level + " style=\"font-size:" + size + "pt;font-weight:700;color:" + color + ";text-align:" + textAlign + ";margin-bottom:8pt;break-inside:avoid;\">" + escape(text) + "</h" + level + "></div>";
            }
            case "subtitle" -> {
                String text = filledValue.isEmpty() ? props.path("text").asText("") : filledValue;
                if (text.isEmpty()) yield "";
                String color = props.has("color") ? props.get("color").asText() : "#6B7280";
                yield "<div class='element'><h4 style=\"font-size:11pt;font-weight:600;color:" + color + ";text-transform:uppercase;letter-spacing:1px;margin-bottom:6pt;break-inside:avoid;\">" + escape(text) + "</h4></div>";
            }
            case "paragraph" -> {
                String text = filledValue.isEmpty() ? props.path("text").asText("") : filledValue;
                if (text.isEmpty()) yield "";
                String color = props.has("color") ? props.get("color").asText() : "#374151";
                String textAlign = props.has("textAlign") ? props.get("textAlign").asText() : "left";
                int fontSize = props.has("fontSize") ? props.get("fontSize").asInt() : 11;
                yield "<div class='element'><p style=\"font-size:" + fontSize + "pt;color:" + color + ";line-height:1.7;white-space:pre-wrap;text-align:" + textAlign + ";margin-bottom:8pt;\">" + escape(text) + "</p></div>";
            }
            case "divider" -> {
                int borderWidth = props.has("borderWidth") ? props.get("borderWidth").asInt() : 1;
                String borderStyle = props.has("style") ? props.get("style").asText() : "solid";
                String color = props.has("color") ? props.get("color").asText() : "#E5E7EB";
                yield "<div class='element'><hr style=\"border:none;border-top:" + borderWidth + "px " + borderStyle + " " + color + ";margin:8pt 0;break-inside:avoid;\" /></div>";
            }
            case "image" -> {
                String src = props.path("src").asText("");
                String alt = props.path("alt").asText("image");
                String textAlign = props.has("textAlign") ? props.get("textAlign").asText() : "left";
                String widthStr = props.has("width") ? props.get("width").asText() + "%" : "auto";
                if (src.isEmpty()) {
                    yield "<div class='element' style=\"width:100%;height:60pt;background:#F9FAFB;border:1px dashed #E5E7EB;display:flex;align-items:center;justify-content:center;color:#9CA3AF;font-size:10pt;break-inside:avoid;\">📷 Image</div>";
                }
                yield "<div class='element' style=\"text-align:" + textAlign + ";break-inside:avoid;\"><img src='" + escape(src) + "' alt='" + escape(alt) +
                        "' style='max-width:100%;width:" + widthStr + ";border-radius:4px;'/></div>";
            }
            case "table" -> renderTable(props);
            case "text_input" -> {
                String label = props.path("label").asText("Champ texte");
                boolean required = props.path("required").asBoolean(false);
                String val = escape(filledValue);
                yield "<div class='element' style=\"margin-bottom:12pt;break-inside:avoid;\"><div class='field-label'>" + escape(label) + (required ? " *" : "") + "</div><div class='field-input'>" + val + "&nbsp;</div></div>";
            }
            case "textarea" -> {
                String label = props.path("label").asText("Zone de texte");
                boolean required = props.path("required").asBoolean(false);
                int rows = props.path("rows").asInt(3);
                String val = escape(filledValue);
                yield "<div class='element' style=\"margin-bottom:12pt;break-inside:avoid;\"><div class='field-label'>" + escape(label) + (required ? " *" : "") + "</div><div class='field-input textarea' style=\"min-height:" + (rows * 16) + "pt;\">" + val + "&nbsp;</div></div>";
            }
            case "checkbox" -> {
                String label = props.path("label").asText("");
                boolean required = props.path("required").asBoolean(false);
                JsonNode options = props.path("options");
                
                if (options.isArray() && !options.isEmpty()) {
                    StringBuilder items = new StringBuilder();
                    java.util.List<String> checked = new java.util.ArrayList<>();
                    if (filledData != null && filledData.has(id)) {
                        JsonNode valNode = filledData.get(id);
                        if (valNode.isArray()) {
                            for (JsonNode item : valNode) checked.add(item.asText());
                        } else {
                            checked.add(valNode.asText());
                        }
                    }
                    for (JsonNode opt : options) {
                        String optVal = opt.path("value").asText("");
                        String optLabel = opt.path("label").asText("");
                        boolean isChecked = checked.contains(optVal);
                        items.append("<div style=\"display:flex;align-items:center;gap:6pt;margin-bottom:3pt;break-inside:avoid;\">")
                             .append("<span style=\"width:10pt;height:10pt;border:1pt solid #374151;display:inline-block;border-radius:2pt;background:")
                             .append(isChecked ? "#374151" : "#fff").append(";\"></span>")
                             .append("<span style=\"line-height:1.6;\">").append(escape(optLabel)).append("</span></div>");
                    }
                    yield "<div class='element' style=\"margin-bottom:12pt;break-inside:avoid;\"><div class='field-label'>" + escape(label) + (required ? " *" : "") + "</div>" + items.toString() + "</div>";
                } else {
                    boolean isChecked = "true".equals(filledValue) || (filledData != null && filledData.path(id).asBoolean(false));
                    yield "<div class='element' style=\"margin-bottom:12pt;break-inside:avoid;display:flex;align-items:center;gap:6pt;\"><span style=\"width:10pt;height:10pt;border:1pt solid #374151;display:inline-block;border-radius:2pt;background:" + (isChecked ? "#374151" : "#fff") + ";\"></span><span style=\"line-height:1.6;\">" + escape(label.isEmpty() ? "Case à cocher" : label) + "</span></div>";
                }
            }
            case "radio" -> {
                String label = props.path("label").asText("Choix unique");
                boolean required = props.path("required").asBoolean(false);
                JsonNode options = props.path("options");
                StringBuilder items = new StringBuilder();
                if (options.isArray()) {
                    for (JsonNode opt : options) {
                        String optVal = opt.path("value").asText("");
                        String optLabel = opt.path("label").asText("");
                        boolean isSelected = optVal.equals(filledValue);
                        items.append("<div style=\"display:flex;align-items:center;gap:6pt;margin-bottom:3pt;break-inside:avoid;\">")
                             .append("<span style=\"width:10pt;height:10pt;border:1pt solid #374151;border-radius:50%;display:inline-block;background:")
                             .append(isSelected ? "#374151" : "#fff").append(";\"></span>")
                             .append("<span style=\"line-height:1.6;\">").append(escape(optLabel)).append("</span></div>");
                    }
                }
                yield "<div class='element' style=\"margin-bottom:12pt;break-inside:avoid;\"><div class='field-label'>" + escape(label) + (required ? " *" : "") + "</div>" + items.toString() + "</div>";
            }
            case "date_picker" -> {
                String label = props.path("label").asText("Date");
                boolean required = props.path("required").asBoolean(false);
                String val = escape(filledValue);
                yield "<div class='element' style=\"margin-bottom:12pt;break-inside:avoid;\"><div class='field-label'>" + escape(label) + (required ? " *" : "") + "</div><div class='field-input'>" + val + "</div></div>";
            }
            case "signature_block" -> {
                String label = props.path("label").asText("Signature");
                boolean required = props.path("required").asBoolean(false);
                String signerName = props.path("signerName").asText("");
                String signerRole = props.path("signerRole").asText("");
                
                String content;
                if (filledValue.isEmpty()) {
                    content = "<div style=\"border-bottom:1pt solid #9CA3AF;width:150pt;height:40pt;\"></div>";
                } else {
                    content = "<img src=\"" + filledValue + "\" style=\"max-height:60pt;border:1pt solid #E5E7EB;padding:3pt;\" />";
                }
                
                String nameHtml = signerName.isEmpty() ? "" : "<div style=\"font-size:9pt;font-weight:600;margin-top:3pt;\">" + escape(signerName) + "</div>";
                String roleHtml = signerRole.isEmpty() ? "" : "<div style=\"font-size:8pt;color:#C8102E;\">" + escape(signerRole) + "</div>";
                
                yield "<div class='element' style=\"margin-bottom:12pt;break-inside:avoid;\"><div class='field-label'>" + escape(label) + (required ? " *" : "") + "</div>" + content + nameHtml + roleHtml + "</div>";
            }
            case "file_upload" -> {
                String label = props.path("label").asText("Fichier");
                boolean required = props.path("required").asBoolean(false);
                yield "<div class='element' style=\"margin-bottom:12pt;break-inside:avoid;\"><div class='field-label'>" + escape(label) + (required ? " *" : "") + "</div><div style=\"border:1pt dashed #9CA3AF;min-height:20pt;padding:4pt 6pt;font-size:9pt;color:#6B7280;background:#F9FAFB;\">[Fichier joint]</div></div>";
            }
            case "page_break" -> "<div style=\"page-break-after:always;break-after:page;height:1px;\"></div>";
            default -> "<div class='element'><p>[Unsupported element: " + escape(type) + "]</p></div>";
        };
    }

    private String renderTable(JsonNode props) {
        StringBuilder sb = new StringBuilder("<div class='element' style=\"overflow-x:auto;\"><table style=\"width:100%;border-collapse:collapse;break-inside:avoid;\">");
        
        JsonNode columns = props.path("columns");
        JsonNode rows = props.path("rows");
        
        if (columns.isArray() && !columns.isEmpty()) {
            sb.append("<thead style=\"display:table-header-group;\"><tr>");
            for (JsonNode col : columns) {
                String title = col.has("title") ? col.path("title").asText() : col.path("id").asText("");
                sb.append("<th style=\"border:1pt solid #E5E7EB;padding:4pt 6pt;background:#F9FAFB;font-size:9pt;font-weight:600;text-align:left;\">")
                  .append(escape(title)).append("</th>");
            }
            sb.append("</tr></thead>");
            
            if (rows.isArray()) {
                sb.append("<tbody>");
                for (JsonNode row : rows) {
                    sb.append("<tr style=\"break-inside:avoid;\">");
                    JsonNode cells = row.path("cells");
                    for (JsonNode col : columns) {
                        String colId = col.path("id").asText("");
                        String cellVal = "";
                        if (cells.has(colId)) {
                            cellVal = cells.path(colId).path("value").asText("");
                        }
                        sb.append("<td style=\"border:1pt solid #E5E7EB;padding:4pt 6pt;font-size:9pt;\">")
                          .append(escape(cellVal)).append("</td>");
                    }
                    sb.append("</tr>");
                }
                sb.append("</tbody>");
            }
        } else {
            JsonNode headers = props.path("headers");
            if (headers.isArray() && !headers.isEmpty()) {
                sb.append("<thead style=\"display:table-header-group;\"><tr>");
                for (JsonNode h : headers) {
                    sb.append("<th style=\"border:1pt solid #E5E7EB;padding:4pt 6pt;background:#F9FAFB;font-size:9pt;font-weight:600;text-align:left;\">")
                      .append(escape(h.asText())).append("</th>");
                }
                sb.append("</tr></thead>");
            }
            if (rows.isArray()) {
                sb.append("<tbody>");
                for (JsonNode row : rows) {
                    sb.append("<tr style=\"break-inside:avoid;\">");
                    if (row.isArray()) {
                        for (JsonNode cell : row) {
                            sb.append("<td style=\"border:1pt solid #E5E7EB;padding:4pt 6pt;font-size:9pt;\">")
                              .append(escape(cell.asText())).append("</td>");
                        }
                    }
                    sb.append("</tr>");
                }
                sb.append("</tbody>");
            }
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
        if (text == null)
            return "";
        return text.replace("&", "&amp;")
                .replace("<", "&lt;")
                .replace(">", "&gt;")
                .replace("\"", "&quot;");
    }
}
