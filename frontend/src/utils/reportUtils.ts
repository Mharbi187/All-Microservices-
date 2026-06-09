import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export interface PDFMetadata {
    managerName: string;
    committee: string;
    date: string;
}

export const exportToPDF = async (elementId: string, filename: string, metadata?: PDFMetadata) => {
    const element = document.getElementById(elementId);
    if (!element) return;

    try {
        const canvas = await html2canvas(element, {
            scale: 2,
            useCORS: true,
            logging: false,
            backgroundColor: '#ffffff'
        });
        
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();

        // --- Premium Header Design ---
        if (metadata) {
            // Background Header Strip
            pdf.setFillColor(239, 68, 68); // Red (CRT Primary)
            pdf.rect(0, 0, pageWidth, 40, 'F');

            // CRT Logo / Title
            pdf.setTextColor(255, 255, 255);
            pdf.setFontSize(22);
            pdf.setFont('helvetica', 'bold');
            pdf.text('CROISSANT ROUGE TUNISIEN', 15, 18);
            
            pdf.setFontSize(10);
            pdf.setFont('helvetica', 'normal');
            pdf.text('RECONNU D\'UTILITÉ PUBLIQUE - DÉCRET DU 06 MAI 1957', 15, 25);

            // Divider line
            pdf.setDrawColor(255, 255, 255, 0.5);
            pdf.line(15, 28, 80, 28);

            // Domain Label
            pdf.setFontSize(14);
            pdf.setFont('helvetica', 'bold');
            pdf.text('DIRECTION JEUNESSE ET VOLONTARIAT', 15, 35);

            // Metadata Box
            pdf.setFillColor(255, 255, 255);
            pdf.setDrawColor(229, 231, 235);
            pdf.roundedRect(pageWidth - 85, 8, 75, 25, 3, 3, 'FD');

            pdf.setTextColor(31, 41, 55);
            pdf.setFontSize(8);
            pdf.setFont('helvetica', 'bold');
            pdf.text('DOCUMENT OFFICIEL', pageWidth - 80, 14);
            
            pdf.setFontSize(9);
            pdf.setFont('helvetica', 'normal');
            pdf.text(`Responsable: ${metadata.managerName}`, pageWidth - 80, 20);
            pdf.text(`Comité: ${metadata.committee}`, pageWidth - 80, 25);
            pdf.text(`Date: ${metadata.date}`, pageWidth - 80, 30);
        }

        // --- Content Integration ---
        const imgProps = pdf.getImageProperties(imgData);
        const margin = 15;
        const availableWidth = pageWidth - (margin * 2);
        const contentWidth = availableWidth;
        const contentHeight = (imgProps.height * contentWidth) / imgProps.width;

        // Position content below header
        const yPos = metadata ? 50 : 15;
        
        pdf.addImage(imgData, 'PNG', margin, yPos, contentWidth, contentHeight);

        // Footer
        pdf.setTextColor(156, 163, 175);
        pdf.setFontSize(8);
        pdf.text('Généré via la plateforme Nexus-Aid — Croissant Rouge Tunisien', pageWidth / 2, pageHeight - 10, { align: 'center' });

        pdf.save(`${filename}.pdf`);
    } catch (error) {
        console.error('PDF Generation Error:', error);
    }
};

export const formatPercent = (value: number, total: number) => {
    if (!total) return '0%';
    return `${Math.round((value / total) * 100)}%`;
};
