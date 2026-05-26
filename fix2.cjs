const fs = require('fs');

function replaceFile(path, replacements) {
    if (fs.existsSync(path)) {
        let content = fs.readFileSync(path, 'utf8');
        replacements.forEach(([regex, replacement]) => {
            content = content.replace(regex, replacement);
        });
        fs.writeFileSync(path, content);
    }
}

replaceFile('src/pages/auth/LoginPage.tsx', [
    [/<AccountStatusModal status=\{statusModal\.type as any\} onClose=/g, '<AccountStatusModal visible={statusModal.visible} status={statusModal.type as any} onClose=']
]);

replaceFile('src/pages/donor/DonorDashboardPage.tsx', [
    [/import \{ donationService, DonationNeed, DonorStats \} from/g, 'import { donationService } from \'@/services/donationService\';\nimport type { DonationNeed, DonorStats } from'],
    [/import \{ DonationNeed/g, 'import type { DonationNeed'],
    [/import \{ UIRecipt/g, 'import type { UIRecipt'],
    [/type=\"primary\" type=\"default\"/g, 'type=\"default\"']
]);

replaceFile('src/pages/donor/DonorMapPage.tsx', [
    [/import \{ DonationNeed/g, 'import type { DonationNeed']
]);

replaceFile('src/pages/donor/DonorNotificationsPage.tsx', [
    [/import \{ DonorNotification/g, 'import type { DonorNotification']
]);

replaceFile('src/pages/donor/DonorReceiptsPage.tsx', [
    [/import \{ DonationReceipt/g, 'import type { DonationReceipt'],
    [/import \{ useState/g, 'import React, { useState']
]);

replaceFile('src/pages/donor/MakeDonationPage.tsx', [
    [/import \{ DonationNeed/g, 'import type { DonationNeed'],
    [/import \{ DonationCreateDto/g, 'import type { DonationCreateDto'],
    [/import \{ useState/g, 'import React, { useState']
]);
