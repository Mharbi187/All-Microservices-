import { useState, useRef, useEffect } from 'react';
import { Modal, Form, Select, notification, Spin, Input } from 'antd';
import apiClient from '@/services/api';
import { crisisApi } from '@/services/crisisApi';

const mapSpecialtyToRole = (role: string, agency: string) => {
    const r = (role || '').toLowerCase();
    const a = (agency || '').toLowerCase();
    
    if (r.includes('command') || r.includes('chef') || r.includes('président')) {
        return 'commander';
    }
    if (r.includes('coord')) {
        return 'coordinator';
    }
    if (r.includes('logist')) {
        return 'coordinator';
    }
    if (r.includes('secour') || r.includes('terrain') || r.includes('field_medic')) {
        return 'field_medic';
    }
    if (r.includes('méd') || r.includes('infirm') || r.includes('doct') || r.includes('sant')) {
        return 'Medic';
    }
    if (r.includes('bénév') || r.includes('volont')) {
        return 'Volunteer';
    }
    
    return 'Volunteer';
};

export default function ParticipantInviteModal({ visible, roomId, onCancel, onSuccess }: any) {
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(false);
    const [searchLoading, setSearchLoading] = useState(false);
    const [options, setOptions] = useState<any[]>([]);
    const [selectedUser, setSelectedUser] = useState<any>(null);
    const timerRef = useRef<any>(null);

    useEffect(() => {
        if (!visible) {
            form.resetFields();
            setSelectedUser(null);
            setOptions([]);
        }
    }, [visible, form]);

    const handleSearch = (value: string) => {
        if (timerRef.current) clearTimeout(timerRef.current);
        if (!value) {
            setOptions([]);
            return;
        }
        setSearchLoading(true);
        timerRef.current = setTimeout(async () => {
            try {
                const res = await apiClient.get(`/volunteers/search?q=${encodeURIComponent(value)}${roomId ? `&room_id=${roomId}` : ''}`);
                const data = res.data;
                setOptions(data.map((item: any) => ({
                    value: item.name,
                    label: (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 0' }}>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <span style={{ fontWeight: 600, color: '#1e293b' }}>{item.name}</span>
                                <span style={{ fontSize: '11px', color: '#64748b' }}>{item.email || 'Pas d\'email'}</span>
                            </div>
                            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                <span style={{
                                    fontSize: '10px',
                                    background: '#eff6ff',
                                    color: '#2563eb',
                                    padding: '2px 8px',
                                    borderRadius: '12px',
                                    fontWeight: '500'
                                }}>
                                    {item.role}
                                </span>
                                <span style={{
                                    fontSize: '10px',
                                    background: '#f1f5f9',
                                    color: '#475569',
                                    padding: '2px 8px',
                                    borderRadius: '12px',
                                    fontWeight: '500'
                                }}>
                                    {item.agency}
                                </span>
                            </div>
                        </div>
                    ),
                    record: item
                })));
            } catch (error) {
                console.error('Error searching volunteers:', error);
            } finally {
                setSearchLoading(false);
            }
        }, 500);
    };

    const onSelect = (value: string, option: any) => {
        const user = option.record;
        const mappedRole = mapSpecialtyToRole(user.role, user.agency);
        form.setFieldsValue({
            role: mappedRole,
            agency: user.agency
        });
        setSelectedUser(user);
    };

    const handleInvite = async () => {
        if (!roomId) {
            notification.error({ message: 'Invite Failed', description: 'Missing crisis room identifier.' });
            return;
        }
        try {
            const values = await form.validateFields();
            setLoading(true);

            const payload = {
                user_id: selectedUser ? selectedUser.id : 'usr_' + Math.random().toString(36).substring(2, 9),
                name: values.name,
                role: values.role,
                agency: Array.isArray(values.agency) ? (values.agency[0] || "") : (values.agency || ""),
                email: selectedUser ? selectedUser.email : "",
                phone: selectedUser ? selectedUser.phone : ""
            };

            await crisisApi.inviteParticipant(roomId, payload);
            setLoading(false);
            notification.success({ message: 'Participant Cleared', description: `${values.name} has entered the session.` });
            form.resetFields();
            setSelectedUser(null);
            onSuccess();
        } catch (e: any) {
            setLoading(false);
            if (e.errorFields) return;
            notification.error({ message: 'Invite Failed', description: e.message });
        }
    };

    return (
        <Modal
            title="📩 Ajouter un Membre MS1"
            open={visible}
            onCancel={onCancel}
            onOk={handleInvite}
            confirmLoading={loading}
            okText="Envoyer l'invitation"
            centered
        >
            <Form form={form} layout="vertical" initialValues={{ role: 'commander', agency: 'Croissant Rouge (MS1 DB)' }}>
                <Form.Item name="name" label="Nom du Volontaire (Recherche DB)" rules={[{ required: true }]}>
                    <Select
                        showSearch
                        labelInValue={false}
                        placeholder="Rechercher par nom (ex: Ahmed)"
                        filterOption={false}
                        onSearch={handleSearch}
                        onSelect={onSelect}
                        notFoundContent={searchLoading ? <Spin size="small" /> : null}
                        options={options}
                    />
                </Form.Item>
                <Form.Item name="role" label="Rôle / Fonction">
                    <Select>
                        <Select.Option value="commander">Président / Commandant</Select.Option>
                        <Select.Option value="coordinator">Coordinateur Logistique</Select.Option>
                        <Select.Option value="field_medic">Agent de Terrain / Secouriste</Select.Option>
                        <Select.Option value="Volunteer">Bénévole</Select.Option>
                        <Select.Option value="Medic">Médecin</Select.Option>
                        <Select.Option value="Engineer">Ingénieur</Select.Option>
                    </Select>
                </Form.Item>
                <Form.Item name="agency" label="Affiliation / Agence">
                    <Input />
                </Form.Item>
            </Form>
        </Modal>
    );
}
