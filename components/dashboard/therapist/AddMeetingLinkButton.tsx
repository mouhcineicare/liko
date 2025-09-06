'use client'
import { Button, Modal, Input, message } from 'antd';
import { VideoCameraOutlined } from '@ant-design/icons';
import { useState } from 'react';

const AddMeetingLinkButton = ({ appointmentId }: { appointmentId: string }) => {
  const [visible, setVisible] = useState(false);
  const [meetingLink, setMeetingLink] = useState('');
  const [loading, setLoading] = useState(false);
  const [messageApi, contextHolder] = message.useMessage();

  const handleAddMeetingLink = async () => {
    if (!meetingLink) {
      messageApi.warning('Please enter a valid meeting link');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/therapist/appointments/${appointmentId}/meeting`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ meetingLink }),
      });

      if (!response.ok) {
        throw new Error('Failed to add meeting link');
      }

      const data = await response.json();
      messageApi.success('Meeting link added successfully');
      setVisible(false);
      // You might want to refresh the appointments data here
    } catch (error) {
      console.error('Error adding meeting link:', error);
      messageApi.error('Failed to add meeting link');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {contextHolder}
      <Button
        type="primary"
        icon={<VideoCameraOutlined />}
        onClick={() => setVisible(true)}
        className="flex items-center"
      >
        <span className="hidden sm:inline">Add Meeting Link</span>
      </Button>

      <Modal
        title="Add Meeting Link"
        open={visible}
        onOk={handleAddMeetingLink}
        onCancel={() => setVisible(false)}
        confirmLoading={loading}
        okText="Save"
        cancelText="Cancel"
      >
        <div className="space-y-4">
          <p>Please enter the video meeting link for this appointment:</p>
          <Input
            placeholder="https://meet.google.com/abc-defg-hij"
            value={meetingLink}
            onChange={(e) => setMeetingLink(e.target.value)}
          />
          <p className="text-sm text-gray-500">
            Tip: You can use Google Meet, Zoom, or any other video conferencing service
          </p>
        </div>
      </Modal>
    </>
  );
};


export default AddMeetingLinkButton;