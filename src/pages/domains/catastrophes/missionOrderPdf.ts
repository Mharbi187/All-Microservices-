// ============================================================
// NEXUS-AID — Mission Order PDF Generator
// Generates a professional PDF "Ordre de Mission" for volunteers
// Uses browser print API (no extra dependency needed)
// ============================================================
import type { DisasterMissionDTO } from '@/types';

const MISSION_TYPE_LABELS: Record<string, string> = {
    SECOURS: 'Secours',
    EVACUATION: 'Évacuation',
    LOGISTIQUE: 'Logistique',
    MEDICAL: 'Médical',
    SURVEILLANCE: 'Surveillance',
};

function formatDate(iso?: string): string {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('fr-TN', {
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit',
    });
}

/**
 * Opens a new browser window and prints/saves a professional
 * "Ordre de Mission" PDF for the given disaster mission.
 */
export function generateMissionOrderPdf(mission: DisasterMissionDTO): void {
    const missionType = MISSION_TYPE_LABELS[mission.missionType] ?? mission.missionType;
    const startDate = formatDate(mission.startDatetime);
    const endDate = formatDate(mission.endDatetime);
    const gps = mission.locationGps
        ? `Lat: ${mission.locationGps.lat}, Lng: ${mission.locationGps.lng}${mission.locationGps.address ? ` — ${mission.locationGps.address}` : ''}`
        : '—';

    const volunteersHtml = (mission.assignedVolunteers ?? [])
        .map((v, i) => `
            <tr style="background: ${i % 2 === 0 ? '#fff' : '#f9fafb'}">
                <td style="padding:8px 12px;border:1px solid #e5e7eb">${v.fullName}</td>
                <td style="padding:8px 12px;border:1px solid #e5e7eb">${v.matricule ?? '—'}</td>
                <td style="padding:8px 12px;border:1px solid #e5e7eb">
                    <span style="background:${v.teamType === 'NDRT' ? '#fef2f2' : '#eff6ff'};color:${v.teamType === 'NDRT' ? '#e01c2e' : '#1890ff'};
                        padding:2px 8px;border-radius:4px;font-size:11px;font-weight:600">
                        ${v.teamType ?? 'RDRT'}
                    </span>
                </td>
                <td style="padding:8px 12px;border:1px solid #e5e7eb">${v.committeeName ?? '—'}</td>
                <td style="padding:8px 12px;border:1px solid #e5e7eb">${v.phone ?? '—'}</td>
            </tr>`)
        .join('');

    const materialsHtml = (mission.requiredMaterials ?? [])
        .map(m => `<li style="margin:4px 0;color:#374151">${m}</li>`)
        .join('');

    const html = `
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <title>Ordre de Mission — ${mission.missionNumber ?? mission.title}</title>
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
            font-family: 'Segoe UI', Arial, sans-serif;
            color: #1f2937;
            background: #fff;
            padding: 40px;
            font-size: 14px;
            line-height: 1.5;
        }
        .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            border-bottom: 3px solid #e01c2e;
            padding-bottom: 20px;
            margin-bottom: 24px;
        }
        .logo-area h1 {
            font-size: 22px;
            font-weight: 800;
            color: #e01c2e;
            letter-spacing: -0.5px;
        }
        .logo-area p { color: #6b7280; font-size: 12px; margin-top: 4px; }
        .mission-badge {
            background: linear-gradient(135deg, #e01c2e, #c0152a);
            color: #fff;
            padding: 12px 20px;
            border-radius: 10px;
            text-align: right;
        }
        .mission-badge .label { font-size: 11px; opacity: 0.85; text-transform: uppercase; letter-spacing: 1px; }
        .mission-badge .number { font-size: 18px; font-weight: 800; }
        .section-title {
            font-size: 13px;
            font-weight: 700;
            color: #e01c2e;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            border-left: 3px solid #e01c2e;
            padding-left: 10px;
            margin: 20px 0 12px;
        }
        .info-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 10px;
            margin-bottom: 10px;
        }
        .info-cell {
            background: #f9fafb;
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            padding: 10px 14px;
        }
        .info-cell .label { font-size: 11px; color: #6b7280; margin-bottom: 3px; }
        .info-cell .value { font-size: 14px; font-weight: 600; color: #1f2937; }
        table { width: 100%; border-collapse: collapse; font-size: 13px; }
        th {
            background: #e01c2e;
            color: #fff;
            padding: 10px 12px;
            text-align: left;
            font-weight: 600;
            font-size: 12px;
        }
        .materials-list { padding-left: 20px; }
        .instructions-box {
            background: #fef2f2;
            border-left: 4px solid #e01c2e;
            padding: 14px 18px;
            border-radius: 8px;
            color: #374151;
        }
        .signature-grid {
            display: grid;
            grid-template-columns: 1fr 1fr 1fr;
            gap: 20px;
            margin-top: 40px;
        }
        .signature-box {
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            padding: 16px;
            min-height: 80px;
        }
        .signature-box .sig-label { font-size: 11px; color: #6b7280; margin-bottom: 6px; }
        .signature-box .sig-name { font-size: 13px; font-weight: 600; }
        .footer {
            margin-top: 30px;
            border-top: 1px solid #e5e7eb;
            padding-top: 12px;
            display: flex;
            justify-content: space-between;
            color: #9ca3af;
            font-size: 11px;
        }
        @media print {
            body { padding: 20px; }
            button { display: none !important; }
            @page { margin: 15mm; }
        }
    </style>
</head>
<body>
    <div class="header">
        <div class="logo-area">
            <h1>Croissant-Rouge Tunisien</h1>
            <p>Nexus-AID — Plateforme de Gestion Humanitaire</p>
            <p style="margin-top:6px;font-size:13px;font-weight:600;color:#1f2937">ORDRE DE MISSION D'INTERVENTION</p>
        </div>
        <div class="mission-badge">
            <div class="label">N° Mission</div>
            <div class="number">${mission.missionNumber ?? 'N/A'}</div>
            <div style="font-size:11px;opacity:0.8;margin-top:4px">Émis le ${new Date().toLocaleDateString('fr-TN')}</div>
        </div>
    </div>

    <div class="section-title">Informations de la Mission</div>
    <div class="info-grid">
        <div class="info-cell" style="grid-column: span 2">
            <div class="label">Intitulé de la mission</div>
            <div class="value" style="font-size:16px">${mission.title}</div>
        </div>
        <div class="info-cell">
            <div class="label">Type de mission</div>
            <div class="value">${missionType}</div>
        </div>
        <div class="info-cell">
            <div class="label">Statut</div>
            <div class="value">${mission.status ?? 'PLANNED'}</div>
        </div>
        <div class="info-cell">
            <div class="label">Date & heure de début</div>
            <div class="value">${startDate}</div>
        </div>
        <div class="info-cell">
            <div class="label">Date & heure de fin (prévue)</div>
            <div class="value">${endDate}</div>
        </div>
        <div class="info-cell" style="grid-column: span 2">
            <div class="label">Localisation GPS / Zone d'intervention</div>
            <div class="value">${gps}</div>
        </div>
        <div class="info-cell">
            <div class="label">Chef d'équipe</div>
            <div class="value">${mission.teamChiefName ?? '—'}</div>
        </div>
        <div class="info-cell">
            <div class="label">Nombre de volontaires</div>
            <div class="value">${mission.assignedVolunteers?.length ?? 0} volontaire(s)</div>
        </div>
        ${mission.description ? `
        <div class="info-cell" style="grid-column: span 2">
            <div class="label">Description</div>
            <div class="value" style="font-weight:400;color:#374151">${mission.description}</div>
        </div>` : ''}
    </div>

    ${volunteersHtml ? `
    <div class="section-title">Équipe Assignée (NDRT / RDRT)</div>
    <table>
        <thead>
            <tr>
                <th>Nom complet</th>
                <th>Matricule</th>
                <th>Type équipe</th>
                <th>Comité</th>
                <th>Téléphone</th>
            </tr>
        </thead>
        <tbody>${volunteersHtml}</tbody>
    </table>` : ''}

    ${materialsHtml ? `
    <div class="section-title">Matériel Requis</div>
    <ul class="materials-list">${materialsHtml}</ul>` : ''}

    ${mission.instructions ? `
    <div class="section-title">Instructions Opérationnelles</div>
    <div class="instructions-box">${mission.instructions}</div>` : ''}

    <div class="signature-grid">
        <div class="signature-box">
            <div class="sig-label">Responsable Catastrophes</div>
            <div class="sig-name">Signature & Cachet</div>
            <div style="margin-top:30px;border-top:1px solid #e5e7eb"></div>
        </div>
        <div class="signature-box">
            <div class="sig-label">Chef d'Équipe</div>
            <div class="sig-name">${mission.teamChiefName ?? '——————————'}</div>
            <div style="margin-top:30px;border-top:1px solid #e5e7eb"></div>
        </div>
        <div class="signature-box">
            <div class="sig-label">Volontaire (Accusé de réception)</div>
            <div class="sig-name">Signature</div>
            <div style="margin-top:30px;border-top:1px solid #e5e7eb"></div>
        </div>
    </div>

    <div class="footer">
        <span>Généré par Nexus-AID — Croissant-Rouge Tunisien</span>
        <span>N° ${mission.missionNumber ?? 'N/A'} — ${new Date().toLocaleString('fr-TN')}</span>
    </div>

    <script>
        window.onload = function() {
            window.print();
        };
    </script>
</body>
</html>`;

    const printWindow = window.open('', '_blank', 'width=900,height=700');
    if (printWindow) {
        printWindow.document.write(html);
        printWindow.document.close();
    }
}
