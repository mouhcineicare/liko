import { useState } from "react";
import { 
  Modal, 
  Input, 
  Button, 
  Form, 
  Spin,
  message 
} from "antd";
import type { FormProps } from "antd";

interface EditPatientDialogProps {
  patient: {
    _id: string;
    fullName: string;
    email: string;
    telephone: string;
  };
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export default function EditPatientDialog({
  patient,
  open,
  onOpenChange,
  onSuccess,
}: EditPatientDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [form] = Form.useForm();
  
  const initialValues = {
    fullName: patient.fullName,
    email: patient.email,
    telephone: patient.telephone,
    password: "", // Optional password change
  };

  const handleSubmit: FormProps["onFinish"] = async (values) => {
    setIsLoading(true);

    try {
      const response = await fetch(`/api/admin/patients/${patient._id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...values,
          // Only include password if it was changed
          ...(values.password && { password: values.password }),
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update patient");
      }

      message.success("Patient updated successfully");
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error("Error updating patient:", error);
      message.error("Failed to update patient");
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
      className="max-w-[90vw] md:max-w-[500px]"
    >
      <Spin spinning={isLoading}>
        <Form
          form={form}
          initialValues={initialValues}
          onFinish={handleSubmit}
          layout="vertical"
          className="mt-6"
        >
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

          <div className="flex justify-end space-x-4 pt-2">
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