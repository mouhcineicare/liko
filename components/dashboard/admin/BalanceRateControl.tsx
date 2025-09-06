"use client"

import { useState, useEffect } from 'react'
import { Button, InputNumber, Card, Space, message } from 'antd'
import { SaveOutlined } from '@ant-design/icons'

export default function BalanceRateControl() {
  const [balanceRate, setBalanceRate] = useState<number>(0)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchBalanceRate()
  }, [])

  const fetchBalanceRate = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/admin/settings/balance-rate')
      if (response.ok) {
        const data = await response.json()
        setBalanceRate(data.balanceRate)
      } else {
        throw new Error('Failed to fetch balance rate')
      }
    } catch (error) {
      console.error('Error:', error)
      message.error('Failed to load balance rate')
    } finally {
      setLoading(false)
    }
  }

  const saveBalanceRate = async () => {
    setSaving(true)
    try {
      const response = await fetch('/api/admin/settings/balance-rate', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ balanceRate }),
      })

      if (response.ok) {
        message.success('Balance rate updated successfully')
      } else {
        throw new Error('Failed to update balance rate')
      }
    } catch (error) {
      console.error('Error:', error)
      message.error('Failed to update balance rate')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card 
      title="Session Balance Rate" 
      size="small"
      loading={loading}
      extra={
        <Button
          type="primary"
          icon={<SaveOutlined />}
          onClick={saveBalanceRate}
          loading={saving}
          disabled={loading}
        >
          Save
        </Button>
      }
    >
      <Space direction="vertical" style={{ width: '100%' }}>
        <div>
          <p style={{ marginBottom: 8 }}>
            Set the default session balance rate (AED):
          </p>
          <InputNumber
            min={0}
            max={1000}
            value={balanceRate}
            onChange={(value) => setBalanceRate(value || 0)}
            style={{ width: '100%' }}
            precision={2}
          />
        </div>
      </Space>
    </Card>
  )
}