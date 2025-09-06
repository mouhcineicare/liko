"use client";

import Link from "next/link";
import { MainNav } from "./MainNav";
import { UserNav } from "./UserNav";
import { HeartPulse } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { signIn, signOut, useSession } from "next-auth/react";
import { cn } from "@/lib/utils";
import { NotificationBell } from "./NotificationBell";
import { MessengerDropdown } from './MessengerDropdown';
import { useSearchParams, useRouter } from "next/navigation";
import ChatWindow from "./ChatWindow";
import { pusherClient } from "@/lib/pusher";
import { toast } from "sonner";
import { normalizeConversationId } from "@/lib/utils/conversation";
import Image from "next/image";
import ImpersonationAlert from "./ImpersonationAlert";

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { data: session } = useSession();
  const [activeChat, setActiveChat] = useState<string | null>(null);
  const searchParams = useSearchParams();
  const router = useRouter();

  // Handle chat opening from URL
  useEffect(() => {
    const conversationId = searchParams.get('conversationId');
    if (conversationId) {
      setActiveChat(conversationId);
    }
  }, [searchParams]);

  // Subscribe to real-time notifications
useEffect(() => {
    if (!session?.user?.id) return;

    const userChannel = pusherClient.subscribe(`user-${session.user.id}`);

   const handleNewMessage = (data: {
      conversationId: string;
      sender: { fullName: string };
      content: string;
    }) => {
      // Force update of unread counts
      router.refresh();

      const conversationId = normalizeConversationId(
           data.conversationId,
            session.user.id,
           session.user.role
      );
      
      if (!activeChat || activeChat !== conversationId) {
        toast.message(`New message from ${data.sender.fullName}`, {
          description: data.content.length > 50 
            ? `${data.content.substring(0, 50)}...` 
            : data.content,
          action: {
            label: 'View',
            onClick: () => {
              setActiveChat(conversationId);
              router.push(`?conversationId=${conversationId}`);
            }
          }
        });
      }
    };

    userChannel.bind('new-message-notification', handleNewMessage);
    userChannel.bind('unread-count-updated', () => router.refresh());

    return () => {
      userChannel.unbind_all();
      pusherClient.unsubscribe(`user-${session.user.id}`);
    };
  }, [session?.user?.id, activeChat, router]);


  const handleCloseChat = () => {
    setActiveChat(null);
    // Remove conversationId from URL without reload
    const newUrl = new URL(window.location.href);
    newUrl.searchParams.delete('conversationId');
    window.history.replaceState({}, '', newUrl.toString());
  };

const handleOpenChat = (conversationId: string) => {
  if (!session?.user?.id) return;

  // Normalize conversation ID format
  const normalizedId = normalizeConversationId(
    conversationId,
    session?.user?.id,
    session?.user?.role
  );

  setActiveChat(normalizedId);
  const newUrl = new URL(window.location.href);
  newUrl.searchParams.set('conversationId', normalizedId);
  window.history.pushState({}, '', newUrl.toString());
};

  return (
    <>
      <ImpersonationAlert />

      <header className="sticky top-0 z-50 w-full border-b bg-white">
        <div className="container flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center space-x-2">
            {/* <HeartPulse className="h-8 w-8 sm:h-8 sm:w-8 text-blue-600" /> */}
            <Image
              src="/assets/img/icarelogo.png"
              alt="iCare Wellbeing"
              className="h-10 w-10 sm:h-14 sm:w-14"
              width={55}
              height={55}
            />
            <span className="text-lg sm:text-xl font-bold">iCare Wellbeing</span>
          </Link>
          
          <div className="flex items-center space-x-4">
            {/* Desktop navigation */}
            <div className="hidden md:flex items-center space-x-4">
              <MainNav />
              {session && (
                <div className="flex flex-row items-center space-x-4">
                  <NotificationBell />
                  <MessengerDropdown
                    onChatSelect={handleOpenChat} 
                    activeConversationId={activeChat}
                  />
                </div>
              )}
              <UserNav />
            </div>
            
            {/* Mobile menu button */}
            <Button
              variant="ghost"
              size="sm"
              className="md:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                {mobileMenuOpen ? (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                ) : (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                )}
              </svg>
            </Button>
          </div>
        </div>
        
        {/* Mobile menu */}
        <div className={cn(
          "md:hidden bg-white border-t border-gray-200 transition-all duration-300 ease-in-out overflow-hidden",
          mobileMenuOpen ? "max-h-screen" : "max-h-0"
        )}>
          <div className="container py-4 flex flex-col space-y-4 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 64px)' }}>
            <MainNav isMobile={true} />
            {!session && (
              <div className="flex flex-col space-y-3 pt-2 border-t border-gray-100">
                <Link
                  href="/book-appointment"
                  className="w-full py-2 px-4 bg-blue-600 text-white text-center rounded-md hover:bg-blue-700 transition-colors"
                >
                  Book An Appointment
                </Link>
                <Link
                  href="/auth/signin"
                  className="w-full py-2 px-4 border border-blue-600 text-blue-600 text-center rounded-md hover:bg-blue-50 transition-colors"
                >
                  Sign In
                </Link>
              </div>
            )}
            {session && (
              <div className="pt-2 border-t border-gray-100 space-y-4">
                <div className="flex flex-row">
                  <NotificationBell />
                  <MessengerDropdown 
                    onChatSelect={handleOpenChat} 
                    activeConversationId={activeChat}
                  />
                </div>
                <UserNav isMobile={true} />
              </div>
            )}
          </div>
        </div>
      </header>
      
     {activeChat && (
        <ChatWindow
          conversationId={activeChat}
          receiverId={activeChat.split('_').find(id => id !== session?.user?.id) || ''}
          onClose={handleCloseChat}
         />
   )}
    </>
  );
}