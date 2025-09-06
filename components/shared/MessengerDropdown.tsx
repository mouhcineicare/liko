'use client';

import { useState, useEffect } from 'react';
import { MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useSession } from 'next-auth/react';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { pusherClient } from '@/lib/pusher';
import { toast } from 'sonner';

interface Conversation {
  id: string;
  otherUser: {
    _id: string;
    fullName: string;
    image?: string;
    role: string;
  };
  lastMessage: {
    content: string;
    createdAt: string;
    read: boolean;
  };
  unreadCount: number;
}

interface MessengerDropdownProps {
  onChatSelect: (conversationId: string) => void;
  activeConversationId?: string | null;
}

export function MessengerDropdown({ onChatSelect, activeConversationId }: MessengerDropdownProps) {
  const [open, setOpen] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [unreadTotal, setUnreadTotal] = useState(0);
  const { data: session } = useSession();

  const fetchConversations = async () => {
    try {
      const res = await fetch('/api/conversations');
      if (res.ok) {
        const data = await res.json();
        setConversations(data.conversations || []);
        setUnreadTotal(data.unreadTotal || 0);
      }
    } catch (error) {
      console.error('Failed to fetch conversations', error);
    }
  };

 useEffect(() => {
    if (!session?.user?.id) return;

    fetchConversations();

    const channel = pusherClient.subscribe(`user-${session.user.id}`);
    
    channel.bind('new-message-notification', fetchConversations);
    channel.bind('unread-count-updated', fetchConversations);

    return () => {
      channel.unbind_all();
      pusherClient.unsubscribe(`user-${session.user.id}`);
    };
  }, [session?.user?.id]);

  const handleConversationClick = async (conversationId: string) => {
    try {
      await fetch(`/api/conversations/${conversationId}/read`, {
        method: 'POST'
      });
      onChatSelect(conversationId);
      setOpen(false);
    } catch (error) {
      toast.error('Failed to mark messages as read');
      console.error('Error marking messages as read:', error);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <MessageSquare className="h-5 w-5" />
          {unreadTotal > 0 && (
            <Badge className="absolute bg-red-600 -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0">
              {unreadTotal > 9 ? '9+' : unreadTotal}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex flex-col">
          <div className="p-3 border-b">
            <h3 className="font-semibold">Messages</h3>
          </div>
          
          <div className="max-h-[400px] overflow-y-auto">
            {conversations.length === 0 ? (
              <div className="p-4 text-center text-sm text-gray-500">
                No messages yet
              </div>
            ) : (
              conversations.map(conversation => (
                <div 
                  key={conversation.id}
                  onClick={() => handleConversationClick(conversation.id)}
                  className={`flex items-start gap-3 p-3 hover:bg-gray-50 border-b cursor-pointer ${
                    conversation.id === activeConversationId ? 'bg-blue-50' : ''
                  }`}
                >
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={conversation?.otherUser.image} />
                    <AvatarFallback>
                      {conversation.otherUser.fullName?.charAt(0) ?? 'U'}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between">
                      <h4 className="font-medium truncate">
                        {conversation.otherUser.fullName}
                      </h4>
                      <span className="text-xs text-gray-500">
                        {new Date(conversation.lastMessage.createdAt).toLocaleTimeString([], { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 truncate">
                      {conversation.lastMessage.content}
                    </p>
                  </div>
                  
                  {conversation.unreadCount > 0 && (
                    <div className="bg-blue-500 text-white rounded-full h-5 w-5 flex items-center justify-center text-xs">
                      {conversation.unreadCount > 9 ? '9+' : conversation.unreadCount}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}