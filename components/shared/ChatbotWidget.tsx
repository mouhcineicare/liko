'use client';
import { useState, useEffect } from 'react';
import Image from 'next/image';
import { PaperPlaneIcon, Cross2Icon, TrashIcon } from '@radix-ui/react-icons';

interface ChatMessage {
  sender: string;
  text: string;
  timestamp?: number;
}

export default function ChatbotWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  // Load messages from localStorage on component mount
  useEffect(() => {
    const savedChat = localStorage.getItem('chatbot_conversation');
    if (savedChat) {
      const parsedChat = JSON.parse(savedChat);
      
      // Check if conversation is older than 1 hour (3600000 ms)
      if (parsedChat.timestamp && Date.now() - parsedChat.timestamp > 3600000) {
        localStorage.removeItem('chatbot_conversation');
        return;
      }
      
      setMessages(parsedChat.messages || []);
    }
  }, []);

  // Save messages to localStorage whenever they change
  useEffect(() => {
    if (messages.length > 0) {
      const conversation = {
        messages,
        timestamp: Date.now()
      };
      localStorage.setItem('chatbot_conversation', JSON.stringify(conversation));
    }
  }, [messages]);

  // Add welcome message when chat opens
  useEffect(() => {
    if (open && !messages.some(msg => msg.text === 'Need assistance? How can I help you today?')) {
      const botMessage = { 
        sender: 'bot', 
        text: 'Need assistance? How can I help you today?',
        timestamp: Date.now()
      };
      setMessages((prev) => [...prev, botMessage]);
    }
  }, [open, messages]);

  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMessage = { 
      sender: 'user', 
      text: input,
      timestamp: Date.now()
    };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);

    try {
      const res = await fetch('/api/chatbot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: input }),
      });

      const data = await res.json();
      const botMessage = { 
        sender: 'bot', 
        text: data.response,
        timestamp: Date.now()
      };

      setMessages((prev) => [...prev, botMessage]);
    } catch (error) {
      const errorMessage = { 
        sender: 'bot', 
        text: 'Sorry, I encountered an error. Please try again.',
        timestamp: Date.now()
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  const clearConversation = () => {
    if (showClearConfirm) {
      localStorage.removeItem('chatbot_conversation');
      setMessages([]);
      setShowClearConfirm(false);
      
      // Add new welcome message if chat is open
      if (open) {
        const botMessage = { 
          sender: 'bot', 
          text: 'Need assistance? How can I help you today?',
          timestamp: Date.now()
        };
        setMessages([botMessage]);
      }
    } else {
      setShowClearConfirm(true);
      // Auto-hide confirmation after 3 seconds
      setTimeout(() => setShowClearConfirm(false), 3000);
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {!open && (
        <div className="relative">
          <div className="absolute top-0 left-[-55px] max-h-20 transform -translate-x-1/2 bg-gray-200 text-sm p-1 rounded-md animate-pulse">
            Need assistance? How can I help you today?
          </div>
          <Image
            src="https://png.pngtree.com/png-clipart/20241117/original/pngtree-a-3d-supporting-robot-cartoon-png-image_17107529.png"
            alt="Virtual Assistant"
            width={100}
            height={100}
            className="cursor-pointer hover:scale-105 transition"
            onClick={() => setOpen(true)}
          />
        </div>
      )}

      {open && (
        <div className="bg-white w-80 h-96 shadow-xl rounded-xl flex flex-col">
          <div className="p-2 border-b flex justify-between items-center">
            <span className="font-san-serif font-semibold text-sm text-gray-500">
              iCareWellBeing Assistant
            </span>
            <div className="flex items-center space-x-2">
              <button
                onClick={clearConversation}
                className="text-gray-500 hover:text-red-500 transition"
                title={showClearConfirm ? "Confirm clear" : "Clear conversation"}
              >
                <TrashIcon />
              </button>
              <button
                className="text-gray-500 hover:text-gray-700 transition"
                onClick={() => setOpen(false)}
                title="Close chat"
              >
                <Cross2Icon />
              </button>
            </div>
          </div>

          {showClearConfirm && (
            <div className="bg-yellow-100 text-yellow-800 text-xs p-1 text-center">
              Click trash icon again to clear conversation
            </div>
          )}

          <div className="flex-1 overflow-y-auto p-2 space-y-2">
            {messages.map((msg, idx) => (
              <div key={idx} className={msg.sender === 'user' ? 'text-right' : 'text-left'}>
                <span
                  className={`inline-block px-2 py-1 text-sm rounded-md max-w-[80%] break-words ${
                    msg.sender === 'user' 
                      ? 'bg-blue-100 text-blue-900' 
                      : 'bg-gray-100 text-gray-900'
                  }`}
                >
                  {msg.text}
                </span>
                <div className={`text-xs text-gray-400 mt-1 ${
                  msg.sender === 'user' ? 'text-right' : 'text-left'
                }`}>
                  {new Date(msg.timestamp || Date.now()).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </div>
              </div>
            ))}

            {isTyping && (
              <div className="text-left">
                <span className="inline-block px-2 py-1 rounded-md bg-gray-100 text-sm">
                  <span className="inline-block h-2 w-2 bg-gray-400 rounded-full mr-1 animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="inline-block h-2 w-2 bg-gray-400 rounded-full mr-1 animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="inline-block h-2 w-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </span>
              </div>
            )}
          </div>

          <div className="p-2 border-t flex">
            <input
              className="flex-1 border rounded-md px-2 min-h-10 text-sm py-1 focus:outline-none focus:ring-1 focus:ring-blue-300"
              placeholder="Ask me anything..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
            />
            <button 
              onClick={sendMessage} 
              className="ml-2 bg-blue-500 text-white p-2 rounded-md hover:bg-blue-600 transition"
              disabled={!input.trim()}
            >
              <PaperPlaneIcon />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}