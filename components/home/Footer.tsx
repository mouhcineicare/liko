"use client";

import Link from "next/link";
import { HeartPulse, Instagram, Send, Youtube, Linkedin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

const mainNavItems = [
  { name: "About Us", href: "/about" },
  { name: "FAQ", href: "/faq" },
  { name: "Refund Policy", href: "/refund" },
  { name: "Contact", href: "/contact" },
];

const socialLinks = [
  {
    name: "Instagram",
    href: "https://www.instagram.com/icarewellbeing?igsh=bjB4NWVnamsxMmtx",
    icon: Instagram,
  },
  {
    name: "Youtube",
    href: "https://youtube.com/@icarewellbeing?si=5ehFUVLNwJVy3MUz",
    icon: Youtube,
  },
  {
    name: "LinkedIn",
    href: "https://www.linkedin.com/company/icarewellbeing/",
    icon: Linkedin,
  },
  {
    name: "Email",
    href: "mailto:Heal@icarewellbeing.com",
    icon: Send,
  },
];

export function Footer() {
  return (
    <footer className="bg-gray-50 border-t text-gray-700">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">

        {/* Emergency Alert */}
        <div className="bg-red-50 border border-red-200 text-red-800 px-6 py-4 rounded-xl shadow-sm mb-12 flex items-start space-x-3">
  <AlertTriangle className="w-5 h-5 mt-1 text-red-500" />
  <p className="text-sm leading-relaxed">
    <strong className="font-semibold">Important:</strong> Don’t use our service in case of emergency. If you&apos;re in immediate danger or need urgent help, please contact your local emergency services.
  </p>
</div>

        <div className="py-16 grid grid-cols-1 md:grid-cols-3 gap-10">
          {/* Logo and Description */}
          <div className="space-y-4">
            <Link href="/" className="flex items-center space-x-2">
              <HeartPulse className="h-8 w-8 text-blue-600" />
              <span className="text-xl font-bold text-gray-900">
                IcareWellBeing
              </span>
            </Link>
            <p className="text-gray-600 max-w-xs text-sm">
              Professional online therapy services connecting you with licensed therapists for better mental health and wellbeing.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4">
              Quick Links
            </h3>
            <ul className="space-y-3">
              {mainNavItems.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="text-base text-gray-600 hover:text-blue-600 transition-colors"
                  >
                    {item.name}
                  </Link>
                </li>
              ))}
              <li>
                <Link
                  href="/book-appointment"
                  className="text-base text-blue-600 hover:text-blue-700 font-medium"
                >
                  Book Appointment
                </Link>
              </li>
            </ul>
          </div>

          {/* Connect */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4">
              Connect With Us
            </h3>
            <div className="flex space-x-4 mb-6">
              {socialLinks.map((social) => (
                <Button
                  key={social.name}
                  variant="ghost"
                  size="icon"
                  asChild
                  className="hover:bg-blue-100 hover:text-blue-600 transition-colors"
                >
                  <a
                    href={social.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={social.name}
                  >
                    <social.icon className="h-5 w-5" />
                  </a>
                </Button>
              ))}
            </div>
            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-2">
                Working Hours
              </h4>
              <p className="text-gray-600 text-sm">24/7 Support</p>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-gray-200 py-6 flex flex-col md:flex-row justify-between items-center">
          <p className="text-sm text-gray-500">
            © {new Date().getFullYear()} IcareWellBeing. All rights reserved.
          </p>
          <div className="flex space-x-6 mt-4 md:mt-0">
            <Link
              href="/privacy"
              className="text-sm text-gray-500 hover:text-gray-900"
            >
              Privacy Policy
            </Link>
            <Link
              href="/terms"
              className="text-sm text-gray-500 hover:text-gray-900"
            >
              Terms of Service
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
