'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send, X } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { pusherClient } from '@/lib/pusher';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { toast } from 'sonner';
import { normalizeConversationId } from '@/lib/utils/conversation';

interface Participant {
  _id: string;
  fullName: string;
  image?: string;
  role: string;
}

interface Message {
  _id: string;
  conversationId: string;
  sender: Participant;
  receiver: Participant;
  content: string;
  read: boolean;
  createdAt: string;
  updatedAt: string;
}

interface ChatWindowProps {
  conversationId: string;
  receiverId: string;
  onClose: () => void;
}

export default function ChatWindow({ conversationId, receiverId, onClose }: ChatWindowProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const { data: session, status } = useSession();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const fetchMessages = useCallback(async () => {
    if (!conversationId || status !== 'authenticated') {
      setIsLoading(false);
      return;
    }

     const normalizedId = normalizeConversationId(
       conversationId,
       session.user.id,
       session.user.role
    );

    setIsLoading(true);
    try {
      const res = await fetch(`/api/conversations/${normalizedId}?t=${Date.now()}`); // Cache busting

      if (!res.ok) {
        throw new Error(`Failed to fetch messages: ${res.status}`);
      }
      
      const data = await res.json();
      
      if (!Array.isArray(data?.messages)) {
        throw new Error('Invalid messages data format');
      }

      setMessages(data.messages);

      // Mark messages as read if needed
      if (data.messages.some((msg: any) => 
        msg.receiver?._id?.toString() === session?.user?.id && !msg.read
      )) {
        await fetch(`/api/conversations/${normalizedId}/read`, {
          method: 'POST'
        });
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
      toast.error('Failed to load messages. Please try again.');
      setMessages([]);
    } finally {
      setIsLoading(false);
    }
  }, [conversationId, session?.user?.id, status]);

  useEffect(() => {
    // Reset messages when conversation changes
    setMessages([]);
    fetchMessages();
  }, [conversationId, fetchMessages]);

  useEffect(() => {
    if (!conversationId || !session?.user?.id) return;

    const normalizedId = normalizeConversationId(
       conversationId,
       session.user.id,
       session.user.role
    );

    const channel = pusherClient.subscribe(`conversation-${normalizedId}`);

    const handleNewMessage = (message: Message) => {
      setMessages(prev => [...prev, message]);
      scrollToBottom();
    };

    channel.bind('new-message', handleNewMessage);

    return () => {
      channel.unbind('new-message', handleNewMessage);
      pusherClient.unsubscribe(`conversation-${normalizedId}`);
    };
  }, [conversationId, session?.user?.id]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async () => {
    const messageContent = newMessage.trim();
    if (!messageContent || !session?.user?.id || isSending) return;

    setIsSending(true);
    try {
      const normalizedId = normalizeConversationId(
        conversationId,
        session.user.id,
        session.user.role
      );
      const res = await fetch(`/api/conversations/${normalizedId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          content: messageContent
        }),
      });

      if (!res.ok) throw new Error('Failed to send message');
      
      setNewMessage('');
    } catch (error) {
      toast.error('Failed to send message');
      console.error('Failed to send message:', error);
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="fixed bottom-4 right-4 w-80 h-96 bg-white rounded-lg shadow-lg border flex flex-col z-50">
      <div className="flex items-center justify-between p-3 border-b">
        <h3 className="font-medium">Chat</h3>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={onClose}
          aria-label="Close chat"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
      
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            Loading messages...
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-500">
            No messages yet. Start the conversation!
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message._id}
              className={`flex ${message.sender._id === session?.user?.id ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-xs p-2 rounded-lg ${message.sender._id === session?.user?.id ? 'bg-blue-500 text-white' : 'bg-gray-100'}`}
              >
                {message.sender._id !== session?.user?.id && (
                  <div className="flex items-center gap-2 mb-1">
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={message.sender.image} />
                      <AvatarFallback>
                        {message.sender.fullName.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-xs font-medium">
                      {message.sender.fullName}
                    </span>
                  </div>
                )}
                <p className="text-sm">{message.content}</p>
                <div className="flex justify-between items-center mt-1">
                  <span className="text-xs opacity-70">
                    {new Date(message.createdAt).toLocaleTimeString([], { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
                  </span>
                  {message.sender._id === session?.user?.id && (
                    <span className="text-xs ml-2">
                      {message.read ? '✓✓' : '✓'}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>
      
      <div className="p-3 border-t flex gap-2">
        <Input
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Type a message..."
          onKeyDown={handleKeyDown}
          disabled={isSending}
        />
        <Button 
          size="sm" 
          onClick={handleSendMessage}
          disabled={!newMessage.trim() || isSending}
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}