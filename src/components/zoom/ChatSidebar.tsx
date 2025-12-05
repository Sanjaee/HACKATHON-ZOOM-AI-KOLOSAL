import { useState, useEffect, useRef, useCallback } from "react";
import { useSession } from "next-auth/react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Send, MessageSquare } from "lucide-react";
import { api } from "@/lib/api";
import { toast } from "@/hooks/use-toast";

interface ChatMessage {
  id: string;
  room_id: string;
  user_id: string;
  user_name: string;
  user_email: string;
  message: string;
  created_at: string;
}

interface ChatSidebarProps {
  roomId: string;
  userId: string;
  isOpen: boolean;
  hideHeader?: boolean; // Optional: hide header when used in modal
}

// Helper function to decode JWT token and get userId from database
function getUserIdFromToken(token: string | null): string | null {
  if (!token) return null;
  
  try {
    // JWT token structure: header.payload.signature
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    
    // Decode payload (base64)
    const payload = JSON.parse(atob(parts[1]));
    
    // Return userId from token (this is the database ID)
    return payload.userId || payload.user_id || payload.sub || null;
  } catch (error) {
    console.error("[Chat] Error decoding token:", error);
    return null;
  }
}

export default function ChatSidebar({ roomId, userId, isOpen, hideHeader = false }: ChatSidebarProps) {
  const { data: session } = useSession();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  
  // Get userId from database via JWT token (not from session.user.id which is Google ID)
  const databaseUserId = getUserIdFromToken(session?.accessToken as string) || getUserIdFromToken(api.getAccessToken()) || userId;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const fetchMessages = useCallback(async () => {
    try {
      setLoading(true);
      const token = api.getAccessToken();
      if (!token) {
        throw new Error("No access token");
      }

      // Use API_BASE_URL from environment or fallback to current host
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "";
      const apiUrl = API_BASE_URL || window.location.origin;
      
      const response = await fetch(`${apiUrl}/api/v1/rooms/${roomId}/messages`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch messages");
      }

      const data = await response.json();
      setMessages(data.data || []);
    } catch (error: any) {
      console.error("Error fetching messages:", error);
      toast({
        title: "Error",
        description: "Gagal memuat pesan",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [roomId]);

  const connectWebSocket = useCallback(() => {
    if (!roomId || !userId) return;

    const token = api.getAccessToken();
    if (!token) {
      console.error("No access token for WebSocket");
      return;
    }

    // Use API_BASE_URL for WebSocket (works with both development and production)
    const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "";
    let wsUrl: string;
    
    if (API_BASE_URL) {
      // Use API_BASE_URL if available (development: http://localhost:5000)
      const apiUrl = new URL(API_BASE_URL);
      const wsProtocol = apiUrl.protocol === "https:" ? "wss:" : "ws:";
      wsUrl = `${wsProtocol}//${apiUrl.host}/api/v1/rooms/${roomId}/chat/ws?token=${encodeURIComponent(token)}`;
    } else {
      // Fallback to current window location (production with nginx proxy)
      const wsProtocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const wsHost = window.location.host;
      wsUrl = `${wsProtocol}//${wsHost}/api/v1/rooms/${roomId}/chat/ws?token=${encodeURIComponent(token)}`;
    }

    console.log("[WS] Attempting to connect to:", wsUrl.replace(/token=[^&]*/, "token=***"));

    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log("[WS] WebSocket connected successfully for chat");
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          
          if (message.type === "message" && message.payload) {
            setMessages((prev) => {
              // Avoid duplicates
              const exists = prev.some((m) => m.id === message.payload.id);
              if (exists) return prev;
              return [...prev, message.payload];
            });
          }
        } catch (error) {
          console.error("Error parsing WebSocket message:", error);
        }
      };

      ws.onerror = (error) => {
        console.error("[WS] WebSocket error:", error);
        console.error("[WS] Error details:", {
          readyState: ws.readyState,
          url: wsUrl.replace(/token=[^&]*/, "token=***"),
        });
      };

      ws.onclose = (event) => {
        console.log("[WS] WebSocket disconnected:", {
          code: event.code,
          reason: event.reason,
          wasClean: event.wasClean,
        });
        // Reconnect after 3 seconds
        setTimeout(() => {
          if (isOpen) {
            connectWebSocket();
          }
        }, 3000);
      };
    } catch (error) {
      console.error("Error connecting WebSocket:", error);
    }
  }, [roomId, userId, isOpen]);

  useEffect(() => {
    if (isOpen && roomId) {
      fetchMessages();
      connectWebSocket();
    }

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [isOpen, roomId, fetchMessages, connectWebSocket]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || sending) return;

    try {
      setSending(true);
      const token = api.getAccessToken();
      
      // Use API_BASE_URL from environment or fallback to current host
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "";
      const apiUrl = API_BASE_URL || window.location.origin;
      
      const fetchResponse = await fetch(`${apiUrl}/api/v1/rooms/${roomId}/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ message: newMessage.trim() }),
      });

      if (!fetchResponse.ok) {
        throw new Error("Failed to send message");
      }

      const responseData = await fetchResponse.json();
      const messageData = responseData.data || responseData;

      if (messageData) {
        setMessages((prev) => {
          const exists = prev.some((m) => m.id === messageData.id);
          if (exists) return prev;
          return [...prev, messageData];
        });
      }

      setNewMessage("");
    } catch (error: any) {
      console.error("Error sending message:", error);
      toast({
        title: "Error",
        description: error.message || "Gagal mengirim pesan",
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return "Baru saja";
    if (diffMins < 60) return `${diffMins}m yang lalu`;
    
    return date.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
  };

  if (!isOpen) return null;

  return (
    <Card className="w-full h-[73vh] flex flex-col rounded-none p-0 bg-gray-800 border-0 shadow-none overflow-hidden">
      {/* Header - Hidden on mobile modal */}
      {!hideHeader && (
        <div className="shrink-0 p-4 border-b border-gray-700 hidden md:block">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-gray-300" />
            <h3 className="text-lg font-semibold text-white">Chat</h3>
          </div>
        </div>
      )}

      {/* Messages - Flex-1 untuk mengambil sisa space, overflow-y-auto untuk scroll internal */}
      <div 
        className="flex-1 overflow-y-auto p-4 min-h-0 chat-scrollbar" 
        ref={messagesContainerRef}
      >
        {loading ? (
          <div className="text-center text-gray-400 py-8">Memuat pesan...</div>
        ) : messages.length === 0 ? (
          <div className="text-center text-gray-400 py-8">Belum ada pesan</div>
        ) : (
          <div className="space-y-3">
            {messages.map((msg) => {
              // Validasi: gunakan databaseUserId dari JWT token (bukan session.user.id yang Google ID)
              // Jika databaseUserId === msg.user_id maka itu pesan sendiri (di kanan)
              // Sebaliknya jika tidak sama maka pesan orang lain (di kiri)
              const messageUserId = String(msg.user_id || "").trim();
              const currentUser = String(databaseUserId || "").trim();
              const isOwnMessage = currentUser !== "" && currentUser === messageUserId;
              
              // Debug logging untuk memastikan validasi bekerja
              if (messages.indexOf(msg) < 3) {
                console.log("[Chat Debug]", {
                  databaseUserId: currentUser,
                  messageUserId,
                  isOwnMessage,
                  msgUserName: msg.user_name,
                  sessionGoogleId: session?.user?.id,
                  userIdProp: userId,
                  match: currentUser === messageUserId,
                  tokenUserId: getUserIdFromToken(session?.accessToken as string || api.getAccessToken()),
                  usingToken: "✅ Menggunakan userId dari JWT token (database ID)"
                });
              }
              
              return (
                <div
                  key={msg.id}
                  className={`flex w-full ${isOwnMessage ? "justify-end" : "justify-start"} mb-1`}
                >
                  {isOwnMessage ? (
                    // PESAN SENDIRI - DI KANAN
                    <div className="flex flex-col items-end max-w-[85%]">
                      {/* Bubble pesan sendiri - BIRU di KANAN */}
                      <div className="rounded-2xl px-4 py-2 shadow-lg bg-blue-600 text-white rounded-tr-md">
                        <p className="text-sm leading-relaxed whitespace-pre-wrap wrap-break-word">
                          {msg.message}
                        </p>
                      </div>
                      
                      {/* Waktu */}
                      <span className="text-xs text-gray-500 mt-0.5 px-1">
                        {formatTime(msg.created_at)}
                      </span>
                    </div>
                  ) : (
                    // PESAN ORANG LAIN - DI KIRI
                    <div className="flex gap-2 max-w-[85%]">
                      {/* Avatar untuk pesan orang lain */}
                      <div className="shrink-0 w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center text-xs text-white font-semibold">
                        {(msg.user_name || "U").charAt(0).toUpperCase()}
                      </div>
                      
                      {/* Container pesan */}
                      <div className="flex flex-col items-start">
                        {/* Nama pengirim */}
                        <span className="text-xs text-gray-400 mb-1 px-1">
                          {msg.user_name}
                        </span>
                        
                        {/* Bubble pesan orang lain - ABU-ABU di KIRI */}
                        <div className="rounded-2xl px-4 py-2 shadow-lg bg-gray-700 text-gray-100 rounded-tl-md">
                          <p className="text-sm leading-relaxed whitespace-pre-wrap wrap-break-word">
                            {msg.message}
                          </p>
                        </div>
                        
                        {/* Waktu */}
                        <span className="text-xs text-gray-500 mt-0.5 px-1">
                          {formatTime(msg.created_at)}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input */}
      <div className="shrink-0 p-3 sm:p-4 border-t border-gray-700 pb-safe">
        <div className="flex gap-2">
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ketik pesan..."
            className="bg-gray-700 border-gray-600 text-white placeholder:text-gray-400 text-base"
            disabled={sending}
          />
          <Button
            onClick={handleSendMessage}
            disabled={!newMessage.trim() || sending}
            size="icon"
            className="bg-blue-600 hover:bg-blue-700 shrink-0 h-10 w-10"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
}

