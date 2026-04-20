// ============================================================
// NEXUS-AID — 404 Not Found Page
// ============================================================

import { Button, Result } from 'antd';
import { useNavigate } from 'react-router-dom';

const NotFoundPage: React.FC = () => {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen flex items-center justify-center">
            <Result
                status="404"
                title="404"
                subTitle="Désolé, cette page n'existe pas."
                extra={
                    <Button type="primary" onClick={() => navigate('/dashboard')}>
                        Retour au tableau de bord
                    </Button>
                }
            />
        </div>
    );
};

export default NotFoundPage;
