import { useState } from 'react';
import { Modal, Form, Input, Select, notification } from 'antd';
import axios from 'axios';
import { AlertOutlined } from '@ant-design/icons';
import { crisisApi } from '@/services/crisisApi';

interface RoomCreationModalProps {
    visible: boolean;
    disasterId: string;
    initialName?: string;
    onCancel: () => void;
    onSuccess: (roomId: string) => void;
}

export default function RoomCreationModal({ visible, disasterId, initialName, onCancel, onSuccess }: RoomCreationModalProps) {
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(false);

    const handleCreate = async () => {
        try {
            const values = await form.validateFields();
            setLoading(true);
            const payload = {
                disaster_id: disasterId,
                name: values.name,
                severity: values.severity,
                lead_agency: values.lead_agency
            };
            const room = await crisisApi.createCrisisRoom(payload);
            setLoading(false);
            notification.success({ message: 'Command Center Generated', description: `Room ${room.id} activated.` });
            onSuccess(room.id);
        } catch (e: unknown) {
            setLoading(false);
            if (typeof e === 'object' && e !== null && 'errorFields' in e) return;

            if (axios.isAxiosError(e)) {
                const status = e.response?.status;
                const detail =
                    typeof e.response?.data === 'object' && e.response?.data && 'detail' in e.response.data
                        ? String((e.response.data as { detail?: unknown }).detail ?? '')
                        : '';

                if (status === 401) {
                    notification.error({
                        message: 'Activation Rejected',
                        description: detail || 'Your session is still active, but this endpoint rejected authorization. Please verify gateway JWT settings.',
                    });
                    return;
                }

                notification.error({
                    message: 'Creation Failed',
                    description: detail || e.message,
                });
                return;
            }

            const fallback = e instanceof Error ? e.message : 'Unknown error';
            notification.error({ message: 'Creation Failed', description: fallback });
        }
    };

    return (
        <Modal
            title={<span><AlertOutlined style={{ color: '#F59E0B', marginRight: 8 }} />Activate Crisis Command Center</span>}
            open={visible}
            onCancel={onCancel}
            onOk={handleCreate}
            confirmLoading={loading}
            okText="Activate Room"
            okButtonProps={{ danger: true }}
            centered
        >
            <Form
                form={form}
                layout="vertical"
                initialValues={{ severity: 'critical', lead_agency: 'Tunisian Red Crescent', name: initialName }}
                key={`${disasterId}-${initialName ?? ''}`}
            >
                <Form.Item name="name" label="Operation Name" rules={[{ required: true }]}>
                    <Input placeholder="e.g. Operation Firewatch Sfax" />
                </Form.Item>
                <Form.Item name="severity" label="Initial Severity Level">
                    <Select>
                        <Select.Option value="low">Low Level Alert</Select.Option>
                        <Select.Option value="medium">Medium Urgency</Select.Option>
                        <Select.Option value="critical">Critical Disaster Level</Select.Option>
                        <Select.Option value="extreme">Extreme Override Protocol</Select.Option>
                    </Select>
                </Form.Item>
                <Form.Item name="lead_agency" label="Lead Coordinating Agency">
                    <Input />
                </Form.Item>
            </Form>
        </Modal>
    );
}
