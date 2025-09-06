"use client"

import React, { useState, useEffect } from "react"
import { 
  Table, 
  Input,
  Button,
  Select,
  Modal,
  Card,
  Tag,
  Tabs, 
  Tooltip, 
  Spin,
  message,
  Form,
  InputNumber,
  Row,
  Col,
  Divider,
  Checkbox,
  Grid,
  Space // Import Space component
} from "antd"
import { 
  PlusOutlined, 
  EditOutlined, 
  DeleteOutlined, 
  CloseOutlined, 
  DragOutlined, 
  InfoCircleOutlined,
  CheckOutlined,
  CloseOutlined as CloseCircleOutlined
} from "@ant-design/icons"
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd"
import TextArea from "antd/es/input/TextArea"
// import BalanceRateControl from "@/components/dashboard/admin/BalanceRateControl"


const { useBreakpoint } = Grid;

interface Plan {
  _id: string
  title: string
  price: number
  type: string
  description: string
  features: string[]
  active: boolean
  subscribtion: string
  therapyType: string
  order: number
  isSameDay?: boolean 
}

const PLAN_TYPES = [
  { value: "single_session", label: "Single Session" },
  { value: "x2_sessions", label: "2 Sessions" },
  { value: "x3_sessions", label: "3 Sessions" },
  { value: "x4_sessions", label: "4 Sessions" },
  { value: "x5_sessions", label: "5 Sessions" },
  { value: "x6_sessions", label: "6 Sessions" },
  { value: "x7_sessions", label: "7 Sessions" },
  { value: "x8_sessions", label: "8 Sessions" },
  { value: "x9_sessions", label: "9 Sessions" },
  { value: "x10_sessions", label: "10 Sessions" },
  { value: "x11_sessions", label: "11 Sessions" },
  { value: "x12_sessions", label: "12 Sessions" },
]

const PLANS_SUBSCRIBTION = [
  { value: "single", label: "Single Payment" },
  { value: "monthly", label: "Monthly subscribtion" },
]

const THERAPY_TYPES = [
  { value: "all", label: "All Plans" },
  { value: "individual", label: "Individual Therapy" },
  { value: "couples", label: "Couples Therapy" },
  { value: "kids", label: "Kids Therapy" },
  { value: "psychiatry", label: "Psychiatry" },
]

const { TabPane } = Tabs

export default function PlansPage() {
  const [plans, setPlans] = useState<Plan[]>([])
  const [filteredPlans, setFilteredPlans] = useState<Plan[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isReordering, setIsReordering] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null)
  const [activeTab, setActiveTab] = useState("all")
  const [form] = Form.useForm()
  const [featureInput, setFeatureInput] = useState("")
  const [features, setFeatures] = useState<string[]>([])
  const screens = useBreakpoint();


  useEffect(() => {
    fetchPlans()
  }, [])

  useEffect(() => {
    if (activeTab === "all") {
      const sortedPlans = [...plans].sort((a, b) => {
        if (a.therapyType !== b.therapyType) {
          return a.therapyType.localeCompare(b.therapyType)
        }
        return a.order - b.order
      })
      setFilteredPlans(sortedPlans)
    } else {
      const filteredByType = plans.filter((plan) => plan.therapyType === activeTab)
      const sortedByOrder = [...filteredByType].sort((a, b) => a.order - b.order)
      setFilteredPlans(sortedByOrder)
    }
  }, [plans, activeTab])

  const fetchPlans = async () => {
    try {
      const response = await fetch("/api/admin/plans")
      if (response.ok) {
        const data = await response.json()
        setPlans(data)
      }
    } catch (error) {
      console.error("Error fetching plans:", error)
      message.error("Failed to load plans")
    } finally {
      setIsLoading(false)
    }
  }

  const handleSpecialtyKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && featureInput.trim()) {
      e.preventDefault()
      if (!features.includes(featureInput.trim())) {
        setFeatures([...features, featureInput.trim()])
      }
      setFeatureInput("")
    }
  }

  const removeFeature = (index: number) => {
    const newFeatures = [...features]
    newFeatures.splice(index, 1)
    setFeatures(newFeatures)
  }

  const handleSubmit = async (values: any) => {
    setIsSaving(true)

    try {
      const price = Number.parseFloat(values.price)
      if (isNaN(price)) {
        throw new Error("Price must be a valid number")
      }

      let orderNumber = 0
      if (!editingPlan) {
        const plansOfSameType = plans.filter((p) => p.therapyType === values.therapyType)
        if (plansOfSameType.length > 0) {
          orderNumber = Math.max(...plansOfSameType.map((p) => p.order)) + 1
        }
      } else {
        orderNumber = editingPlan.order
      }

      const response = await fetch("/api/admin/plans" + (editingPlan ? `/${editingPlan._id}` : ""), {
        method: editingPlan ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...values,
          price: price,
          features: features,
          order: orderNumber,
          isSameDay: values.isSameDay || false, 
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to save plan")
      }

      message.success(`Plan ${editingPlan ? "updated" : "created"} successfully`)
      setShowModal(false)
      form.resetFields()
      setFeatures([])
      fetchPlans()
    } catch (error: any) {
      console.error("Error saving plan:", error)
      message.error(error.message || "Failed to save plan")
    } finally {
      setIsSaving(false)
    }
  }

  const handleEdit = (plan: Plan) => {
    setEditingPlan(plan)
    form.setFieldsValue({
      title: plan.title,
      price: plan.price,
      type: plan.type,
      description: plan.description,
      subscribtion: plan.subscribtion,
      therapyType: plan.therapyType,
      isSameDay: plan.isSameDay || false, 
    })
    setFeatures([...plan.features])
    setShowModal(true)
  }

  const handleDelete = async (planId: string) => {
    Modal.confirm({
      title: "Are you sure you want to delete this plan?",
      okText: "Delete",
      okType: "danger",
      cancelText: "Cancel",
      onOk: async () => {
        try {
          const response = await fetch(`/api/admin/plans/${planId}`, {
            method: "DELETE",
          })

          if (!response.ok) {
            throw new Error("Failed to delete plan")
          }

          message.success("Plan deleted successfully")
          fetchPlans()
        } catch (error) {
          console.error("Error deleting plan:", error)
          message.error("Failed to delete plan")
        }
      },
    })
  }

  const handleToggleStatus = async (planId: string, currentStatus: boolean) => {
    try {
      const response = await fetch(`/api/admin/plans/${planId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ active: !currentStatus }),
      })

      if (!response.ok) {
        throw new Error("Failed to update plan status")
      }

      message.success(`Plan ${currentStatus ? "deactivated" : "activated"} successfully`)
      fetchPlans()
    } catch (error) {
      console.error("Error updating plan status:", error)
      message.error("Failed to update plan status")
    }
  }

  const getPlanTypeLabel = (type: string) => {
    return PLAN_TYPES.find((t) => t.value === type)?.label || type
  }

  const getPlanSubscribtion = (subscribtion: string) => {
    return PLANS_SUBSCRIBTION.find((t) => t.value === subscribtion)?.label || subscribtion
  }

  const getTherapyTypeLabel = (type: string) => {
    return THERAPY_TYPES.find((t) => t.value === type)?.label || type
  }

  const onDragEnd = async (result: any) => {
    if (!result.destination || activeTab === "all") return

    const sourceIndex = result.source.index
    const destinationIndex = result.destination.index

    if (sourceIndex === destinationIndex) return

    setIsReordering(true)

    try {
      const updatedFilteredPlans = Array.from(filteredPlans)
      const [movedItem] = updatedFilteredPlans.splice(sourceIndex, 1)
      updatedFilteredPlans.splice(destinationIndex, 0, movedItem)

      const reorderedFilteredPlans = updatedFilteredPlans.map((plan, index) => ({
        ...plan,
        order: index,
      }))

      setFilteredPlans(reorderedFilteredPlans)

      const updatedAllPlans = plans.map((plan) => {
        const filteredPlan = reorderedFilteredPlans.find((p) => p._id === plan._id)
        if (filteredPlan) {
          return filteredPlan
        }
        return plan
      })

      setPlans(updatedAllPlans)

      const requestBody = {
        therapyType: activeTab,
        plans: reorderedFilteredPlans.map((plan, index) => {
          if (!plan._id || typeof plan._id !== "string") {
            console.error("Invalid plan ID:", plan._id)
            throw new Error("Invalid plan ID")
          }
          if (typeof index !== "number" || index < 0) {
            console.error("Invalid order:", index)
            throw new Error("Invalid order")
          }
          return {
            id: plan._id,
            order: index,
          }
        }),
      }

      const response = await fetch("/api/admin/plans/reorder", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      })

      if (!response.ok) {
        const errorData = await response.json()
        console.error("API error:", errorData)
        throw new Error("Failed to update plan order: " + (errorData.error || "Unknown error"))
      }

      const responseData = await response.json()

      if (!responseData.success) {
        throw new Error("Failed to update plan order: " + responseData.message)
      }

      if (responseData.results && responseData.results.some((r: any) => r.oldOrder === r.newOrder)) {
        console.warn(
          "Some plans may not have updated correctly:",
          responseData.results.filter((r: any) => r.oldOrder === r.newOrder),
        )
        await fetchPlans()
      } else {
        message.success("Plan order updated successfully")
      }
    } catch (error) {
      console.error("Error updating plan order:", error)
      message.error(
        typeof error === "object" && error !== null ? (error as Error).message : "Failed to update plan order",
      )
      fetchPlans()
    } finally {
      setIsReordering(false)
    }
  }

 const getColumns = () => {
  const baseColumns = [
    ...(activeTab !== "all" && screens.md
      ? [
          {
            title: "",
            key: "drag",
            width: 50,
            render: (_: any, __: any, index: number) => (
              <Draggable draggableId={`drag-${index}`} index={index}>
                {(provided) => (
                  <div
                    {...provided.dragHandleProps}
                    {...provided.draggableProps}
                    ref={provided.innerRef}
                    style={{ cursor: 'grab' }}
                  >
                    <DragOutlined style={{ color: "#999" }} />
                  </div>
                )}
              </Draggable>
            ),
          },
          {
            title: (
              <Tooltip title="Order is specific to each therapy type">
                <span>Order <InfoCircleOutlined style={{ marginLeft: 4, color: "#999" }} /></span>
              </Tooltip>
            ),
            dataIndex: "order",
            key: "order",
            width: 80,
          },
        ]
      : []),
    {
      title: "Title",
      dataIndex: "title",
      key: "title",
    },
    ...(screens.md ? [
      {
        title: "Type",
        dataIndex: "type",
        key: "type",
        render: (type: string) => getPlanTypeLabel(type),
      },
      {
        title: "Subscribtion",
        dataIndex: "subscribtion",
        key: "subscribtion",
        render: (subscribtion: string) => getPlanSubscribtion(subscribtion) || "-",
      },
      {
        title: "Therapy Type",
        dataIndex: "therapyType",
        key: "therapyType",
        render: (type: string) => getTherapyTypeLabel(type),
      }
    ] : []),
    {
      title: "Price",
      dataIndex: "price",
      key: "price",
      render: (price: number) => `د.إ${price}`,
    },
    ...(screens.md ? [
      {
        title: "Same Day",
        dataIndex: "isSameDay",
        key: "isSameDay",
        render: (isSameDay: boolean) => (
          <Tag color={isSameDay ? "green" : "default"}>{isSameDay ? "Yes" : "No"}</Tag>
        ),
      }
    ] : []),
    {
      title: "Status",
      dataIndex: "active",
      key: "status",
      render: (active: boolean) => (
        <Tag color={active ? "green" : "red"}>{active ? "Active" : "Inactive"}</Tag>
      ),
    },
    {
      title: "Actions",
      key: "actions",
      fixed: 'right', // This ensures the column stays visible
      width: screens.md ? 180 : 120, // Adjusted width for different screen sizes
      render: (_: any, record: Plan) => (
        <Space size={screens.md ? 8 : 4}>
          <Tooltip title={record.active ? "Deactivate" : "Activate"}>
            <Button
              type="primary"
              size={screens.md ? "small" : "small"}
              onClick={() => handleToggleStatus(record._id, record.active)}
              disabled={isReordering}
            >
              {record.active ? (
                screens.md ? "Deactivate" : <CloseOutlined />
              ) : (
                screens.md ? "Activate" : <CheckOutlined />
              )}
            </Button>
          </Tooltip>
          <Tooltip title="Edit">
            <Button
              icon={<EditOutlined />}
              size={screens.md ? "small" : "small"}
              onClick={() => handleEdit(record)}
              disabled={isReordering}
            />
          </Tooltip>
          <Tooltip title="Delete">
            <Button
              icon={<DeleteOutlined />}
              size={screens.md ? "small" : "small"}
              danger
              onClick={() => handleDelete(record._id)}
              disabled={isReordering}
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  return baseColumns;
};

  if (isLoading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", padding: "24px" }}>
        <Spin />
      </div>
    )
  }

  return (
    <div style={{ padding: screens.md ? 24 : 12 }}>
      {/* <Row style={{ marginBottom: 24 }}> */}
      {/* <Col span={24}>
        <BalanceRateControl />
      </Col>
      </Row> */}
      <Row justify="space-between" align="middle" style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: screens.md ? 24 : 18, margin: 0 }}>Therapy Plans</h1>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => {
            form.resetFields()
            setFeatures([])
            setShowModal(true)
            setEditingPlan(null)
          }}
          size={screens.md ? 'middle' : 'small'}
        >
          {screens.md ? 'Add Plan' : 'Add'}
        </Button>
      </Row>

      <Card size={screens.md ? 'default' : 'small'}>
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          tabPosition={screens.md ? 'top' : 'top'}
          centered={!screens.md}
          tabBarExtraContent={
            activeTab !== "all" && screens.md && (
              <div style={{ display: "flex", alignItems: "center", color: "#666", fontSize: 12 }}>
                <InfoCircleOutlined style={{ marginRight: 4 }} />
                <span>Drag and drop plans to reorder them</span>
              </div>
            )
          }
        >
          {THERAPY_TYPES.map((type) => (
            <TabPane tab={type.label} key={type.value}>
              <DragDropContext onDragEnd={onDragEnd}>
                <Droppable droppableId="plans" isDropDisabled={activeTab === "all"}>
                  {(provided) => (
                    <div ref={provided.innerRef} {...provided.droppableProps}>
                      <Table
                        columns={getColumns()}
                        dataSource={filteredPlans}
                        rowKey="_id"
                        pagination={false}
                        scroll={{ x: true }}
                        size={screens.md ? 'middle' : 'small'}
                        components={{
                          body: {
                            wrapper: (props: any) => (
                              <tbody {...props} {...provided.droppableProps} ref={provided.innerRef} />
                            ),
                            row: ({ children, ...props }: any) => {
                              const record = filteredPlans.find((p) => p._id === props['data-row-key']);
                              if (!record) return <tr {...props}>{children}</tr>;

                              return activeTab === "all" || !screens.md ? (
                                <tr {...props}>{children}</tr>
                              ) : (
                                <Draggable
                                  key={props['data-row-key']}
                                  draggableId={props['data-row-key']}
                                  index={record.order}
                                >
                                  {(provided) => (
                                    <tr
                                      ref={provided.innerRef}
                                      {...provided.draggableProps}
                                      {...props}
                                      style={{
                                        ...provided.draggableProps.style,
                                        ...props.style,
                                        cursor: 'move'
                                      }}
                                    >
                                      {React.Children.map(children, (child) => {
                                        if (React.isValidElement(child)) {
                                          return React.cloneElement(child, {
                                            ...provided.dragHandleProps,
                                          });
                                        }
                                        return child;
                                      })}
                                    </tr>
                                  )}
                                </Draggable>
                              );
                            },
                          },
                        }}
                      />
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </DragDropContext>
            </TabPane>
          ))}
        </Tabs>
      </Card>

      <Modal
        title={editingPlan ? "Edit Plan" : "Add New Plan"}
        open={showModal}
        onCancel={() => setShowModal(false)}
        footer={null}
        width={screens.md ? 800 : '90%'}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          initialValues={{
            title: "",
            price: "",
            type: "",
            description: "",
            subscribtion: "",
            therapyType: "",
            isSameDay: false,
          }}
        >
          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item
                label="Title"
                name="title"
                rules={[{ required: true, message: "Please enter plan title" }]}
              >
                <Input />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item
                label="Price (د.إ)"
                name="price"
                rules={[
                  { required: true, message: "Please enter price" },
                  {
                    validator: (_, value) => {
                      if (value && Number(value) > 0) {
                        return Promise.resolve()
                      }
                      return Promise.reject("Price must be a positive number")
                    },
                  },
                ]}
              >
                <InputNumber style={{ width: "100%" }} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item
                label="Plan Type"
                name="type"
                rules={[{ required: true, message: "Please select plan type" }]}
              >
                <Select placeholder="Select plan type">
                  {PLAN_TYPES.map((type) => (
                    <Select.Option key={type.value} value={type.value}>
                      {type.label}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item
                label="Plan Subscribtion"
                name="subscribtion"
                rules={[{ required: true, message: "Please select plan subscribtion" }]}
              >
                <Select placeholder="Select plan subscribtion">
                  {PLANS_SUBSCRIBTION.map((type) => (
                    <Select.Option key={type.value} value={type.value}>
                      {type.label}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            label="Therapy Type"
            name="therapyType"
            rules={[{ required: true, message: "Please select therapy type" }]}
          >
            <Select placeholder="Select therapy type">
              {THERAPY_TYPES.filter((t) => t.value !== "all").map((therapy) => (
                <Select.Option key={therapy.value} value={therapy.value}>
                  {therapy.label}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item 
            name="isSameDay" 
            valuePropName="checked"
            tooltip={screens.md ? "Enable this option to allow patients to book appointments on the same day" : null}
          >
            <Checkbox>
              <span style={{ display: "flex", alignItems: "center" }}>
                Allow Same Day Booking
                {screens.md && (
                  <Tooltip title="When enabled, patients can book appointments for today without the usual 8-hour restriction">
                    <InfoCircleOutlined style={{ marginLeft: 4, color: "#999" }} />
                  </Tooltip>
                )}
              </span>
            </Checkbox>
          </Form.Item>

          <Form.Item
            label="Description"
            name="description"
            rules={[{ required: true, message: "Please enter description" }]}
          >
            <TextArea rows={4} />
          </Form.Item>

          <Form.Item label="Features">
            <div style={{ border: "1px solid #d9d9d9", borderRadius: 4, padding: 8 }}>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 8 }}>
                {features.map((feature, index) => (
                  <Tag
                    key={index}
                    closable
                    onClose={() => removeFeature(index)}
                    closeIcon={<CloseCircleOutlined />}
                  >
                    {feature}
                  </Tag>
                ))}
              </div>
              <Input
                value={featureInput}
                onChange={(e) => setFeatureInput(e.target.value)}
                onKeyDown={handleSpecialtyKeyDown}
                placeholder="Type and press Enter to add features"
              />
            </div>
          </Form.Item>

          <Divider />

          <Form.Item>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <Button onClick={() => setShowModal(false)}>Cancel</Button>
              <Button type="primary" htmlType="submit" loading={isSaving}>
                {editingPlan ? "Update Plan" : "Create Plan"}
              </Button>
            </div>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}