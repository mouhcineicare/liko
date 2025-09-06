"use client"

import { useEffect, useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { MapPin, Mail, Phone, ArrowRight, Quote, Info, Clock, Users, Globe } from "lucide-react"
import Image from "next/image"
import { Footer } from "@/components/home/Footer"
import { Skeleton } from "@/components/ui/skeleton"

interface Settings {
  title: string
  content: string
}

export default function AboutPage() {
  const [settings, setSettings] = useState<Settings | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchContent = async () => {
      try {
        const response = await fetch("/api/admin/settings/about")
        if (response.ok) {
          const data = await response.json()

          // Parse content if it's a JSON string
          let parsedData = { ...data }
          try {
            // If content contains JSON data for additional sections
            const contentObj = JSON.parse(data.content)
            parsedData = { ...parsedData, ...contentObj }
          } catch (e) {
            // If content is just HTML
            parsedData.content = data.content
          }

          setSettings(parsedData)
        }
      } catch (error) {
        console.error("Error fetching content:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchContent()
  }, [])

  interface Statistics {
    clientsServed: number;
    teamMembers: number;
  }

  const [statistics, setStatistics] = useState<Statistics>({
    clientsServed: 0,
    teamMembers: 0
  });
  const [feedbacks, setFeedbacks] = useState<Array<{
    userId: string;
    fullName: string;
    rating: number;
    comment: string;
    createdAt?: Date;
  }>>([]);

  useEffect(() => {
    const fetchStatistics = async () => {
      try {
        const response = await fetch('/api/about/statistics');
        if (response.ok) {
          const data = await response.json();
          setStatistics(data.statistics);
          setFeedbacks(data.feedbacks);
        }
      } catch (error) {
        console.error('Error fetching statistics:', error);
      }
    };

    fetchStatistics();
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        {/* Hero Section Skeleton */}
        <div className="bg-blue-600 text-white">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-28">
            <div className="max-w-4xl mx-auto text-center">
              <Skeleton className="h-12 w-3/4 mx-auto mb-6 bg-blue-500" />
              <Skeleton className="h-6 w-full mx-auto bg-blue-500" />
              <Skeleton className="h-6 w-5/6 mx-auto mt-2 bg-blue-500" />
            </div>
          </div>
        </div>

        {/* Content Skeleton */}
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="max-w-5xl mx-auto">
            <Skeleton className="h-8 w-64 mb-6" />
            <div className="space-y-4 mb-8">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          </div>
        </div>
      </div>
    )
  }

  const stats = [
    {
      value: `${statistics.clientsServed}+`,
      label: "Clients Served",
      description: "Trusted by our satisfied patients",
      icon: <Users className="h-6 w-6 text-blue-600" />
    },
    {
      value: `${statistics.teamMembers}+`,
      label: "Team Members",
      description: "Dedicated professionals working for you",
      icon: <Users className="h-6 w-6 text-blue-600" />
    }
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <div className="bg-blue-600 text-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-28">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-6">{settings?.title || "About Icarewellbeing"}</h1>
            <p className="text-xl md:text-2xl text-blue-100 leading-relaxed">
              We're dedicated to providing exceptional wellbeing services to help you achieve balance and harmony in
              your life.
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Featured Content Section - Redesigned */}
        <div className="max-w-5xl mx-auto mb-20">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Who We Are</h2>
            <div className="w-20 h-1 bg-blue-600 mx-auto"></div>
          </div>

          <div className="relative">
            {/* Background decorative elements */}
            <div className="absolute -top-6 -left-6 w-20 h-20 border-t-4 border-l-4 border-blue-200 opacity-50"></div>
            <div className="absolute -bottom-6 -right-6 w-20 h-20 border-b-4 border-r-4 border-blue-200 opacity-50"></div>

            {/* Content Card */}
            <Card className="p-8 md:p-12 border-0 shadow-lg relative z-10 overflow-hidden">
              <div className="absolute top-0 right-0 w-40 h-40 bg-blue-50 rounded-full -mr-20 -mt-20 z-0"></div>

              <div className="relative z-10">
                <div className="flex justify-center mb-8">
                  <div className="bg-blue-50 p-4 rounded-full">
                    <Info className="h-8 w-8 text-blue-600" />
                  </div>
                </div>

                <div
                  className="prose prose-lg max-w-none text-gray-700 mx-auto prose-headings:text-blue-800 prose-headings:font-semibold prose-p:text-gray-600 prose-strong:text-blue-700 prose-a:text-blue-600 prose-a:no-underline hover:prose-a:underline"
                  dangerouslySetInnerHTML={{ __html: settings?.content || "" }}
                />
              </div>
            </Card>
          </div>

          <div className="mt-10 text-center">
            <Button className="bg-blue-600 hover:bg-blue-700 px-8 py-6 text-lg">
              Learn More About Our Services
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Image Gallery Section */}
        <div className="mb-20">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 relative h-[400px] rounded-xl overflow-hidden shadow-lg">
              <Image
                src="https://images.unsplash.com/photo-1576091160550-2173dba999ef?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80"
                alt="Wellness center with calming environment"
                fill
                className="object-cover"
              />
            </div>
            <div className="grid grid-cols-1 gap-6">
              <div className="relative h-[190px] rounded-xl overflow-hidden shadow-lg">
                <Image
                  src="https://images.unsplash.com/photo-1516302752625-fcc3c50ae61f?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80"
                  alt="Therapy session in progress"
                  fill
                  className="object-cover"
                />
              </div>
              <div className="relative h-[190px] rounded-xl overflow-hidden shadow-lg">
                <Image
                  src="https://images.unsplash.com/photo-1573497620053-ea5300f94f21?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80"
                  alt="Professional healthcare team"
                  fill
                  className="object-cover"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Stats Section */}
        <div className="mb-20">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Our Impact by the Numbers</h2>
            <div className="w-20 h-1 bg-blue-600 mx-auto"></div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
    {
      value: `${statistics.clientsServed}+`,
      label: "Clients Served",
      description: "Trusted by our satisfied patients",
      icon: <Users className="h-6 w-6 text-blue-600" />
    },
    {
      value: `${statistics.teamMembers}+`,
      label: "Team Members",
      description: "Dedicated professionals working for you",
      icon: <Users className="h-6 w-6 text-blue-600" />
    }
  ].map((stat, index: number) => (
    <Card
      key={index}
      className="p-8 text-center border-0 shadow-md hover:shadow-lg transition-shadow bg-white"
    >
      <div className="flex justify-center mb-4">{stat.icon}</div>
      <p className="text-4xl font-bold text-blue-600 mb-2">{stat.value}</p>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">{stat.label}</h3>
      <p className="text-gray-600">{stat.description}</p>
    </Card>
  ))}
          </div>
        </div>

        {/* Testimonial Section */}
        <Card className="p-10 md:p-16 bg-blue-50 border-0 rounded-xl mb-20 shadow-md">
          <div className="flex flex-col items-center text-center">
            <div className="bg-white p-4 rounded-full shadow-md mb-8">
              <Quote className="h-10 w-10 text-blue-600" />
            </div>
            <p className="text-xl md:text-2xl text-gray-800 italic mb-8 max-w-3xl leading-relaxed">
              "Working with this team has been an absolute pleasure. Their dedication to excellence and customer
              satisfaction is unmatched in the industry."
            </p>
            <div className="flex items-center">
              <div className="w-16 h-16 rounded-full bg-gray-300 mr-4 overflow-hidden shadow-md border-2 border-white">
                <Image
                  src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=774&q=80"
                  alt="Client testimonial"
                  width={64}
                  height={64}
                />
              </div>
              <div className="text-left">
                <p className="font-semibold text-gray-900 text-lg">John Smith</p>
                <p className="text-gray-600">CEO, Partner Company</p>
              </div>
            </div>
          </div>
        </Card>

        {/* Contact Section */}
        <Card className="p-10 border-0 shadow-lg rounded-xl mb-10">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Get in Touch</h2>
            <div className="w-20 h-1 bg-blue-600 mx-auto"></div>
            <p className="text-gray-600 mt-4 max-w-2xl mx-auto">
              Have questions about our services? We'd love to hear from you and discuss how we can help with your
              wellbeing journey.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            <div className="space-y-6">
              <div className="flex items-start p-4 bg-blue-50 rounded-lg">
                <MapPin className="h-6 w-6 text-blue-600 mr-4 mt-1 flex-shrink-0" />
                <div className="text-gray-700">
                  <h3 className="font-semibold text-gray-900 mb-2">Our Location</h3>
                  <p>
                    Ddp Building 2 - Dubai Silicon Oasis - Area - Dubai -<br />
                    United Arab Emirates
                  </p>
                  <p className="mt-2">
                    POB 342058 - Dubai Digital Park. DSO - واحة دبي السيليكونمنطقة صناعية - Dubai - United Arab Emirates
                  </p>
                  <p className="mt-2">499G+PJ Dubai - United Arab Emirates</p>
                </div>
              </div>

              <div className="flex items-start p-4 bg-blue-50 rounded-lg">
                <Mail className="h-6 w-6 text-blue-600 mr-4 mt-1 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Email Us</h3>
                  <a
                    href="mailto:heal@icarewellbeing.com"
                    className="text-gray-700 hover:text-blue-600 transition-colors"
                  >
                    heal@icarewellbeing.com
                  </a>
                </div>
              </div>

              <div className="flex items-start p-4 bg-blue-50 rounded-lg">
                <Phone className="h-6 w-6 text-blue-600 mr-4 mt-1 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Call or WhatsApp</h3>
                  <a href="https://wa.me/971505020658" className="text-gray-700 hover:text-blue-600 transition-colors">
                    +971 50 502 0658
                  </a>
                </div>
              </div>
            </div>

            <div className="h-[400px] relative rounded-lg overflow-hidden shadow-lg">
              <iframe
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3612.1741966856636!2d55.38620731500953!3d25.128599983930786!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3e5f643f4a6a4c69%3A0x9c5b4a970170592f!2sDubai%20Digital%20Park%2C%20Dubai%20Silicon%20Oasis!5e0!3m2!1sen!2sae!4v1616661234567!5m2!1sen!2sae"
                width="100%"
                height="100%"
                style={{ border: 0 }}
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                title="Icarewellbeing Location"
                className="absolute inset-0"
              ></iframe>
            </div>
          </div>

          <div className="mt-10 flex flex-col sm:flex-row justify-center gap-4">
            <Button asChild size="lg" className="bg-blue-600 hover:bg-blue-700">
              <a href="mailto:heal@icarewellbeing.com">
                Email Us
                <ArrowRight className="ml-2 h-4 w-4" />
              </a>
            </Button>
            <Button asChild size="lg" variant="outline" className="border-blue-600 text-blue-600 hover:bg-blue-50">
              <a
                href="https://www.google.com/maps/search/Ddp+Building+2+-+Dubai+Silicon+Oasis+-+Area+-+Dubai+-%0AUnited+Arab+Emirates/@25.1286,55.3862,17z?hl=en&entry=ttu&g_ep=EgoyMDI1MDMxOS4yIKXMDSoASAFQAw%3D%3D"
                target="_blank"
                rel="noopener noreferrer"
              >
                View on Google Maps
                <MapPin className="ml-2 h-4 w-4" />
              </a>
            </Button>
          </div>
        </Card>
      </div>
      <Footer />
    </div>
  )
}

