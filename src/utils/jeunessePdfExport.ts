// ============================================================
// NEXUS-AID — Jeunesse PDF Export Utility
// Generates beautiful, CRT-branded PDF reports for Jeunesse stats
// Uses jsPDF + jspdf-autotable
// ============================================================

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const CRT_RED = [200, 16, 46] as [number, number, number];
const CRT_DARK = [30, 30, 30] as [number, number, number];
const CRT_LIGHT = [248, 248, 248] as [number, number, number];
const CRT_GRAY = [120, 120, 120] as [number, number, number];
const CRT_WHITE: [number, number, number] = [255, 255, 255];

function drawHeader(doc: jsPDF, title: string, subtitle: string) {
    const w = doc.internal.pageSize.getWidth();

    // Red gradient banner
    doc.setFillColor(...CRT_RED);
    doc.rect(0, 0, w, 44, 'F');

    // Subtle red accent stripe at the bottom of the banner
    doc.setFillColor(170, 10, 30);
    doc.rect(0, 40, w, 4, 'F');

    // Crescent icon placeholder (circle)
    doc.setFillColor(...CRT_WHITE);
    doc.circle(18, 22, 11, 'F');
    doc.setFillColor(...CRT_RED);
    doc.circle(21, 20, 8, 'F'); // create crescent shape

    // Title
    doc.setTextColor(...CRT_WHITE);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.text(title, 36, 20);

    // Subtitle
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(subtitle, 36, 30);

    // Date top right
    doc.setFontSize(9);
    const dateStr = new Date().toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric' });
    doc.text(dateStr, w - 10, 20, { align: 'right' });

    // "Confidentiel" badge
    doc.setFillColor(255, 255, 255, 0.15);
    doc.setDrawColor(...CRT_WHITE);
    doc.roundedRect(w - 62, 26, 52, 10, 3, 3, 'S');
    doc.setFontSize(8);
    doc.text('RAPPORT OFFICIEL CRT', w - 36, 32.5, { align: 'center' });
}

function drawFooter(doc: jsPDF, pageNum: number, totalPages: number) {
    const w = doc.internal.pageSize.getWidth();
    const h = doc.internal.pageSize.getHeight();

    doc.setFillColor(...CRT_RED);
    doc.rect(0, h - 14, w, 14, 'F');

    doc.setTextColor(...CRT_WHITE);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text('Croissant-Rouge Tunisien — Système Nexus-AID', 12, h - 5);
    doc.text(`Page ${pageNum} / ${totalPages}`, w - 12, h - 5, { align: 'right' });
    doc.text('Confidentiel — Usage Interne', w / 2, h - 5, { align: 'center' });
}

function drawSectionTitle(doc: jsPDF, text: string, y: number) {
    const w = doc.internal.pageSize.getWidth();
    doc.setFillColor(...CRT_RED);
    doc.rect(12, y, 4, 7, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(...CRT_DARK);
    doc.text(text, 20, y + 5.5);
    doc.setDrawColor(230, 230, 230);
    doc.line(20, y + 9, w - 12, y + 9);
    return y + 14;
}

function drawKpiRow(doc: jsPDF, kpis: { label: string; value: string | number; color?: [number, number, number] }[], startY: number) {
    const w = doc.internal.pageSize.getWidth();
    const cardW = (w - 28) / kpis.length;
    let x = 12;
    kpis.forEach((kpi) => {
        const col: [number, number, number] = kpi.color || CRT_RED;
        doc.setFillColor(250, 250, 250);
        doc.setDrawColor(230, 230, 230);
        doc.roundedRect(x, startY, cardW - 4, 24, 4, 4, 'FD');

        // Colored left accent
        doc.setFillColor(...col);
        doc.roundedRect(x, startY, 4, 24, 2, 2, 'F');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(18);
        doc.setTextColor(...col);
        doc.text(String(kpi.value), x + cardW / 2, startY + 13, { align: 'center' });

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.setTextColor(...CRT_GRAY);
        doc.text(kpi.label.toUpperCase(), x + cardW / 2, startY + 21, { align: 'center' });

        x += cardW;
    });
    return startY + 30;
}

export interface JeunessePdfData {
    committeeName?: string;
    level?: string;
    totalForms?: number;
    totalProjects?: number;
    totalRecommendations?: number;
    projects?: { title: string; theme: string; status: string; startDate: string; endDate: string }[];
    recommendations?: { title: string; category: string; priority: string; status: string; target: string }[];
    templates?: { title: string; description: string; responseCount: number; status: string }[];
}

export function exportJeunessePDF(data: JeunessePdfData) {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

    const committeeName = data.committeeName || 'Tunisie';
    const level = data.level || 'National';
    const title = `Rapport Jeunesse — ${committeeName}`;
    const subtitle = `Direction Jeunesse & Intégration — Niveau ${level}`;

    // ─── PAGE 1: Header + KPIs + Projects ────────────────────────
    drawHeader(doc, title, subtitle);
    let y = 56;

    // KPI Cards
    y = drawSectionTitle(doc, 'Indicateurs Clés de Performance', y);
    y = drawKpiRow(doc, [
        { label: 'Soumissions Reçues', value: data.totalForms ?? 0, color: CRT_RED },
        { label: 'Micro-Projets', value: data.totalProjects ?? 0, color: [5, 150, 105] },
        { label: 'Recommandations', value: data.totalRecommendations ?? 0, color: [37, 99, 235] },
    ], y);

    y += 6;

    // Projects table
    if (data.projects && data.projects.length > 0) {
        y = drawSectionTitle(doc, 'Micro-Projets', y);
        autoTable(doc, {
            startY: y,
            head: [['Titre', 'Thème', 'Dates', 'Statut']],
            body: data.projects.map(p => [
                p.title,
                p.theme,
                `${p.startDate || '—'} → ${p.endDate || '—'}`,
                p.status
            ]),
            headStyles: {
                fillColor: CRT_RED,
                textColor: CRT_WHITE,
                fontStyle: 'bold',
                fontSize: 9,
                cellPadding: 4,
            },
            alternateRowStyles: { fillColor: CRT_LIGHT },
            bodyStyles: { fontSize: 8.5, cellPadding: 3.5 },
            columnStyles: {
                0: { cellWidth: 60 },
                1: { cellWidth: 35 },
                2: { cellWidth: 50 },
                3: { cellWidth: 30, halign: 'center' }
            },
            margin: { left: 12, right: 12 },
            didDrawPage: (hookData) => {
                drawHeader(doc, title, subtitle);
                drawFooter(doc, doc.getNumberOfPages(), doc.getNumberOfPages());
                hookData.settings.startY = 56;
            },
            willDrawCell: (hookData) => {
                if (hookData.section === 'body' && hookData.column.index === 3) {
                    const status = hookData.cell.raw as string;
                    if (status === 'APPROVED' || status === 'ACTIVE') {
                        hookData.cell.styles.textColor = [5, 150, 105];
                        hookData.cell.styles.fontStyle = 'bold';
                    } else if (status === 'REJECTED') {
                        hookData.cell.styles.textColor = CRT_RED;
                        hookData.cell.styles.fontStyle = 'bold';
                    } else {
                        hookData.cell.styles.textColor = [180, 130, 0];
                        hookData.cell.styles.fontStyle = 'bold';
                    }
                }
            },
        });
        y = (doc as any).lastAutoTable.finalY + 8;
    }

    // Recommendations table
    if (data.recommendations && data.recommendations.length > 0) {
        if (y > 200) {
            doc.addPage();
            drawHeader(doc, title, subtitle);
            y = 56;
        }
        y = drawSectionTitle(doc, 'Recommandations Publiées', y);
        autoTable(doc, {
            startY: y,
            head: [['Titre', 'Catégorie', 'Priorité', 'Cible', 'Statut']],
            body: data.recommendations.map(r => [
                r.title,
                r.category,
                r.priority,
                r.target,
                r.status
            ]),
            headStyles: {
                fillColor: [37, 99, 235],
                textColor: CRT_WHITE,
                fontStyle: 'bold',
                fontSize: 9,
                cellPadding: 4,
            },
            alternateRowStyles: { fillColor: CRT_LIGHT },
            bodyStyles: { fontSize: 8.5, cellPadding: 3.5 },
            columnStyles: {
                0: { cellWidth: 55 },
                1: { cellWidth: 35 },
                2: { cellWidth: 25, halign: 'center' },
                3: { cellWidth: 40 },
                4: { cellWidth: 25, halign: 'center' }
            },
            margin: { left: 12, right: 12 },
            didDrawPage: () => {
                drawHeader(doc, title, subtitle);
                drawFooter(doc, doc.getNumberOfPages(), doc.getNumberOfPages());
            },
        });
        y = (doc as any).lastAutoTable.finalY + 8;
    }

    // Forms/Templates table
    if (data.templates && data.templates.length > 0) {
        if (y > 200) {
            doc.addPage();
            drawHeader(doc, title, subtitle);
            y = 56;
        }
        y = drawSectionTitle(doc, 'Formulaires Publiés', y);
        autoTable(doc, {
            startY: y,
            head: [['Titre', 'Description', 'Réponses', 'Statut']],
            body: data.templates.map(t => [
                t.title,
                t.description || '—',
                t.responseCount,
                t.status
            ]),
            headStyles: {
                fillColor: [5, 150, 105],
                textColor: CRT_WHITE,
                fontStyle: 'bold',
                fontSize: 9,
                cellPadding: 4,
            },
            alternateRowStyles: { fillColor: CRT_LIGHT },
            bodyStyles: { fontSize: 8.5, cellPadding: 3.5 },
            columnStyles: {
                0: { cellWidth: 60 },
                1: { cellWidth: 70 },
                2: { cellWidth: 25, halign: 'center' },
                3: { cellWidth: 25, halign: 'center' }
            },
            margin: { left: 12, right: 12 },
            didDrawPage: () => {
                drawHeader(doc, title, subtitle);
                drawFooter(doc, doc.getNumberOfPages(), doc.getNumberOfPages());
            },
        });
    }

    // Draw footer on all pages
    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        drawFooter(doc, i, totalPages);
    }

    const fileName = `rapport_jeunesse_${committeeName.toLowerCase().replace(/ /g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(fileName);
}
