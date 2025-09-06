"use client";
import React, { useState, useEffect } from 'react';
import AdminAppointmentsPage from "./appointments/page";
import MatchingPatients from "./match-patients/page";
import { ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import {
  LayoutDashboard,
  Calendar,
  Users,
  Settings,
  DollarSign,
  FileText,
  LayoutTemplate,
  Shuffle,
  MagnetIcon,
  BarChart,
  Network,
  Inbox,
  ListChecks,
  MessageCircle,
  PercentCircle,
  SpeakerIcon
} from "lucide-react";
import { MoneyCollectFilled } from "@ant-design/icons";

// Card data based on your navigation items
const cardItems = [
  {
    name: "Stats",
    href: "/dashboard/admin/stats",
    icon: BarChart,
    color: "bg-purple-50 text-purple-600",
  },
  {
    name: "Match Patients",
    href: "/dashboard/admin/match-patients",
    icon: ListChecks,
    color: "bg-green-50 text-green-600",
  },
  {
    name: "Matching",
    href: "/dashboard/admin/matching",
    icon: MagnetIcon,
    color: "bg-yellow-50 text-yellow-600",
  },
  {
    name: "ChatBot",
    href: "/dashboard/admin/chatbot",
    icon: MessageCircle,
    color: "bg-pink-50 text-pink-600",
  },
  {
    name: "Therapy Changes",
    href: "/dashboard/admin/therapy-changes",
    icon: Shuffle,
    color: "bg-indigo-50 text-indigo-600",
  },
  {
    name: "Appointments",
    href: "/dashboard/admin/appointments",
    icon: Calendar,
    color: "bg-red-50 text-red-600",
  },
  {
    name: "Therapists Applications",
    href: "/dashboard/admin/therapists-applications",
    icon: Network,
    color: "bg-teal-50 text-teal-600",
  },
  {
    name: "Emails",
    href: "/dashboard/admin/email-templates",
    icon: Inbox,
    color: "bg-blue-50 text-blue-600",
  },
  {
    name: "Coupons",
    href: "/dashboard/admin/coupons",
    icon: PercentCircle,
    color: "bg-orange-50 text-orange-600",
  },
  {
    name: "Users",
    href: "/dashboard/admin/users",
    icon: Users,
    color: "bg-cyan-50 text-cyan-600",
  },
  {
    name: "Payments",
    href: "/dashboard/admin/payments",
    icon: DollarSign,
    color: "bg-lime-50 text-lime-600",
  },
  {
    name: "Payments Logs",
    href: "/dashboard/admin/payout-logs",
    icon: MoneyCollectFilled,
    color: "bg-emerald-50 text-emerald-600",
  },
  {
    name: "Plans",
    href: "/dashboard/admin/plans",
    icon: FileText,
    color: "bg-amber-50 text-amber-600",
  },
  {
    name: "Manage App",
    href: "/dashboard/admin/manage",
    icon: LayoutTemplate,
    color: "bg-violet-50 text-violet-600",
  },
  {
    name: "FeedBacks",
    href: "/dashboard/admin/feedbacks",
    icon: SpeakerIcon,
    color: "bg-fuchsia-50 text-fuchsia-600",
  },
  {
    name: "Settings",
    href: "/dashboard/admin/settings",
    icon: Settings,
    color: "bg-gray-50 text-gray-600",
  },
  {
    name: "Logs",
    href: "/dashboard/admin/logs",
    icon: FileText,
    color: "bg-slate-50 text-slate-600",
  },
];

export default function Page() {
  const [isMatched, setIsMatched] = useState(false);
  const [isCardsOpen, setIsCardsOpen] = useState(() => {
    if (typeof window !== 'undefined') {
      const storedState = localStorage.getItem('isCardsOpen');
      return storedState ? JSON.parse(storedState) : true;
    }
    return true;
  });
  const [isMatchingPatientsOpen, setIsMatchingPatientsOpen] = useState(() => {
    if (typeof window !== 'undefined') {
      const storedState = localStorage.getItem('isMatchingPatientsOpen');
      return storedState ? JSON.parse(storedState) : true;
    }
    return true;
  });
  const [isAdminAppointmentsOpen, setIsAdminAppointmentsOpen] = useState(() => {
    if (typeof window !== 'undefined') {
      const storedState = localStorage.getItem('isAdminAppointmentsOpen');
      return storedState ? JSON.parse(storedState) : true;
    }
    return true;
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('isCardsOpen', JSON.stringify(isCardsOpen));
    }
  }, [isCardsOpen]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('isMatchingPatientsOpen', JSON.stringify(isMatchingPatientsOpen));
    }
  }, [isMatchingPatientsOpen]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('isAdminAppointmentsOpen', JSON.stringify(isAdminAppointmentsOpen));
    }
  }, [isAdminAppointmentsOpen]);

  const toggleCards = () => {
    setIsCardsOpen(!isCardsOpen);
  };

  const toggleMatchingPatients = () => {
    setIsMatchingPatientsOpen(!isMatchingPatientsOpen);
  };

  const toggleAdminAppointments = () => {
    setIsAdminAppointmentsOpen(!isAdminAppointmentsOpen);
  };

  return (
    <div className="space-y-6 p-4">
      {/* Quick Navigation Cards Section */}
      <div className="bg-white p-4 rounded-lg shadow-md">
        <div className="flex items-center justify-between cursor-pointer py-2" onClick={toggleCards}>
          <h2 className="text-xl font-semibold text-gray-800">Quick Navigation</h2>
          <Button variant="ghost" size="icon" aria-label="Toggle Quick Navigation Section">
            {isCardsOpen ? <ChevronUp className="h-5 w-5 text-gray-600" /> : <ChevronDown className="h-5 w-5 text-gray-600" />}
          </Button>
        </div>
        
        {isCardsOpen && (
          <div className="mt-4 border-t pt-4 border-gray-200">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {cardItems.map((item) => (
                <Link 
                  key={item.href}
                  href={item.href}
                  className={`${item.color} rounded-lg p-4 flex flex-col items-center justify-center transition-all hover:shadow-md hover:scale-[1.02] cursor-pointer`}
                >
                  <item.icon className="h-8 w-8 mb-2" />
                  <span className="text-sm font-medium text-center">{item.name}</span>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Matching Patients Section */}
      <div className="bg-white p-4 rounded-lg shadow-md">
        <div className="flex items-center justify-between cursor-pointer py-2" onClick={toggleMatchingPatients}>
          <h2 className="text-xl font-semibold text-gray-800">Match Patients</h2>
          <Button variant="ghost" size="icon" aria-label="Toggle Match Patients Section">
            {isMatchingPatientsOpen ? <ChevronUp className="h-5 w-5 text-gray-600" /> : <ChevronDown className="h-5 w-5 text-gray-600" />}
          </Button>
        </div>
        {isMatchingPatientsOpen && (
          <div className="mt-4 border-t pt-4 border-gray-200">
            <MatchingPatients setIsMatched={setIsMatched} />
          </div>
        )}
      </div>

      {/* Admin Appointments Section */}
      <div className="bg-white p-4 rounded-lg shadow-md">
        <div className="flex items-center justify-between cursor-pointer py-2" onClick={toggleAdminAppointments}>
          <h2 className="text-xl font-semibold text-gray-800">Admin Appointments</h2>
          <Button variant="ghost" size="icon" aria-label="Toggle Admin Appointments Section">
            {isAdminAppointmentsOpen ? <ChevronUp className="h-5 w-5 text-gray-600" /> : <ChevronDown className="h-5 w-5 text-gray-600" />}
          </Button>
        </div>
        {isAdminAppointmentsOpen && (
          <div className="mt-4 border-t pt-4 border-gray-200">
            <AdminAppointmentsPage setIsMatched={setIsMatched} isRefresh={isMatched} />
          </div>
        )}
        <div className="w-full flex justify-center items-center fixed bottom-0 right-0 mb-0 mr-4 px-3 mt-1 py-0 rounded-lg bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm">
          <span className="text-xs font-mono text-gray-500 dark:text-gray-400">
            version {process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0'}
          </span>
        </div>
      </div>
    </div>
  );
}