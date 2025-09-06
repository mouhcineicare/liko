"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";
import {
  Users,
  Calendar,
  Settings,
  DollarSign,
  ChevronRight,
  ClipboardList,
  BarChart,
  History,
  UserCircle,
  CalendarDays,
  Home
} from "lucide-react";
import { ExclamationCircleOutlined } from "@ant-design/icons";

interface SidebarProps {
  isCollapsed: boolean;
}

const navigation = [
  {
    name: "Dashboard",
    href: "/dashboard/therapist",
    icon: Home,
  },
  //  {
  //   name: "My Sessions",
  //   href: "/dashboard/therapist/sessions",
  //   icon: ClipboardList,
  // },
  {
    name: "My Calendar",
    href: "/dashboard/therapist/calendar",
    icon: CalendarDays,
  },
  {
    name: "My Profile",
    icon: UserCircle,
    href: "/dashboard/therapist/my-profile",
  },
  {
    name: "My History",
    href: "/dashboard/therapist/history",
    icon: History,
  },
  {
    name: "Stats",
    href: "/dashboard/therapist/stats",
    icon: BarChart,
  },
  {
    name: "Appointments Calendar",
    href: "/dashboard/therapist/appointments",
    icon: Calendar,
  },
  {
    name: "My Patients",
    href: "/dashboard/therapist/patients",
    icon: Users,
  },
  {
    name: "Payments",
    href: "/dashboard/therapist/payments",
    icon: DollarSign,
  },
  // {
  // name: 'Rejected Payouts',
  // href: '/dashboard/therapist/rejected-payouts',
  // icon: ExclamationCircleOutlined
  // },
  {
    name: "Settings",
    href: "/dashboard/therapist/settings",
    icon: Settings,
  },
];

export default function TherapistSidebar({ isCollapsed }: SidebarProps) {
  const pathname = usePathname();

  return (
    <nav className="space-y-2">
      {navigation.map((item) => (
        <Link
          key={item.href}
          href={item.href || '#'}
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