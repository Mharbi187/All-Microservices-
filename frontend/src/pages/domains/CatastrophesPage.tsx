import React, { useState } from 'react';
import { Spin } from 'antd';
import { useTranslation } from 'react-i18next';

/**
 * CatastrophesPage (Monitor Weather Feature)
 * Renders an iframe embedding the MS4 Disaster Detection Frontend.
 * Authorized for PRESIDENT, VICE_PRESIDENT, and RESP_CATASTROPHES.
 */
const CatastrophesPage: React.FC = () => {
    const { t } = useTranslation();
    const [loading, setLoading] = useState(true);

    return (
        <div style={{ position: 'relative', width: '100%', height: 'calc(100vh - 120px)', borderRadius: '12px', overflow: 'hidden' }}>
            {loading && (
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--ant-color-bg-container)' }}>
                    <Spin size="large" tip="Chargement du moniteur météo..." />
                </div>
            )}
            <iframe
                src="/monitor/"
                style={{ width: '100%', height: '100%', border: 'none', display: loading ? 'none' : 'block' }}
                title="Nexus-AID Disaster Monitor"
                onLoad={() => setLoading(false)}
            />
        </div>
    );
};

export default CatastrophesPage;
