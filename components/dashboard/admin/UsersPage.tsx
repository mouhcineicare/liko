"use client"

import { useState } from "react"
import { Tabs, Card, Space } from "antd"
import PatientsList from "@/components/dashboard/admin/PatientsList"
import TherapistsList from "@/components/dashboard/admin/TherapistsList"
import ImpersonationPasswordDialog from "@/components/dashboard/admin/ImpersonationPasswordDialog"

const { TabPane } = Tabs

export default function UsersPage() {
  const [activeTab, setActiveTab] = useState("patients")

  return (
    <div style={{ padding: 24 }}>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: 16 
      }}>
        <h1 style={{ fontSize: 24, margin: 0 }}>Manage Users</h1>
        <Space>
          <ImpersonationPasswordDialog />
        </Space>
      </div>

      <Card>
        <Tabs 
          activeKey={activeTab} 
          onChange={setActiveTab}
          tabBarStyle={{ marginBottom: 0 }}
        >
          <TabPane tab="Patients" key="patients">
            <PatientsList />
          </TabPane>
          <TabPane tab="Therapists" key="therapists">
            <TherapistsList />
          </TabPane>
        </Tabs>
      </Card>
    </div>
  )
}