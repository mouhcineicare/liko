"use client";

import { useState, useEffect } from "react";
import { 
  Card, 
  Table, 
  Button, 
  Tag, 
  Spin, 
  message,
  Statistic,
  Divider,
  Space,
  Typography,
  Modal,
  Form,
  Input,
  InputNumber,
  DatePicker,
  Select,
  Switch,
  Popconfirm,
  Grid
} from 'antd';
import { 
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import type { Dayjs } from 'dayjs';
import axios from 'axios';

const { Text } = Typography;
const { Option } = Select;
const { useBreakpoint } = Grid;

interface Coupon {
  _id: string;
  code: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  maxDiscount?: number;
  minPurchase?: number;
  startDate: string | Date;
  endDate: string | Date;
  usageLimit?: number;
  usedCount: number;
  isActive: boolean;
  applicableTo: 'all' | 'specific';
  specificTherapists?: string[];
  createdAt: string | Date;
}

export default function CouponsPage() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [currentCoupon, setCurrentCoupon] = useState<Coupon | null>(null);
  const [form] = Form.useForm();
  const screens = useBreakpoint();

  useEffect(() => {
    fetchCoupons();
  }, []);

  const fetchCoupons = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/admin/coupons');
      setCoupons(response.data);
    } catch (error) {
      console.error('Error fetching coupons:', error);
      message.error('Failed to load coupons');
    } finally {
      setLoading(false);
    }
  };

  const handleAddCoupon = () => {
    setCurrentCoupon(null);
    form.resetFields();
    setIsModalVisible(true);
  };

  const handleEditCoupon = (coupon: Coupon) => {
    setCurrentCoupon(coupon);
    form.setFieldsValue({
      ...coupon,
      startDate: dayjs(coupon.startDate),
      endDate: dayjs(coupon.endDate)
    });
    setIsModalVisible(true);
  };

  const handleDeleteCoupon = async (id: string) => {
    try {
      await axios.delete(`/api/admin/coupons/${id}`);
      message.success('Coupon deleted successfully');
      fetchCoupons();
    } catch (error) {
      console.error('Error deleting coupon:', error);
      message.error('Failed to delete coupon');
    }
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      const couponData = {
        ...values,
        startDate: values.startDate.toISOString(),
        endDate: values.endDate.toISOString()
      };
  
      if (currentCoupon) {
        await axios.put(`/api/admin/coupons/${currentCoupon._id}`, couponData);
        message.success('Coupon updated successfully');
      } else {
        await axios.post('/api/admin/coupons', couponData);
        message.success('Coupon created successfully');
      }
  
      setIsModalVisible(false);
      fetchCoupons();
    } catch (error) {
      console.error('Error submitting coupon:', error);
      message.error('Failed to save coupon');
    }
  };

  const getMobileColumns = () => [
    {
      title: 'Code',
      dataIndex: 'code',
      key: 'code',
      render: (text: string) => <Text strong>{text}</Text>
    },
    {
      title: 'Discount',
      key: 'discount',
      render: (_: any, record: Coupon) => (
        <Text>
          {record.discountType === 'percentage' 
            ? `${record.discountValue}%` 
            : `د.إ${record.discountValue.toFixed(2)}`}
        </Text>
      )
    },
    {
      title: 'Status',
      dataIndex: 'isActive',
      key: 'status',
      render: (isActive: boolean) => (
        <Tag color={isActive ? 'green' : 'red'}>
          {isActive ? 'Active' : 'Inactive'}
        </Tag>
      )
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: Coupon) => (
        <Space size="small">
          <Button 
            size="small"
            type="link" 
            icon={<EditOutlined />} 
            onClick={() => handleEditCoupon(record)}
          />
          <Popconfirm
            title="Delete this coupon?"
            onConfirm={() => handleDeleteCoupon(record._id)}
            okText="Yes"
            cancelText="No"
          >
            <Button 
              size="small"
              type="text" 
              danger 
              icon={<DeleteOutlined />} 
            />
          </Popconfirm>
        </Space>
      )
    }
  ];

  const getDesktopColumns = () => [
    ...getMobileColumns(),
    {
      title: 'Validity',
      key: 'validity',
      render: (_: any, record: Coupon) => (
        <div>
          <Text>{dayjs(record.startDate).format('MMM D, YYYY')}</Text>
          <Text> - </Text>
          <Text>{dayjs(record.endDate).format('MMM D, YYYY')}</Text>
        </div>
      )
    },
    {
      title: 'Usage',
      key: 'usage',
      render: (_: any, record: Coupon) => (
        <Text>
          {record.usageLimit 
            ? `${record.usedCount}/${record.usageLimit}` 
            : `${record.usedCount} uses`}
        </Text>
      )
    }
  ];

  return (
    <div className="p-4 md:p-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 md:mb-6 gap-2">
        <Text strong style={{ fontSize: screens.md ? 20 : 18 }}>Coupon Management</Text>
        <Button 
          type="primary" 
          icon={<PlusOutlined />}
          onClick={handleAddCoupon}
          size={screens.md ? 'middle' : 'small'}
          block={!screens.md}
        >
          {screens.md ? 'Add Coupon' : 'Add'}
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4 mb-4 md:mb-6">
        <Card size="small" className="w-full">
          <Statistic
            title="Total Coupons"
            value={coupons.length}
            valueStyle={{ fontSize: screens.md ? 24 : 20 }}
          />
        </Card>
        <Card size="small" className="w-full">
          <Statistic
            title="Active Coupons"
            value={coupons.filter(c => c.isActive).length}
            valueStyle={{ fontSize: screens.md ? 24 : 20 }}
          />
        </Card>
        <Card size="small" className="w-full">
          <Statistic
            title="Total Usage"
            value={coupons.reduce((sum, c) => sum + c.usedCount, 0)}
            valueStyle={{ fontSize: screens.md ? 24 : 20 }}
          />
        </Card>
      </div>

      <Card size={screens.md ? 'default' : 'small'}>
        {loading ? (
          <div className="flex justify-center items-center min-h-[200px]">
            <Spin />
          </div>
        ) : (
          <Table
            columns={screens.md ? getDesktopColumns() : getMobileColumns()}
            dataSource={coupons}
            rowKey="_id"
            pagination={{ 
              pageSize: 10,
              simple: !screens.md,
              showSizeChanger: screens.md
            }}
            scroll={{ x: true }}
            size={screens.md ? 'middle' : 'small'}
            locale={{
              emptyText: 'No coupons available'
            }}
          />
        )}
      </Card>

      <Modal
        title={currentCoupon ? 'Edit Coupon' : 'Add New Coupon'}
        open={isModalVisible}
        onOk={handleSubmit}
        onCancel={() => setIsModalVisible(false)}
        width={screens.md ? 700 : '90%'}
        okText={currentCoupon ? 'Update' : 'Create'}
        destroyOnClose
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={{
            discountType: 'percentage',
            applicableTo: 'all',
            isActive: true
          }}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
            <Form.Item
              name="code"
              label="Coupon Code"
              rules={[
                { required: true, message: 'Please enter coupon code' },
                { pattern: /^[A-Z0-9]+$/, message: 'Only uppercase letters and numbers allowed' }
              ]}
            >
              <Input placeholder="e.g. SUMMER20" size={screens.md ? 'middle' : 'small'} />
            </Form.Item>

            <Form.Item
              name="discountType"
              label="Discount Type"
              rules={[{ required: true }]}
            >
              <Select size={screens.md ? 'middle' : 'small'}>
                <Option value="percentage">Percentage</Option>
                <Option value="fixed">Fixed Amount</Option>
              </Select>
            </Form.Item>

            <Form.Item
              name="discountValue"
              label="Discount Value"
              rules={[
                { required: true, message: 'Please enter discount value' },
                { type: 'number', min: 0.01, message: 'Must be greater than 0' }
              ]}
            >
              <InputNumber 
                style={{ width: '100%' }} 
                min={0.01}
                size={screens.md ? 'middle' : 'small'}
                formatter={value => 
                  form.getFieldValue('discountType') === 'percentage' 
                    ? `${value}%` 
                    : `د.إ${value}`
                }
                parser={value => value!.replace(/[^\d.]/g, '')}
              />
            </Form.Item>

            {form.getFieldValue('discountType') === 'percentage' && (
              <Form.Item
                name="maxDiscount"
                label="Max Discount (optional)"
                rules={[
                  { type: 'number', min: 0.01, message: 'Must be greater than 0' }
                ]}
              >
                <InputNumber 
                  style={{ width: '100%' }} 
                  min={0.01}
                  size={screens.md ? 'middle' : 'small'}
                  prefix="د.إ"
                />
              </Form.Item>
            )}

            <Form.Item
              name="minPurchase"
              label="Min Purchase (optional)"
            >
              <InputNumber 
                style={{ width: '100%' }} 
                min={0}
                size={screens.md ? 'middle' : 'small'}
                prefix="د.إ"
              />
            </Form.Item>

            <Form.Item
              name="usageLimit"
              label="Usage Limit (optional)"
              rules={[
                { type: 'number', min: 1, message: 'Must be at least 1' }
              ]}
            >
              <InputNumber 
                style={{ width: '100%' }} 
                min={1}
                size={screens.md ? 'middle' : 'small'}
                placeholder="Unlimited if empty"
              />
            </Form.Item>

            <Form.Item
              name="applicableTo"
              label="Applicable To"
              rules={[{ required: true }]}
            >
              <Select size={screens.md ? 'middle' : 'small'}>
                <Option value="all">All Therapists</Option>
                <Option value="specific">Specific Therapists</Option>
              </Select>
            </Form.Item>

            <Form.Item
              name="isActive"
              label="Status"
              valuePropName="checked"
            >
              <Switch 
                checkedChildren="Active" 
                unCheckedChildren="Inactive" 
                size={screens.md ? 'default' : 'small'}
              />
            </Form.Item>

            <Form.Item
              name="startDate"
              label="Start Date"
              rules={[{ required: true, message: 'Please select start date' }]}
            >
              <DatePicker 
                style={{ width: '100%' }}
                size={screens.md ? 'middle' : 'small'}
                disabledDate={(current: Dayjs) => {
                  const endDate = form.getFieldValue('endDate');
                  return endDate ? current.isAfter(endDate) : false;
                }}
              />
            </Form.Item>

            <Form.Item
              name="endDate"
              label="End Date"
              rules={[{ required: true, message: 'Please select end date' }]}
            >
              <DatePicker 
                style={{ width: '100%' }}
                size={screens.md ? 'middle' : 'small'}
                disabledDate={(current: Dayjs) => {
                  const startDate = form.getFieldValue('startDate');
                  return startDate ? current.isBefore(startDate) : false;
                }}
              />
            </Form.Item>
          </div>
        </Form>
      </Modal>
    </div>
  );
}