import { useState } from 'react';
import { Modal, Form, Input, Select, notification } from 'antd';
import { crisisApi } from '@/services/crisisApi';

export default function RoomCreationModal({ visible, disasterId, onCancel, onSuccess }: any) {
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
        } catch (e: any) {
            setLoading(false);
            if (e.errorFields) return;
            notification.error({ message: 'Creation Failed', description: e.message });
        }
    };

    return (
        <Modal
            title="⚠️ Activate Crisis Command Center"
            open={visible}
            onCancel={onCancel}
            onOk={handleCreate}
            confirmLoading={loading}
            okText="Activate Room"
            okButtonProps={{ danger: true }}
            centered
        >
            <Form form={form} layout="vertical" initialValues={{ severity: 'critical', lead_agency: 'Tunisian Red Crescent' }}>
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
