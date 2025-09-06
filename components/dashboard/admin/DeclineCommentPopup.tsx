"use client"

import { Modal } from "antd"

interface DeclineCommentPopupProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  comment: string;
  therapistName: string;
}

export default function DeclineCommentPopup({
  open,
  onOpenChange,
  comment,
  therapistName,
}: DeclineCommentPopupProps) {
  return (
    <Modal
      title="Decline Reason"
      open={open}
      onCancel={() => onOpenChange(false)}
      footer={null}
      width={500}
    >
      <div style={{ marginBottom: 16 }}>
        <p>Dr. {therapistName} provided the following reason for declining this appointment:</p>
      </div>
      <div style={{ 
        padding: 16,
        backgroundColor: '#f5f5f5',
        borderRadius: 8,
        border: '1px solid #f0f0f0'
      }}>
        <p style={{ 
          color: '#333',
          whiteSpace: 'pre-wrap',
          margin: 0
        }}>
          {comment}
        </p>
      </div>
    </Modal>
  )
}