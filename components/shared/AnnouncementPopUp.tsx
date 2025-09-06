'use client';

import { useEffect, useState } from "react";
import { Modal, Button, Typography } from "antd";

const { Title, Paragraph, Link } = Typography;

export default function AnnouncementPopup() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const agreed = localStorage.getItem("icare_agreement_2025_announcement");
    if (!agreed) setVisible(true);
  }, []);

  const handleAgree = () => {
    localStorage.setItem("icare_agreement_2025_announcement", "agreed");
    setVisible(false);
  };

  return (
    <Modal
      title={<Title level={4}>Important Update 💙</Title>}
      open={visible}
      // onCancel={handleAgree}
      footer={
        <Button type="primary" onClick={handleAgree} size="large">
          I Agree
        </Button>
      }
      centered
      width={600}
    >
      <Typography>
        <Paragraph>
          Hello, we are proud to have you onboard with us during our journey of
          providing affordable mental health access.
        </Paragraph>
        <Paragraph>
          At IcareWellbeing, our community of therapists have chosen to work
          with us because they genuinely care about your long-term growth.
        </Paragraph>
        <Paragraph>
          <strong>Today we have increased our prices by ~10%:</strong>
        </Paragraph>
        <ul>
          <li>Subscription sessions now range from <strong>90 AED to 100 AED</strong>.</li>
          <li>Single sessions now cost <strong>110 AED</strong>.</li>
        </ul>
        <Paragraph>
          This change helps us support our therapists with more sustainable pay,
          while continuing our mission to solve the world’s mental health crisis.
        </Paragraph>
        <Paragraph>
          <strong>Thank you for trusting us 💙</strong>
        </Paragraph>
        <Paragraph>
          🏷️💙 <Link href="https://buy.stripe.com/7sYcN58IJ1NT5zDfZQ2401c" target="_blank">
            Buy Monthly 8 Sessions Plan for 690 AED
          </Link>
        </Paragraph>
        <Paragraph>
          🏷️💙 <Link href="https://buy.stripe.com/14A00j5wx505aTX5lc24019" target="_blank">
            Buy Monthly 4 Sessions Plan for 350 AED
          </Link>
        </Paragraph>
        <Paragraph>
          <em>Effective until Friday, June 20, 2025.</em>
        </Paragraph>
      </Typography>
    </Modal>
  );
}