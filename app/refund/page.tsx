"use client"

import { useEffect, useState } from "react"
import { Card } from "@/components/ui/card"
import { Shield, ArrowLeft } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Footer } from "@/components/home/Footer"

interface Settings {
  title: string
  content: string
}

export default function RefundPolicyPage() {
  const [settings, setSettings] = useState<Settings | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchContent = async () => {
      try {
        //@TODO remove public routes under admin
        const response = await fetch("/api/admin/settings/refund")
        if (response.ok) {
          const data = await response.json()
          setSettings(data)
        }
      } catch (error) {
        console.error("Error fetching content:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchContent()
  }, [])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header Section */}
      <div className="bg-blue-600 text-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="max-w-4xl mx-auto">
            <Link href="/" className="inline-flex items-center text-blue-100 hover:text-white mb-6 transition-colors">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Home
            </Link>
            <div className="flex items-center mb-4">
              <Shield className="h-8 w-8 mr-3" />
              <h1 className="text-3xl md:text-4xl font-bold">{settings?.title || "Refund Policy"}</h1>
            </div>
            <p className="text-blue-100 text-lg">Our commitment to fair and transparent refund procedures</p>
          </div>
        </div>
      </div>

      {/* Content Section */}
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="max-w-4xl mx-auto">
          <Card className="p-8 md:p-10 border-0 shadow-lg rounded-xl">
            <div className="mb-6 pb-6 border-b border-gray-100">
              <div className="flex items-center text-sm text-gray-500 mb-4">
                <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-xs font-medium">
                  Official Policy
                </span>
                <span className="mx-2">•</span>
                <span>Last updated: {new Date().toLocaleDateString()}</span>
              </div>
              <h2 className="text-2xl font-semibold text-gray-900">Understanding Our Refund Terms</h2>
            </div>

            <div
              className="prose max-w-none text-gray-700 leading-relaxed"
              dangerouslySetInnerHTML={{ __html: settings?.content || "" }}
            />

            <div className="mt-10 pt-6 border-t border-gray-100">
              <div className="bg-blue-50 p-6 rounded-lg">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Have questions about our refund policy?</h3>
                <p className="text-gray-600 mb-4">
                  Our customer support team is here to help you understand our refund procedures.
                </p>
                <Button asChild className="bg-blue-600 hover:bg-blue-700">
                  <a href="mailto:heal@icarewellbeing.com">Contact Support</a>
                </Button>
              </div>
            </div>
          </Card>

          <div className="mt-8 text-center">
            <Link href="/" className="text-blue-600 hover:text-blue-800 inline-flex items-center font-medium">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Return to Homepage
            </Link>
          </div>
        </div>
      </div>
      <Footer/>
    </div>
  )
}

