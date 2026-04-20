import { useState } from 'react';
import { Modal, Form, Input, Select, notification } from 'antd';
import { crisisApi } from '@/services/crisisApi';

interface ParticipantInviteModalProps {
    visible: boolean;
    roomId?: string;
    onCancel: () => void;
    onSuccess: () => void;
}

export default function ParticipantInviteModal({ visible, roomId, onCancel, onSuccess }: ParticipantInviteModalProps) {
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(false);

    const handleInvite = async () => {
        if (!roomId) {
            notification.error({ message: 'Invite Failed', description: 'Missing crisis room identifier.' });
            return;
        }
        try {
            const values = await form.validateFields();
            setLoading(true);

            const payload = {
                user_id: 'usr_' + Math.random().toString(36).substring(2, 9),
                name: values.name,
                role: values.role,
                agency: values.agency
            };

            await crisisApi.inviteParticipant(roomId, payload);
            setLoading(false);
            notification.success({ message: 'Participant Cleared', description: `${values.name} has entered the session.` });
            form.resetFields();
            onSuccess();
        } catch (e: any) {
            setLoading(false);
            if (e.errorFields) return;
            notification.error({ message: 'Invite Failed', description: e.message });
        }
    };

    return (
        <Modal
            title="📩 Sync MS1 Participant"
            open={visible}
            onCancel={onCancel}
            onOk={handleInvite}
            confirmLoading={loading}
            okText="Send Secure Invite"
            centered
        >
            <Form form={form} layout="vertical" initialValues={{ role: 'commander', agency: 'Red Crescent (MS1 DB)' }}>
                <Form.Item name="name" label="Full Name (Simulated Database Search)" rules={[{ required: true }]}>
                    <Input placeholder="e.g. Ahmed Ben Salah" />
                </Form.Item>
                <Form.Item name="role" label="Clearance Role">
                    <Select>
                        <Select.Option value="commander">President / Commander</Select.Option>
                        <Select.Option value="coordinator">Logistics Coordinator</Select.Option>
                        <Select.Option value="field_medic">Field Operative / Medic</Select.Option>
                    </Select>
                </Form.Item>
                <Form.Item name="agency" label="Agency Affiliation">
                    <Input />
                </Form.Item>
            </Form>
        </Modal>
    );
}
