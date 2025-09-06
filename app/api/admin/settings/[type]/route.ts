import { NextResponse } from "next/server";
import connectDB from "@/lib/db/connect";
import Settings from "@/lib/db/models/Settings";

export async function GET(
  req: Request,
  { params }: { params: { type: string } }
) {
  try {
    await connectDB();
    const setting = await Settings.findOne({ type: params.type });
    
    if (!setting) {
      // Return default content if no settings found
      return NextResponse.json({
        title: getDefaultTitle(params.type),
        content: getDefaultContent(params.type),
      });
    }

    return NextResponse.json(setting);
  } catch (error) {
    console.error("Error fetching settings:", error);
    return NextResponse.json(
      { error: "Error fetching settings" },
      { status: 500 }
    );
  }
}

function getDefaultTitle(type: string): string {
  switch (type) {
    case 'about':
      return 'About Us';
    case 'faq':
      return 'Frequently Asked Questions';
    case 'refund':
      return 'Refund Policy';
    default:
      return '';
  }
}

function getDefaultContent(type: string): string {
  switch (type) {
    case 'about':
      return `
        <h2>Welcome to IcareWellBeing</h2>
        <p>We are dedicated to making mental health care accessible to everyone through our online therapy platform.</p>
        <p>Our mission is to connect you with licensed therapists who can provide the support you need from the comfort of your home.</p>
      `;
    case 'faq':
      return JSON.stringify([
        {
          question: "How does online therapy work?",
          answer: "Online therapy allows you to connect with licensed therapists through secure video sessions. You can book appointments at your convenience and attend sessions from anywhere."
        },
        {
          question: "Is online therapy effective?",
          answer: "Yes, research shows that online therapy can be just as effective as in-person therapy for many conditions. Our platform connects you with licensed professionals who are experienced in providing online care."
        }
      ]);
    case 'refund':
      return `
        <h2>Our Refund Policy</h2>
        <p>We want you to be completely satisfied with our services. If you're unable to attend a session, please notify us at least 24 hours in advance for a full refund.</p>
        <h3>Refund Eligibility</h3>
        <ul>
          <li>Cancellations made 24+ hours before the session: Full refund</li>
          <li>Technical issues on our end: Full refund</li>
          <li>No-shows or late cancellations: No refund</li>
        </ul>
      `;
    default:
      return '';
  }
}