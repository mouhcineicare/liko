"use client"

import { useState } from 'react'
import { Button, Modal, Form, Input, message } from 'antd'
import { LockOutlined } from '@ant-design/icons'

export default function ImpersonationPasswordDialog() {
  const [open, setOpen] = useState(false)
  const [form] = Form.useForm()
  const [isSet, setIsSet] = useState(false)
  const [loading, setLoading] = useState(false)

  const checkPasswordStatus = async () => {
    try {
      const res = await fetch('/api/admin/impersonation')
      const data = await res.json()
      setIsSet(data.isSet)
    } catch (error) {
      console.error('Error checking password status:', error)
    }
  }

  const handleSubmit = async (values: any) => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/impersonation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(values)
      })
      
      if (!res.ok) {
        throw new Error(await res.text())
      }
      
      message.success(isSet ? 'Password updated successfully' : 'Password set successfully')
      setOpen(false)
      form.resetFields()
      checkPasswordStatus()
    } catch (error) {
      console.error('Error setting password:', error)
      message.error(error instanceof Error ? error.message : 'Failed to set password')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Button 
        type="primary" 
        icon={<LockOutlined />}
        onClick={() => {
          checkPasswordStatus()
          setOpen(true)
        }}
      >
        {isSet ? 'Change Impersonation Password' : 'Set Impersonation Password'}
      </Button>
      
      <Modal
        title={isSet ? 'Change Impersonation Password' : 'Set Impersonation Password'}
        open={open}
        onCancel={() => setOpen(false)}
        footer={null}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
        >
          {isSet && (
            <Form.Item
              name="currentPassword"
              label="Current Password"
              rules={[{ required: true, message: 'Please enter current password' }]}
            >
              <Input.Password prefix={<LockOutlined />} placeholder="Current password" />
            </Form.Item>
          )}
          
          <Form.Item
            name="newPassword"
            label="New Password"
            rules={[
              { required: true, message: 'Please enter new password' },
              { min: 8, message: 'Password must be at least 8 characters' }
            ]}
          >
            <Input.Password prefix={<LockOutlined />} placeholder="New password" />
          </Form.Item>
          
          <Form.Item
            name="confirmPassword"
            label="Confirm Password"
            dependencies={['newPassword']}
            rules={[
              { required: true, message: 'Please confirm password' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('newPassword') === value) {
                    return Promise.resolve()
                  }
                  return Promise.reject('The two passwords do not match')
                },
              }),
            ]}
          >
            <Input.Password prefix={<LockOutlined />} placeholder="Confirm password" />
          </Form.Item>
          
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading} block>
              {isSet ? 'Update Password' : 'Set Password'}
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </>
  )
}