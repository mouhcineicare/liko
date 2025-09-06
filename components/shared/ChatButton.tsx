'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { MessageSquare } from 'lucide-react';
import ChatWindow from './ChatWindow';
import { useSession } from 'next-auth/react';
import { pusherClient } from '@/lib/pusher';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { generateConversationId } from '@/lib/utils/conversation';

interface ChatButtonProps {
  receiverId: string;
  initialUnreadCount?: number;
}

export default function ChatButton({ receiverId, initialUnreadCount = 0 }: ChatButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(initialUnreadCount);
  const { data: session } = useSession();
  const [conversationId, setConversationId] = useState<string | null>(null);

  useEffect(() => {
    if (!session?.user?.id) return;

    // Generate conversation ID (sorted to match backend)
    const participants = [session.user.id, receiverId].sort();
    setConversationId(participants.join('_'));

    const fetchUnreadData = async () => {
      try {
         const normalizedId = generateConversationId(
           session.user.id,
           receiverId,
           session.user.role
        );
        const res = await fetch(`/api/conversations/unread`);
        if (res.ok && normalizedId) {
          const { totalCount, conversations } = await res.json();
          const conversationCount = conversations[normalizedId] || 0;
          setUnreadCount(conversationCount);
        }
      } catch (error) {
        console.error('Failed to fetch unread count:', error);
      }
    };

    fetchUnreadData();

    const userChannel = pusherClient.subscribe(`user-${session.user.id}`);

    userChannel.bind('new-message-notification', (data: {
      conversationId: string;
      sender: { fullName: string };
      content: string;
    }) => {
      if (data.conversationId === conversationId) {
        setUnreadCount(prev => prev + 1);
        
        // Show desktop notification if chat is not open
        if (!isOpen && Notification.permission === 'granted') {
          new Notification(`New message from ${data.sender.fullName}`, {
            body: data.content.length > 30 
              ? `${data.content.substring(0, 30)}...` 
              : data.content
          });
        }
      }
    });

    userChannel.bind('unread-count-updated', (data: {
      totalCount: number;
      conversations: Record<string, number>;
    }) => {
      if (conversationId && data.conversations[conversationId] !== undefined) {
        setUnreadCount(data.conversations[conversationId]);
      }
    });

    return () => {
      userChannel.unbind_all();
      pusherClient.unsubscribe(`user-${session.user.id}`);
    };
  }, [session?.user?.id, receiverId, conversationId, isOpen]);

  const handleOpenChat = async () => {
    setIsOpen(true);
    
    // Mark messages as read when opening chat
    if (conversationId && unreadCount > 0) {
      try {
        await fetch(`/api/conversations/${conversationId}/read`, {
          method: 'POST'
        });
        setUnreadCount(0);
      } catch (error) {
        toast.error('Failed to mark messages as read');
        console.error('Error marking messages as read:', error);
      }
    }
  };

  return (
    <>
      <Button 
        variant="outline" 
        size="sm" 
        onClick={handleOpenChat}
        className="relative"
        aria-label="Open chat"
      >
        <MessageSquare className="h-4 w-4 mr-2" />
        Chat
        {unreadCount > 0 && (
          <Badge 
            className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 bg-red-600"
            aria-label={`${unreadCount} unread messages`}
          >
            {unreadCount}
          </Badge>
        )}
      </Button>
      
      {isOpen && conversationId && (
        <ChatWindow 
          conversationId={conversationId}
          receiverId={receiverId}
          onClose={() => setIsOpen(false)}
        />
      )}
    </>
  );
}