'use client';
import { useEffect, useState } from 'react';
import { Alert, Modal, Rate, Input, Spin, message } from 'antd';
import axios from 'axios';

interface FeedbackAlertProps {
  userId: string;
  fullName: string;
  setIsLeavingFeedback?: (isLeaving: boolean) => void;
}

const FeedbackAlert = ({ userId, fullName, setIsLeavingFeedback }: FeedbackAlertProps) => {
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');

  useEffect(() => {
    const checkFeedbackEligibility = async () => {
      try {
        const res = await axios.get(`/api/patient/feedback?id=${userId}`);
        if (res.data?.showFeedbackPrompt) {
          setVisible(true);
          setIsLeavingFeedback(true);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    checkFeedbackEligibility();
  }, [userId]);

  const handleSubmit = async () => {
    try {
      await axios.post('/api/patient/feedback', { userId, fullName, rating, comment });
      message.success('Thanks for your feedback!');
      setVisible(false);
      setIsLeavingFeedback?.(false);
    } catch (err) {
      message.error('Submission failed');
    }
  };

  if (loading) return <div className='w-full flex justify-center items-center'>
    <Spin size="default" />
  </div>;

  return (
    <>
      {visible && (
        <Alert
          className="mb-4"
          message="How was your last session?"
          description={
            <div className="mt-2">
              <p className="mb-2">Rate your experience:</p>
              <Rate onChange={setRating} value={rating} className="mb-4" />
              <Input.TextArea
                rows={4}
                placeholder="Share your thoughts..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
              />
              <div className="flex justify-end gap-2 mt-4">
                <button 
                  onClick={() => {
                    setIsLeavingFeedback?.(false);
                    setVisible(false);
                  }}
                  className="px-4 py-1 text-gray-600 border border-gray-300 rounded hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleSubmit}
                  className="px-4 py-1 text-white bg-blue-500 rounded hover:bg-blue-600"
                  disabled={rating === 0}
                >
                  Submit Feedback
                </button>
              </div>
            </div>
          }
          type="info"
          showIcon
          closable
          onClose={() => {
            setIsLeavingFeedback?.(false);
            setVisible(false);
          }}
        />
      )}
    </>
  );
};

export default FeedbackAlert;