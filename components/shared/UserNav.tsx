"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Settings, LogOut, User, LayoutDashboard, MessageSquare, Calendar, CreditCard } from "lucide-react";

interface UserNavProps {
  isMobile?: boolean;
  onLinkClick?: () => void; // Callback to close mobile menu
}

export function UserNav({ isMobile = false, onLinkClick }: UserNavProps) {
  const { data: session } = useSession();
  const router = useRouter();

  if (!session?.user) return null;

  const handleSignOut = async () => {
    // Save the accept cookies setting before clearing localStorage
    const cookiesAccepted = localStorage.getItem('cookiesAccepted');
    
    // Clear all localStorage except the cookies acceptance
    localStorage.clear();
    if (cookiesAccepted) {
      localStorage.setItem('cookiesAccepted', cookiesAccepted);
    }
  
    // Clear all cookies
    document.cookie.split(";").forEach(function(c) {
      document.cookie = c
        .replace(/^ +/, "")
        .replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
    });
  
    // Perform sign out
    await signOut({
      redirect: true,
      callbackUrl: "/"
    });
    
    onLinkClick?.();
  };

  const getDashboardLink = () => {
    switch (session.user.role) {
      case "patient": return "/dashboard/patient";
      case "therapist": return "/dashboard/therapist";
      case "admin": return "/dashboard/admin";
      default: return "/dashboard";
    }
  };

  const handleNavigation = (path: string) => {
    router.push(path);
    onLinkClick?.();
  };

  const menuItems = [
    {
      icon: <LayoutDashboard className="mr-2 h-4 w-4" />,
      label: "Dashboard",
      onClick: () => handleNavigation(getDashboardLink())
    },
    {
      icon: <Calendar className="mr-2 h-4 w-4" />,
      label: "Appointments",
      onClick: () => handleNavigation(`${getDashboardLink()}/appointments`)
    },
    {
      icon: <MessageSquare className="mr-2 h-4 w-4" />,
      label: "Messages",
      onClick: () => handleNavigation(`${getDashboardLink()}/messages`)
    },
    {
      icon: <CreditCard className="mr-2 h-4 w-4" />,
      label: "Payments",
      onClick: () => handleNavigation(`${getDashboardLink()}/payments`)
    },
    {
      icon: <Settings className="mr-2 h-4 w-4" />,
      label: "Settings",
      onClick: () => handleNavigation(`${getDashboardLink()}/settings`)
    }
  ];

  // Mobile view - full height scrollable menu
  if (isMobile) {
    return (
      <div className="w-full">
        <div className="flex items-center space-x-3 px-4 py-3 border-b sticky top-0 bg-white z-10">
          <Avatar className="h-9 w-9">
            <AvatarImage 
              src={session.user.image || undefined}
              alt={session.user.name || "User avatar"} 
            />
            <AvatarFallback>
              <User className="h-5 w-5" />
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col">
            <span className="font-medium">{session.user.name}</span>
            <span className="text-sm text-gray-500">{session.user.email}</span>
          </div>
        </div>
        
        {/* Remove max-height constraint and let parent handle scrolling */}
        <div className="space-y-1 px-2 py-1">
          {menuItems.map((item, index) => (
            <Button
              key={index}
              variant="ghost"
              className="w-full justify-start px-3"
              onClick={item.onClick}
            >
              {item.icon}
              {item.label}
            </Button>
          ))}
          
          <Button
            variant="ghost"
            className="w-full justify-start px-3 text-red-600 hover:text-red-700 hover:bg-red-50"
            onClick={handleSignOut}
          >
            <LogOut className="mr-2 h-4 w-4" />
            Sign out
          </Button>
        </div>
      </div>
    );
  }

  // Desktop dropdown menu (unchanged)
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-9 w-9 rounded-full">
          <Avatar className="h-9 w-9">
            <AvatarImage 
              src={session.user.image || undefined}
              alt={session.user.name || "User avatar"} 
            />
            <AvatarFallback>
              <User className="h-5 w-5" />
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="px-4 py-3">
          <div className="flex flex-col">
            <p className="font-medium">{session.user.name}</p>
            <p className="text-sm text-gray-500">
              {session.user.email}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          {menuItems.map((item, index) => (
            <DropdownMenuItem 
              key={index}
              onClick={item.onClick}
              className="px-4 py-2"
            >
              {item.icon}
              {item.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem 
          onClick={handleSignOut} 
          className="px-4 py-2 text-red-600 focus:text-red-700 focus:bg-red-50"
        >
          <LogOut className="mr-2 h-4 w-4" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}