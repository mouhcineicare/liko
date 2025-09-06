"use client"

import { useState } from "react"
import { Tabs, Card, Grid } from "antd"
import PatientsList from "@/components/dashboard/admin/PatientsList"
import TherapistsList from "@/components/dashboard/admin/TherapistsList"

const { TabPane } = Tabs
const { useBreakpoint } = Grid

export default function UsersPage() {
  const [activeTab, setActiveTab] = useState("patients")
  const screens = useBreakpoint()

  return (
    <div style={{ padding: 0 }}>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: screens.md ? 16 : 12,
        padding: screens.md ? '0 16px' : '0 12px'
      }}>
        <h1 style={{ 
          fontSize: screens.md ? 24 : 20, 
          margin: 0,
          fontWeight: 600
        }}>
          Manage Users
        </h1>
      </div>

      <Card 
        bodyStyle={{ padding: 0 }}
        bordered={screens.md}
        style={{
          borderRadius: screens.md ? 8 : 0,
          boxShadow: screens.md ? '0 1px 2px 0 rgba(0, 0, 0, 0.03)' : 'none',
          borderLeft: screens.md ? undefined : 'none',
          borderRight: screens.md ? undefined : 'none'
        }}
      >
        <Tabs 
          activeKey={activeTab} 
          onChange={setActiveTab}
          tabBarStyle={{ 
            marginBottom: 0,
            paddingLeft: screens.md ? 24 : 12,
            paddingRight: screens.md ? 24 : 12
          }}
          size={screens.md ? 'middle' : 'small'}
          tabPosition={screens.md ? 'top' : 'top'}
          centered={!screens.md}
        >
          <TabPane 
            tab="Patients" 
            key="patients"
            style={{
              padding: screens.md ? 24 : 12
            }}
          >
            <PatientsList />
          </TabPane>
          <TabPane 
            tab="Therapists" 
            key="therapists"
            style={{
              padding: screens.md ? 24 : 12
            }}
          >
            <TherapistsList />
          </TabPane>
        </Tabs>
      </Card>
    </div>
  )
}