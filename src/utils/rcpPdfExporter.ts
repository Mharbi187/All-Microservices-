// ============================================================
// NEXUS-AID — RCP Evaluation PDF Exporter Utility
// Generates a premium, beautifully styled, A4-structured PDF
// ============================================================

import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import type { RcpEvaluationDTO } from '@/types';

const CRITERIA_NAMES: Record<string, string> = {
    handPosition: 'Position des mains',
    compressionDepth: 'Profondeur des compressions',
    frequency: 'Fréquence des compressions',
    chestRelease: 'Décompression thoracique',
    ventilation: 'Insufflations',
    ratio: 'Ratio compression/ventilation',
    interruptions: 'Gestion des interruptions',
    fatigue: 'Résistance à la fatigue',
    reactivity: 'Réactivité aux alertes',
    globalQuality: 'Qualité globale',
};

const DECISION_LABELS: Record<string, string> = {
    PRET: '✅ Prêt pour la certification',
    AMELIORATIONS_MINEURES: '⚠️ Améliorations mineures requises',
    AMELIORATIONS_MAJEURES: '🟠 Améliorations majeures requises',
    NON_RECOMMANDE: '❌ Non recommandé actuellement',
};

const LEVEL_LABELS: Record<string, string> = {
    DEBUTANT: 'Débutant',
    INTERMEDIAIRE: 'Intermédiaire',
    AVANCE: 'Avancé',
    PROFESSIONNEL: 'Professionnel de santé',
};

const CONCORDANCE_COLORS: Record<string, string> = {
    EXCELLENT: '#10b981',
    BON: '#22c55e',
    MOYEN: '#f59e0b',
    FAIBLE: '#ef4444',
};

export const exportRcpToPdf = async (evalData: Partial<RcpEvaluationDTO>) => {
    // 1. Create a print-optimized hidden container
    const printContainer = document.createElement('div');
    printContainer.style.position = 'absolute';
    printContainer.style.left = '-9999px';
    printContainer.style.top = '-9999px';
    printContainer.style.width = '794px'; // Standard A4 width at 96 DPI
    printContainer.style.background = '#ffffff';
    printContainer.style.color = '#1f2937';
    printContainer.style.fontFamily = 'Inter, system-ui, -apple-system, sans-serif';
    printContainer.style.padding = '35px';
    printContainer.style.boxSizing = 'border-box';
    printContainer.style.lineHeight = '1.4';

    // Concordance color configurations
    const concordanceVal = evalData.concordanceLevel || 'EXCELLENT';
    const concordanceBg = CONCORDANCE_COLORS[concordanceVal] || '#10b981';
    
    // Decision label
    const decisionText = evalData.trainerDecision ? (DECISION_LABELS[evalData.trainerDecision] || evalData.trainerDecision) : '—';
    const levelText = evalData.participantLevel ? (LEVEL_LABELS[evalData.participantLevel] || evalData.participantLevel) : 'Débutant';

    // Construct criteria rows
    let criteriaRows = '';
    const scores = evalData.scores || {};
    const comments = evalData.comments || {};
    
    Object.entries(CRITERIA_NAMES).forEach(([key, name]) => {
        const score = scores[key] !== undefined ? scores[key] : '—';
        const comment = comments[key] || 'Aucun';
        
        let scoreBg = '#f3f4f6';
        let scoreColor = '#4b5563';
        if (score !== '—') {
            const num = Number(score);
            if (num >= 7) { scoreBg = '#e6f4ea'; scoreColor = '#137333'; }
            else if (num >= 5) { scoreBg = '#fef7e0'; scoreColor = '#b06000'; }
            else { scoreBg = '#fce8e6'; scoreColor = '#c5221f'; }
        }

        criteriaRows += `
            <tr style="border-bottom: 1px solid #e5e7eb;">
                <td style="padding: 6px 10px; font-weight: 600; color: #374151;">${name}</td>
                <td style="padding: 6px 10px; text-align: center;">
                    <span style="background: ${scoreBg}; color: ${scoreColor}; font-weight: 800; padding: 2px 6px; border-radius: 4px; font-size: 10px;">${score}</span>
                </td>
                <td style="padding: 6px 10px; color: #4b5563; font-size: 10.5px;">${comment}</td>
            </tr>
        `;
    });

    // Check recommendations
    let recommendationsHtml = '';
    const recs = evalData.recommendations || {};
    const highRecs = recs.high || [];
    const medRecs = recs.medium || [];
    const lowRecs = recs.low || [];
    
    if (highRecs.length > 0 || medRecs.length > 0 || lowRecs.length > 0) {
        let recListHtml = '';
        if (highRecs.length > 0) {
            recListHtml += `
                <div style="margin-bottom: 6px;">
                    <strong style="color: #ef4444; font-size: 10px; text-transform: uppercase;">⚠️ Priorité Haute :</strong>
                    <ul style="margin: 2px 0 0 15px; padding: 0; font-size: 9.5px; color: #374151;">
                        ${highRecs.map(r => `<li>${r}</li>`).join('')}
                    </ul>
                </div>
            `;
        }
        if (medRecs.length > 0) {
            recListHtml += `
                <div style="margin-bottom: 6px;">
                    <strong style="color: #f59e0b; font-size: 10px; text-transform: uppercase;">⚡ Priorité Moyenne :</strong>
                    <ul style="margin: 2px 0 0 15px; padding: 0; font-size: 9.5px; color: #374151;">
                        ${medRecs.map(r => `<li>${r}</li>`).join('')}
                    </ul>
                </div>
            `;
        }
        if (lowRecs.length > 0) {
            recListHtml += `
                <div style="margin-bottom: 4px;">
                    <strong style="color: #10b981; font-size: 10px; text-transform: uppercase;">✅ Priorité Basse :</strong>
                    <ul style="margin: 2px 0 0 15px; padding: 0; font-size: 9.5px; color: #374151;">
                        ${lowRecs.map(r => `<li>${r}</li>`).join('')}
                    </ul>
                </div>
            `;
        }
        
        recommendationsHtml = `
            <div style="margin-top: 15px; border: 1px solid #e5e7eb; border-radius: 8px; padding: 10px; background: #fafafa;">
                <h4 style="margin: 0 0 8px 0; font-size: 11px; color: #374151; text-transform: uppercase; font-weight: 700;">📋 Recommandations d'Amélioration</h4>
                ${recListHtml}
            </div>
        `;
    }

    // Check problems
    const problemsList = evalData.problemsEncountered || [];
    let problemsHtml = '';
    if (problemsList.length > 0 || evalData.problemDescription) {
        const probTags = problemsList.map(p => 
            `<span style="background: #fffbeb; color: #b45309; border: 1px solid #fde68a; font-size: 9px; font-weight: 600; padding: 2px 6px; border-radius: 4px; margin-right: 5px; display: inline-block;">${p.replace(/_/g, ' ')}</span>`
        ).join('');

        problemsHtml = `
            <div style="margin-top: 15px; border: 1px dashed #f59e0b; border-radius: 6px; padding: 10px; background: #fffdf5;">
                <h4 style="margin: 0 0 6px 0; font-size: 11px; color: #b45309; text-transform: uppercase; font-weight: 700;">⚠️ Problèmes techniques observés</h4>
                <div style="margin-bottom: 6px;">${probTags}</div>
                ${evalData.problemDescription ? `<p style="margin: 0; font-size: 10px; color: #4b5563;">${evalData.problemDescription}</p>` : ''}
            </div>
        `;
    }

    // Check photos
    let photosHtml = '';
    const hasParticipantPhoto = !!evalData.photoParticipant;
    const hasCardiacPhoto = !!evalData.photoCardiacPosition;
    const hasAiPhoto = !!evalData.photoAiScreenshot;

    if (hasParticipantPhoto || hasCardiacPhoto || hasAiPhoto) {
        let cols = '';
        if (hasParticipantPhoto) {
            cols += `
                <div style="flex: 1; text-align: center;">
                    <span style="font-size: 9px; color: #6b7280; display: block; margin-bottom: 4px; font-weight: 600;">Participant</span>
                    <img src="${evalData.photoParticipant}" style="max-height: 80px; max-width: 100%; border-radius: 6px; border: 1px solid #d1d5db; object-fit: cover;" />
                </div>
            `;
        }
        if (hasCardiacPhoto) {
            cols += `
                <div style="flex: 1; text-align: center;">
                    <span style="font-size: 9px; color: #6b7280; display: block; margin-bottom: 4px; font-weight: 600;">Position de massage</span>
                    <img src="${evalData.photoCardiacPosition}" style="max-height: 80px; max-width: 100%; border-radius: 6px; border: 1px solid #d1d5db; object-fit: cover;" />
                </div>
            `;
        }
        if (hasAiPhoto) {
            cols += `
                <div style="flex: 1; text-align: center;">
                    <span style="font-size: 9px; color: #6b7280; display: block; margin-bottom: 4px; font-weight: 600;">Capture IA</span>
                    <img src="${evalData.photoAiScreenshot}" style="max-height: 80px; max-width: 100%; border-radius: 6px; border: 1px solid #d1d5db; object-fit: cover;" />
                </div>
            `;
        }

        photosHtml = `
            <div style="margin-top: 15px; border: 1px solid #e5e7eb; border-radius: 8px; padding: 10px; background: #fafafa;">
                <h4 style="margin: 0 0 8px 0; font-size: 11px; color: #374151; text-transform: uppercase; font-weight: 700;">📸 Preuves & Captures de Test</h4>
                <div style="display: flex; gap: 15px; justify-content: space-between;">
                    ${cols}
                </div>
            </div>
        `;
    }

    // HTML template content
    printContainer.innerHTML = `
        <div style="border: 2px solid #ef4444; border-radius: 12px; padding: 25px; box-sizing: border-box;">
            <!-- HEADER -->
            <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 2.5px solid #ef4444; padding-bottom: 12px; margin-bottom: 15px;">
                <div style="display: flex; align-items: center; gap: 12px;">
                    <div style="width: 44px; height: 44px; background: #ef4444; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 24px; color: white; font-weight: bold;">
                        <svg viewBox="0 0 1024 1024" width="28" height="28" fill="white">
                            <path d="M923 283.6c-13.4-31.1-32.6-58.9-56.9-82.8-24.3-23.8-52.5-42.4-83.6-55.2-32.5-13.4-66.9-20.1-102.3-20.1-49.6 0-96.2 13-136.7 37.6-40.5-24.6-87.1-37.6-136.7-37.6-35.4 0-69.8 6.7-102.3 20.1-31.1 12.8-59.3 31.4-83.6 55.2-24.3 23.9-43.5 51.7-56.9 82.8-13.7 31.8-20.6 65.6-20.6 100.5 0 35 6.9 68.7 20.6 100.5 13.4 31.1 32.6 58.9 56.9 82.8 24.3 23.8 52.5 42.4 83.6 55.2 32.5 13.4 66.9 20.1 102.3 20.1 49.6 0 96.2-13 136.7-37.6 40.5 24.6 87.1 37.6 136.7 37.6 35.4 0 69.8-6.7 102.3-20.1 31.1-12.8 59.3-31.4 83.6-55.2 24.3-23.9 43.5-51.7 56.9-82.8 13.7-31.8 20.6-65.6 20.6-100.5 0-34.9-6.9-68.7-20.6-100.5z"></path>
                        </svg>
                    </div>
                    <div>
                        <h1 style="margin: 0; font-size: 17px; color: #b91c1c; font-weight: 800; letter-spacing: 0.02em;">CROISSANT ROUGE TUNISIEN</h1>
                        <p style="margin: 0; font-size: 9.5px; color: #6b7280; font-weight: 700; letter-spacing: 0.05em;">ASSISTANT INTELLIGENT DE CORRECTION RCP EN TEMPS RÉEL</p>
                    </div>
                </div>
                <div style="text-align: right;">
                    <span style="background: #fef2f2; color: #ef4444; padding: 4px 10px; border-radius: 8px; font-size: 10px; font-weight: 700; border: 1px solid #fee2e2; display: inline-block;">
                        Session d'Évaluation
                    </span>
                    <p style="margin: 4px 0 0 0; font-size: 10px; color: #4b5563; font-weight: 600;">Date: ${evalData.evaluationDate ? new Date(evalData.evaluationDate).toLocaleDateString('fr-FR') : '—'}</p>
                </div>
            </div>

            <!-- PARTICIPANT & TRAINER INFO -->
            <div style="display: grid; grid-template-columns: 1.25fr 0.75fr; gap: 15px; margin-bottom: 15px; border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px; background: #fafafa;">
                <div>
                    <span style="font-size: 8.5px; color: #6b7280; text-transform: uppercase; font-weight: 700; display: block; margin-bottom: 2px;">Candidat évalué</span>
                    <strong style="font-size: 13px; color: #111827;">${evalData.participantName || 'Anonyme'}</strong>
                    <span style="font-size: 10.5px; color: #4b5563; display: block; margin-top: 2px;">Niveau : ${levelText}</span>
                    <span style="font-size: 10.5px; color: #4b5563; display: block;">Centre : ${evalData.trainerCenter || 'Non spécifié'}</span>
                </div>
                <div style="border-left: 1px solid #e5e7eb; padding-left: 15px;">
                    <span style="font-size: 8.5px; color: #6b7280; text-transform: uppercase; font-weight: 700; display: block; margin-bottom: 2px;">Formateur Responsable</span>
                    <strong style="font-size: 12px; color: #111827; display: block;">${evalData.trainerName || '—'}</strong>
                    <strong style="font-size: 11.5px; color: #111827;">${evalData.totalAttempts || 1} essai(s) · Assistant IA ${evalData.aiVersion || 'v2.4'}</strong>
                </div>
            </div>

            <!-- SCORES SECTION -->
            <h3 style="font-size: 11px; color: #b91c1c; border-bottom: 1.5px solid #f3f4f6; padding-bottom: 4px; margin: 0 0 8px 0; font-weight: 800; letter-spacing: 0.02em;">ÉVALUATION DES PERFORMANCES</h3>
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 15px; font-size: 10px;">
                <thead>
                    <tr style="background: #f3f4f6; text-align: left; color: #374151; font-weight: bold; border-bottom: 1px solid #d1d5db;">
                        <th style="padding: 6px 10px; border: 1px solid #e5e7eb;">Critère RCP évalue</th>
                        <th style="padding: 6px 10px; border: 1px solid #e5e7eb; width: 60px; text-align: center;">Score</th>
                        <th style="padding: 6px 10px; border: 1px solid #e5e7eb;">Commentaires observations</th>
                    </tr>
                </thead>
                <tbody>
                    ${criteriaRows}
                </tbody>
            </table>

            <!-- CONCORDANCE & DECISION -->
            <div style="display: grid; grid-template-columns: 1.1fr 0.9fr; gap: 15px; margin-bottom: 10px;">
                <div style="border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px; background: #fafafa;">
                    <h4 style="margin: 0 0 8px 0; font-size: 11px; color: #111827; font-weight: 700; text-transform: uppercase;">📊 Alignement Concordance</h4>
                    <table style="width: 100%; font-size: 10.5px; border-collapse: collapse;">
                        <tr><td style="color: #6b7280; padding: 2px 0;">Score Global IA:</td><td style="font-weight: 700; color: #2563eb; text-align: right;">${evalData.scoreIa ? Number(evalData.scoreIa).toFixed(1) : '—'}/10</td></tr>
                        <tr><td style="color: #6b7280; padding: 2px 0;">Score Global Formateur:</td><td style="font-weight: 700; color: #ef4444; text-align: right;">${evalData.scoreTrainer ? Number(evalData.scoreTrainer).toFixed(1) : '—'}/10</td></tr>
                        <tr><td style="color: #6b7280; padding: 2px 0;">Écart de concordance:</td><td style="font-weight: 700; text-align: right;">${evalData.concordanceGap !== undefined ? Number(evalData.concordanceGap).toFixed(1) : '—'} pts</td></tr>
                        <tr>
                            <td style="color: #6b7280; padding: 2px 0;">Niveau d'alignement:</td>
                            <td style="text-align: right;">
                                <span style="background: ${concordanceBg}; color: white; padding: 2px 6px; border-radius: 4px; font-size: 9.5px; font-weight: bold; display: inline-block;">
                                    ${concordanceVal}
                                </span>
                            </td>
                        </tr>
                    </table>
                </div>
                <div style="border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px; background: #fafafa; display: flex; flex-direction: column;">
                    <h4 style="margin: 0 0 8px 0; font-size: 11px; color: #111827; font-weight: 700; text-transform: uppercase;">🎯 Décision finale du Formateur</h4>
                    <div style="font-weight: 800; color: ${evalData.trainerDecision === 'PRET' ? '#10b981' : '#b45309'}; margin-bottom: 6px; font-size: 11px; display: flex; align-items: center; gap: 4px;">
                        ${decisionText}
                    </div>
                    <p style="margin: 0; font-size: 9.5px; color: #4b5563; font-style: italic; line-height: 1.35; flex: 1; overflow: hidden; text-overflow: ellipsis;">
                        ${evalData.trainerFinalComments || 'Aucun commentaire final de certification.'}
                    </p>
                </div>
            </div>

            <!-- RECOMMENDATIONS -->
            ${recommendationsHtml}

            <!-- PROBLEMS -->
            ${problemsHtml}

            <!-- PHOTOS -->
            ${photosHtml}

            <!-- SIGNATURE -->
            <div style="display: flex; justify-content: flex-end; margin-top: 15px;">
                <div style="text-align: center; border-top: 1px dashed #d1d5db; width: 200px; padding-top: 6px;">
                    <span style="font-size: 9px; color: #6b7280; display: block; margin-bottom: 3px; font-weight: 600;">Signature & Validation</span>
                    <span style="font-family: 'Brush Script MT', cursive, sans-serif; font-size: 13.5px; font-weight: bold; color: #111827;">${evalData.trainerSignature || evalData.trainerName}</span>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(printContainer);

    // 2. Generate PDF via html2canvas and jsPDF
    try {
        const canvas = await html2canvas(printContainer, {
            scale: 2, // High resolution
            useCORS: true,
            allowTaint: true,
            backgroundColor: '#ffffff'
        });

        const imgData = canvas.toDataURL('image/jpeg', 0.95);
        
        // A4 Dimensions: 210mm x 297mm
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        
        // Compute scaled height to fit perfectly
        const imgWidth = 210;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        
        // Add page image
        pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, imgHeight > pdfHeight ? pdfHeight : imgHeight);
        
        // Save PDF with meaningful name
        const filename = `evaluation_rcp_${evalData.participantName ? evalData.participantName.toLowerCase().replace(/[^a-z0-9]/g, '_') : 'test'}.pdf`;
        pdf.save(filename);
    } catch (error) {
        console.error("Failed to generate PDF export", error);
        throw error;
    } finally {
        // Cleanup DOM
        document.body.removeChild(printContainer);
    }
};
