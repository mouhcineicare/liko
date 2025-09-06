import { useState, useRef, useEffect } from "react";
import { 
  Modal, 
  Input, 
  Button, 
  Form, 
  Spin,
  message,
  Tag,
  Upload,
  Avatar,
  Divider
} from "antd";
import { UploadOutlined, UserOutlined, CloseOutlined } from "@ant-design/icons";
import type { FormProps, UploadProps } from "antd";
import TextArea from "antd/es/input/TextArea";

interface EditTherapistDialogProps {
  therapist: {
    _id: string;
    fullName: string;
    email: string;
    telephone: string;
    summary?: string;
    specialties?: string[];
    profile: string;
    image?: string;
  };
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export default function EditTherapistDialog({
  therapist,
  open,
  onOpenChange,
  onSuccess,
}: EditTherapistDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [form] = Form.useForm();
  const [specialties, setSpecialties] = useState<string[]>(therapist.specialties || []);
  const [specialtyInput, setSpecialtyInput] = useState("");
  const [previewImage, setPreviewImage] = useState(therapist.image || "");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    form.setFieldsValue({
      fullName: therapist.fullName,
      email: therapist.email,
      telephone: therapist.telephone,
      summary: therapist.summary || "",
      password: "",
      profile: therapist.profile || "",
      image: therapist.image || ""
    });
    setSpecialties(therapist.specialties || []);
    setPreviewImage(therapist.image || "");
  }, [therapist, form]);

  const handleSpecialtyKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && specialtyInput.trim()) {
      e.preventDefault();
      if (!specialties.includes(specialtyInput.trim())) {
        setSpecialties([...specialties, specialtyInput.trim()]);
      }
      setSpecialtyInput("");
    }
  };

  const removeSpecialty = (specialty: string) => {
    setSpecialties(specialties.filter(s => s !== specialty));
  };

  const handleImageChange: UploadProps['onChange'] = (info) => {
    // Get the selected file
    const file = info.file.originFileObj;
    
    if (!file) return;

    // Validate image type
    if (!file.type.startsWith('image/')) {
      message.error('Please upload an image file (JPEG, PNG, WEBP)');
      return;
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      message.error('Image must be smaller than 5MB');
      return;
    }

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        setPreviewImage(e.target.result as string);
      }
    };
    reader.readAsDataURL(file);
    setImageFile(file);
  };

  const handleRemoveImage = () => {
    setPreviewImage("");
    setImageFile(null);
    form.setFieldValue('image', '');
  };

  const handleSubmit: FormProps['onFinish'] = async (values) => {
    setIsLoading(true);

    try {
      // Convert image to base64 if a new file was selected
      let imageBase64 = "";
      if (imageFile) {
        imageBase64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(imageFile);
        });
      }

      const response = await fetch(`/api/admin/therapists/${therapist._id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...values,
          specialties,
          image: imageBase64 || values.image, // Send base64 if new image, or existing URL if no change
          ...(values.password && { password: values.password }),
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update therapist");
      }

      message.success("Therapist updated successfully");
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error("Error updating therapist:", error);
      message.error("Failed to update therapist");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      title="Edit Patient"
      open={open}
      onCancel={() => onOpenChange(false)}
      footer={null}
      centered
      width="90vw"
      className="max-w-[500px]"
    >
      <Spin spinning={isLoading}>
        <Form
          form={form}
          onFinish={handleSubmit}
          layout="vertical"
        >
          {/* Image Upload Section - Fixed Preview */}
          <Form.Item label="Profile Picture">
            <div className="flex items-center gap-4 mb-2">
              <Avatar
                src={previewImage}
                icon={!previewImage && <UserOutlined />}
                size={64}
                className={`${previewImage ? 'border border-gray-200' : 'bg-gray-100 text-gray-400'}`}
              />
              <Upload
                showUploadList={false}
                beforeUpload={() => false} // Prevent auto upload
                onChange={handleImageChange}
                accept="image/*"
              >
                <Button icon={<UploadOutlined />}>
                  {previewImage ? "Change Image" : "Upload Image"}
                </Button>
              </Upload>
              {previewImage && (
                <Button
                  danger
                  type="text"
                  icon={<CloseOutlined />}
                  onClick={handleRemoveImage}
                />
              )}
            </div>
            <p className="text-xs text-gray-500">
              JPG, PNG, or WEBP. Max 5MB.
            </p>
          </Form.Item>


          <Form.Item
            label="Full Name"
            name="fullName"
            rules={[{ required: true, message: 'Please input the full name!' }]}
          >
            <Input size="large" />
          </Form.Item>

          <Form.Item
            label="Email"
            name="email"
            rules={[
              { required: true, message: 'Please input the email!' },
              { type: 'email', message: 'Please input a valid email!' }
            ]}
          >
            <Input size="large" type="email" />
          </Form.Item>

          <Form.Item
            label="Phone Number"
            name="telephone"
            rules={[{ required: true, message: 'Please input the phone number!' }]}
          >
            <Input size="large" />
          </Form.Item>

          <Form.Item
            label="Profile Link"
            name="profile"
          >
            <Input size="large" />
          </Form.Item>

          <Form.Item
            label="Professional Summary"
            name="summary"
          >
            <TextArea 
              rows={4} 
              placeholder="Enter professional background and experience..." 
            />
          </Form.Item>

          <Form.Item label="Specialties">
            <div className="flex flex-wrap gap-2 p-2 border rounded-md bg-white">
              {specialties.map((specialty, index) => (
                <Tag
                  key={index}
                  closable
                  onClose={() => removeSpecialty(specialty)}
                  className="bg-blue-100 text-blue-800"
                >
                  {specialty}
                </Tag>
              ))}
              <Input
                type="text"
                value={specialtyInput}
                onChange={(e) => setSpecialtyInput(e.target.value)}
                onKeyDown={handleSpecialtyKeyDown}
                className="flex-1 min-w-[120px]"
                placeholder={specialties.length === 0 ? "Type and press Enter to add specialties" : ""}
                bordered={false}
              />
            </div>
            <p className="text-sm text-gray-500 mt-1">
              Press Enter to add each specialty
            </p>
          </Form.Item>

          <Form.Item
            label={
              <>
                New Password <span className="text-gray-400">(Optional)</span>
              </>
            }
            name="password"
            rules={[
              { min: 6, message: 'Password must be at least 6 characters!' }
            ]}
          >
            <Input.Password 
              size="large" 
              placeholder="Leave blank to keep current password" 
            />
          </Form.Item>

          <Divider />

          <div className="flex justify-end gap-4">
            <Button 
              onClick={() => onOpenChange(false)}
              size="large"
              className="w-24"
            >
              Cancel
            </Button>
            <Button 
              type="primary" 
              htmlType="submit"
              size="large"
              className="w-24"
              loading={isLoading}
            >
              Save
            </Button>
          </div>
        </Form>
      </Spin>
    </Modal>
  );
}