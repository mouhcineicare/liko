"use client";

import { useState, useEffect } from "react";
import { 
  Tabs, 
  Card, 
  Button, 
  Input, 
  Form, 
  List, 
  Divider, 
  Spin, 
  message,
  Typography,
  Space
} from 'antd';
import { 
  PlusOutlined,
  CloseOutlined,
  LoadingOutlined,
  InfoCircleOutlined,
  QuestionCircleOutlined,
  FileTextOutlined
} from '@ant-design/icons';
import dynamic from 'next/dynamic';

const { TextArea } = Input;
const { Title } = Typography;
const { TabPane } = Tabs;

// Dynamic import of the rich text editor
const Editor = dynamic(() => import("@/components/shared/RichTextEditor"), {
  ssr: false,
  loading: () => <p>Loading editor...</p>
});

interface FAQ {
  question: string;
  answer: string;
}

interface Settings {
  _id?: string;
  type: string;
  title: string;
  content: string;
}

export default function ManageAppPage() {
  const [activeTab, setActiveTab] = useState("about");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [settings, setSettings] = useState<Settings[]>([]);
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [newFAQ, setNewFAQ] = useState({ question: "", answer: "" });
  const [aboutTitle, setAboutTitle] = useState("");
  const [aboutContent, setAboutContent] = useState("");
  const [refundTitle, setRefundTitle] = useState("");
  const [refundContent, setRefundContent] = useState("");

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await fetch("/api/admin/settings");
      if (response.ok) {
        const data = await response.json();
        setSettings(data);
        
        // Set individual state values
        const aboutSetting = data.find((s: Settings) => s.type === "about");
        if (aboutSetting) {
          setAboutTitle(aboutSetting.title);
          setAboutContent(aboutSetting.content);
        }

        const refundSetting = data.find((s: Settings) => s.type === "refund");
        if (refundSetting) {
          setRefundTitle(refundSetting.title);
          setRefundContent(refundSetting.content);
        }
        
        // Parse FAQs from settings if they exist
        const faqSetting = data.find((s: Settings) => s.type === "faq");
        if (faqSetting) {
          setFaqs(JSON.parse(faqSetting.content));
        }
      }
    } catch (error) {
      console.error("Error fetching settings:", error);
      message.error("Failed to load settings");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveContent = async (type: string, title: string, content: string) => {
    setIsSaving(true);
    try {
      const response = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, title, content }),
      });

      if (!response.ok) {
        throw new Error("Failed to save content");
      }

      message.success("Content saved successfully");
      fetchSettings();
    } catch (error) {
      console.error("Error saving content:", error);
      message.error("Failed to save content");
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddFAQ = () => {
    if (!newFAQ.question || !newFAQ.answer) {
      message.error("Please fill in both question and answer");
      return;
    }

    setFaqs([...faqs, newFAQ]);
    setNewFAQ({ question: "", answer: "" });
    handleSaveFAQs([...faqs, newFAQ]);
  };

  const handleRemoveFAQ = (index: number) => {
    const updatedFAQs = faqs.filter((_, i) => i !== index);
    setFaqs(updatedFAQs);
    handleSaveFAQs(updatedFAQs);
  };

  const handleSaveFAQs = async (faqsToSave: FAQ[]) => {
    await handleSaveContent("faq", "Frequently Asked Questions", JSON.stringify(faqsToSave));
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Spin indicator={<LoadingOutlined style={{ fontSize: 24 }} spin />} />
      </div>
    );
  }

  return (
    <div className="p-6">
      <Title level={2}>Manage App Content</Title>

      <Card>
        <Tabs 
          activeKey={activeTab} 
          onChange={setActiveTab}
          tabBarStyle={{ marginBottom: 0 }}
        >
          <TabPane 
            tab={
              <span>
                <InfoCircleOutlined className="mr-2" />
                About Us
              </span>
            } 
            key="about"
          >
            <div className="mt-6">
              <Form layout="vertical">
                <Form.Item label="Page Title">
                  <Input
                    value={aboutTitle}
                    onChange={(e) => setAboutTitle(e.target.value)}
                    placeholder="About Us"
                  />
                </Form.Item>
                <Form.Item label="Content">
                  <Editor
                    value={aboutContent}
                    onChange={setAboutContent}
                  />
                </Form.Item>
                <Form.Item>
                  <Button
                    type="primary"
                    onClick={() => handleSaveContent("about", aboutTitle, aboutContent)}
                    loading={isSaving}
                  >
                    Save Changes
                  </Button>
                </Form.Item>
              </Form>
            </div>
          </TabPane>

          <TabPane 
            tab={
              <span>
                <QuestionCircleOutlined className="mr-2" />
                FAQ
              </span>
            } 
            key="faq"
          >
            <div className="mt-6">
              <List
                dataSource={faqs}
                renderItem={(faq, index) => (
                  <List.Item
                    actions={[
                      <Button 
                        key={index}
                        icon={<CloseOutlined />} 
                        danger 
                        type="text" 
                        onClick={() => handleRemoveFAQ(index)}
                      />
                    ]}
                  >
                    <List.Item.Meta
                      title={faq.question}
                      description={faq.answer}
                    />
                  </List.Item>
                )}
                locale={{ emptyText: "No FAQs added yet" }}
              />

              <Divider orientation="left">Add New FAQ</Divider>

              <Form layout="vertical">
                <Form.Item label="Question">
                  <Input
                    value={newFAQ.question}
                    onChange={(e) => setNewFAQ({ ...newFAQ, question: e.target.value })}
                    placeholder="Enter question"
                  />
                </Form.Item>
                <Form.Item label="Answer">
                  <TextArea
                    value={newFAQ.answer}
                    onChange={(e) => setNewFAQ({ ...newFAQ, answer: e.target.value })}
                    placeholder="Enter answer"
                    rows={4}
                  />
                </Form.Item>
                <Form.Item>
                  <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={handleAddFAQ}
                  >
                    Add FAQ
                  </Button>
                </Form.Item>
              </Form>
            </div>
          </TabPane>

          <TabPane 
            tab={
              <span>
                <FileTextOutlined className="mr-2" />
                Refund Policy
              </span>
            } 
            key="refund"
          >
            <div className="mt-6">
              <Form layout="vertical">
                <Form.Item label="Page Title">
                  <Input
                    value={refundTitle}
                    onChange={(e) => setRefundTitle(e.target.value)}
                    placeholder="Refund Policy"
                  />
                </Form.Item>
                <Form.Item label="Content">
                  <Editor
                    value={refundContent}
                    onChange={setRefundContent}
                  />
                </Form.Item>
                <Form.Item>
                  <Button
                    type="primary"
                    onClick={() => handleSaveContent("refund", refundTitle, refundContent)}
                    loading={isSaving}
                  >
                    Save Changes
                  </Button>
                </Form.Item>
              </Form>
            </div>
          </TabPane>
        </Tabs>
      </Card>
    </div>
  );
}