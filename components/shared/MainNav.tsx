"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { cn } from "@/lib/utils";
import { usePathname } from "next/navigation";

const mainNavItems = [
  { name: "About Us", href: "/about" },
  { name: "FAQ", href: "/faq" },
  { name: "Contact", href: "/contact" },
  { name: "therapist Profiles", href: "/therapist-profiles" },
];

interface MainNavProps {
  isMobile?: boolean;
}

export function MainNav({ isMobile = false }: MainNavProps) {
  const pathname = usePathname();
  const { data: session } = useSession();

  return (
    <nav className={cn(
      "flex",
      isMobile ? "flex-col space-y-3" : "items-center space-x-6"
    )}>
      {mainNavItems.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={cn(
            "text-sm font-medium transition-colors hover:text-blue-600",
            pathname === item.href ? "text-blue-600" : "text-gray-600",
            isMobile && "py-1"
          )}
        >
          {item.name}
        </Link>
      ))}
      
      {/* Only show these links in desktop mode - they're handled separately in mobile */}
      {!session && (
        <>
          <Link
            href="/book-appointment"
            className="text-sm font-medium text-white bg-blue-600 px-3 py-2 rounded hover:bg-blue-700"
          >
            Book An Appointment
          </Link>
          <Link
            href="/auth/signin"
            className="text-sm font-medium text-blue-600 hover:text-blue-700"
          >
            Sign In
          </Link>
        </>
      )}
    </nav>
  );
}