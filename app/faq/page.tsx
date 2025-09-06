"use client"

import { useEffect, useState } from "react"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Button } from "@/components/ui/button"
import { Search, HelpCircle, ArrowRight } from "lucide-react"

interface FAQ {
  question: string
  answer: string
  category?: string
}

interface Settings {
  title: string
  content: string
  description?: string
}

export default function FAQPage() {
  const [settings, setSettings] = useState<Settings | null>(null)
  const [faqs, setFaqs] = useState<FAQ[]>([])
  const [filteredFaqs, setFilteredFaqs] = useState<FAQ[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [activeCategory, setActiveCategory] = useState("all")

  // Extract unique categories from FAQs
  const categories =
    faqs.length > 0
      ? ["all", ...Array.from(new Set(faqs.filter((faq) => faq.category).map((faq) => faq.category)))]
      : ["all"]

  useEffect(() => {
    const fetchContent = async () => {
      try {
        const response = await fetch("/api/admin/settings/faq")
        if (response.ok) {
          const data = await response.json()
          setSettings(data)

          // Parse FAQs and add default categories if missing
          const parsedFaqs = JSON.parse(data.content).map((faq: FAQ) => ({
            ...faq,
            category: faq.category || "General",
          }))

          setFaqs(parsedFaqs)
          setFilteredFaqs(parsedFaqs)
        }
      } catch (error) {
        console.error("Error fetching content:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchContent()
  }, [])

  // Filter FAQs based on search query and active category
  useEffect(() => {
    let result = faqs

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      result = result.filter(
        (faq) => faq.question.toLowerCase().includes(query) || faq.answer.toLowerCase().includes(query),
      )
    }

    // Filter by category
    if (activeCategory !== "all") {
      result = result.filter((faq) => faq.category === activeCategory)
    }

    setFilteredFaqs(result)
  }, [searchQuery, activeCategory, faqs])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">{settings?.title || "Frequently Asked Questions"}</h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            {settings?.description || "Find answers to the most common questions about our services."}
          </p>
        </div>

        {/* Search Bar */}
        <div className="max-w-2xl mx-auto mb-10">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <Input
              type="text"
              placeholder="Search for questions..."
              className="pl-10 py-6 text-base rounded-full border-gray-300 focus:border-blue-500 focus:ring-blue-500"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-4xl mx-auto">
          {categories.length > 1 && (
            <Tabs defaultValue="all" value={activeCategory} onValueChange={setActiveCategory} className="mb-8">
              <TabsList className="grid grid-cols-2 md:grid-cols-4 lg:flex lg:flex-wrap gap-2">
                {categories.map((category) => (
                  <TabsTrigger
                    key={category}
                    value={category || ""}
                    className="data-[state=active]:bg-blue-600 data-[state=active]:text-white"
                  >
                    {category === "all" ? "All Questions" : category}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          )}

          <Card className="p-6 bg-white shadow-sm border-0 rounded-xl">
            {filteredFaqs.length > 0 ? (
              <Accordion type="single" collapsible className="space-y-4">
                {filteredFaqs.map((faq, index) => (
                  <AccordionItem
                    key={index}
                    value={`item-${index}`}
                    className="border border-gray-200 rounded-lg px-6 py-2 mb-4 shadow-sm"
                  >
                    <AccordionTrigger className="text-lg font-medium text-gray-900 hover:no-underline">
                      <div className="flex items-start">
                        <HelpCircle className="h-6 w-6 text-blue-600 mr-3 flex-shrink-0 mt-0.5" />
                        <span className="text-left">{faq.question}</span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="text-gray-600 pt-2 pl-9">
                      <div className="prose max-w-none" dangerouslySetInnerHTML={{ __html: faq.answer }} />
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            ) : (
              <div className="text-center py-12">
                <HelpCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No matching questions found</h3>
                <p className="text-gray-600 mb-6">Try adjusting your search or browse all questions</p>
                <Button
                  variant="outline"
                  onClick={() => {
                    setSearchQuery("")
                    setActiveCategory("all")
                  }}
                >
                  View all FAQs
                </Button>
              </div>
            )}
          </Card>

          {/* Contact Section */}
          <div className="mt-12 bg-blue-50 rounded-xl p-8 text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Still have questions?</h2>
            <p className="text-gray-600 mb-6 max-w-2xl mx-auto">
              If you couldn't find the answer to your question, our support team is here to help.
            </p>
            <Button className="bg-blue-600 hover:bg-blue-700">
              Contact Support
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

