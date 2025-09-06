"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Calendar,
  Users,
  Settings,
  DollarSign,
  FileText,
  LayoutTemplate,
  ChevronRight,
  Shuffle,
  MagnetIcon,
  BarChart,
  Network,
  Inbox,
  ListChecks,
  MessageCircle,
  PercentCircle,
  SpeakerIcon,
  TestTube
} from "lucide-react";
import { MoneyCollectFilled } from "@ant-design/icons";

interface SidebarProps {
  isCollapsed: boolean;
}

const navigation = [
  {
    name: "Dashboard",
    href: "/dashboard/admin",
    icon: LayoutDashboard,
  },
  {
    name: "Stats",
    href: "/dashboard/admin/stats",
    icon: BarChart,
  },
  {
    name: "Match Patients",
    href: "/dashboard/admin/match-patients",
    icon: ListChecks,
  },
  {
    name: "Matching",
    href: "/dashboard/admin/matching",
    icon: MagnetIcon,
  },
  {
    name: "ChatBot",
    href: "/dashboard/admin/chatbot",
    icon: MessageCircle,
  },
  {
    name: "Therapy Changes",
    href: "/dashboard/admin/therapy-changes",
    icon: Shuffle,
  },
  {
    name: "Appointments",
    href: "/dashboard/admin/appointments",
    icon: Calendar,
  },
  {
    name: "Therapists Applications",
    href: "/dashboard/admin/therapists-applications",
    icon: Network,
  },
  {
    name: "Emails",
    href: "/dashboard/admin/emails/enhanced",
    icon: Inbox,
  },
  {
    name: "Email Analytics",
    href: "/dashboard/admin/emails/analytics",
    icon: BarChart,
  },
  {
    name: "Test Email Analytics",
    href: "/dashboard/admin/emails/test-analytics",
    icon: TestTube,
  },
  {
    name: "Coupons",
    href: "/dashboard/admin/coupons",
    icon: PercentCircle,
  },
  {
    name: "Users",
    href: "/dashboard/admin/users",
    icon: Users,
  },
  {
    name: "Payments",
    href: "/dashboard/admin/payments",
    icon: DollarSign,
  },
  {
    name: "Payments Logs",
    href: "/dashboard/admin/payout-logs",
    icon: MoneyCollectFilled,
  },
  {
    name: "Plans",
    href: "/dashboard/admin/plans",
    icon: FileText,
  },
  {
    name: "Manage App",
    href: "/dashboard/admin/manage",
    icon: LayoutTemplate,
  },
  {
    name: "FeedBacks",
    href: "/dashboard/admin/feedbacks",
    icon: SpeakerIcon,
  },
  {
    name: "Settings",
    href: "/dashboard/admin/settings",
    icon: Settings,
  },
  {
    name: "Logs",
    href: "/dashboard/admin/logs",
    icon: FileText,
  },
];

export default function AdminSidebar({ isCollapsed }: SidebarProps) {
  const pathname = usePathname();

  return (
    <nav className="space-y-2 overflow-y-auto max-h-full overflow-hidden">
      {navigation.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={cn(
            "flex items-center gap-x-3 rounded-lg px-3 py-2 text-sm transition-all hover:bg-gray-100",
            pathname === item.href
              ? "bg-blue-50 text-blue-600"
              : "text-gray-700 hover:text-blue-600",
            isCollapsed && "justify-center px-2"
          )}
        >
          <item.icon
            className={cn(
              "h-5 w-5",
              pathname === item.href
                ? "text-blue-600"
                : "text-gray-400"
            )}
          />
          {!isCollapsed && (
            <>
              <span className="flex-1">{item.name}</span>
              <ChevronRight
                className={cn(
                  "h-4 w-4",
                  pathname === item.href
                    ? "text-blue-600"
                    : "text-gray-400"
                )}
              />
            </>
          )}
        </Link>
      ))}
    </nav>
  );
}