// ============================================================
// PasswordStrength — 4-segment strength indicator bar
// ============================================================

interface PasswordStrengthProps {
    password: string;
}

const PasswordStrength: React.FC<PasswordStrengthProps> = ({ password }) => {
    let score = 0;
    if (password.length >= 8) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;

    const getColor = (index: number) => {
        if (index >= score) return 'rgba(190,189,185,0.15)';
        if (score <= 1) return 'var(--red)';
        if (score <= 3) return 'var(--pink)';
        return '#22c55e';
    };

    const getLabel = () => {
        if (!password) return '';
        if (score <= 1) return 'Faible';
        if (score <= 2) return 'Moyen';
        if (score <= 3) return 'Bon';
        return 'Fort';
    };

    return (
        <div>
            <div className="flex gap-1" style={{ marginTop: 8 }}>
                {[0, 1, 2, 3].map((i) => (
                    <div
                        key={i}
                        style={{
                            flex: 1,
                            height: 3,
                            borderRadius: 2,
                            background: getColor(i),
                            transition: 'background 0.4s',
                        }}
                    />
                ))}
            </div>
            {password && (
                <div
                    style={{
                        fontSize: 11,
                        color: getColor(0),
                        marginTop: 4,
                        textAlign: 'right',
                        transition: 'color 0.4s',
                    }}
                >
                    {getLabel()}
                </div>
            )}
        </div>
    );
};

export default PasswordStrength;
