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
  is_ai?: boolean;
  is_streaming?: boolean;
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
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isConnectingRef = useRef(false);
  const hasFetchedMessagesRef = useRef(false);
  
  // Get userId from database via JWT token (not from session.user.id which is Google ID)
  const databaseUserId = getUserIdFromToken(session?.accessToken as string) || getUserIdFromToken(api.getAccessToken()) || userId;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const fetchMessages = useCallback(async () => {
    // Prevent multiple simultaneous fetches
    if (loading) {
      return;
    }

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
    } catch (err: any) {
      console.error("[Chat] Error fetching messages:", err);
      // Don't show toast for every error to avoid spam
      setMessages((prev) => {
        if (prev.length === 0) {
          toast({
            title: "Error",
            description: "Gagal memuat pesan",
            variant: "destructive",
          });
        }
        return prev;
      });
    } finally {
      setLoading(false);
    }
  }, [roomId, loading]);

  const connectWebSocket = useCallback(() => {
    // Prevent multiple simultaneous connections
    if (isConnectingRef.current || (wsRef.current && wsRef.current.readyState === WebSocket.OPEN)) {
      return;
    }

    if (!roomId || !userId || !isOpen) {
      return;
    }

    const token = api.getAccessToken();
    if (!token) {
      return;
    }

    // Check if token is expired
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const exp = payload.exp * 1000; // Convert to milliseconds
      if (Date.now() >= exp) {
        console.log("[Chat] Token expired, not connecting WebSocket");
        return;
      }
    } catch (error) {
      // If can't parse token, continue anyway
    }

    isConnectingRef.current = true;

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

    try {
      // Close existing connection if any
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }

      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        isConnectingRef.current = false;
        // Clear any pending reconnect
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
          reconnectTimeoutRef.current = null;
        }
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          
          if (message.type === "message" && message.payload) {
            setMessages((prev: ChatMessage[]) => {
              // Avoid duplicates
              const exists = prev.some((m) => m.id === message.payload.id);
              if (exists) return prev;
              return [...prev, message.payload];
            });
          } else if (message.type === "ai_typing" && message.payload) {
            // Add AI typing indicator
            setMessages((prev: ChatMessage[]) => {
              const exists = prev.some((m) => m.id === message.payload.id);
              if (exists) return prev;
              return [...prev, { ...message.payload, is_ai: true, is_streaming: true }];
            });
          } else if (message.type === "ai_stream" && message.payload) {
            // Update streaming AI message
            setMessages((prev: ChatMessage[]) => {
              return prev.map((m) => {
                if (m.id === message.payload.id) {
                  return { ...message.payload, is_ai: true, is_streaming: true };
                }
                return m;
              });
            });
          } else if (message.type === "ai_complete" && message.payload) {
            // Mark AI message as complete
            setMessages((prev: ChatMessage[]) => {
              return prev.map((m) => {
                if (m.id === message.payload.id) {
                  return { ...message.payload, is_ai: true, is_streaming: false };
                }
                return m;
              });
            });
          } else if (message.type === "ai_error" && message.payload) {
            // Show AI error message
            setMessages((prev: ChatMessage[]) => {
              const exists = prev.some((m) => m.id === message.payload.id);
              if (exists) {
                return prev.map((m) => {
                  if (m.id === message.payload.id) {
                    return { ...message.payload, is_ai: true, is_streaming: false };
                  }
                  return m;
                });
              }
              return [...prev, { ...message.payload, is_ai: true, is_streaming: false }];
            });
          }
        } catch (error) {
          // Error parsing WebSocket message
        }
      };

      ws.onerror = (error) => {
        isConnectingRef.current = false;
        // WebSocket error - don't reconnect immediately, wait for onclose
      };

      ws.onclose = (event) => {
        isConnectingRef.current = false;
        
        // Don't reconnect if:
        // 1. Chat is closed
        // 2. Close code indicates authentication error (4001, 4003, 1008)
        // 3. Already have a pending reconnect
        if (!isOpen) {
          return;
        }

        // Check if it's an auth error (401)
        if (event.code === 1008 || event.code === 4001 || event.code === 4003) {
          console.log("[Chat] WebSocket closed due to auth error, not reconnecting");
          return;
        }

        // Only reconnect if connection was established before (normal close)
        // Don't reconnect if it was never opened (connection failed)
        if (event.code === 1000 || event.code === 1001) {
          // Normal closure or going away - reconnect after delay
          if (!reconnectTimeoutRef.current) {
            reconnectTimeoutRef.current = setTimeout(() => {
              reconnectTimeoutRef.current = null;
              if (isOpen && roomId && userId) {
                connectWebSocket();
              }
            }, 5000); // Increased to 5 seconds to reduce polling
          }
        }
      };
    } catch (error) {
      isConnectingRef.current = false;
      // Error connecting WebSocket
    }
  }, [roomId, userId, isOpen]);

  // Track previous roomId to detect changes
  const prevRoomIdRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    const prevRoomId = prevRoomIdRef.current;
    const currentRoomId = roomId;
    
    // Reset fetch flag and close WebSocket if roomId changed
    if (prevRoomId !== undefined && prevRoomId !== currentRoomId) {
      hasFetchedMessagesRef.current = false;
      // Close existing WebSocket when roomId changes
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      // Clear reconnect timeout
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
    }
    
    // Update ref
    prevRoomIdRef.current = currentRoomId;

    if (isOpen && roomId) {
      // Only fetch messages once when chat opens or roomId changes
      if (!hasFetchedMessagesRef.current) {
        fetchMessages();
        hasFetchedMessagesRef.current = true;
      }
      
      // Connect WebSocket only if not already connected
      if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
        connectWebSocket();
      }
    } else {
      // Reset flag when chat closes
      hasFetchedMessagesRef.current = false;
    }

    return () => {
      // Clear reconnect timeout
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      
      // Close WebSocket when chat closes (not when roomId changes, handled above)
      if (!isOpen && wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      isConnectingRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, roomId]); // fetchMessages and connectWebSocket are stable callbacks, no need to include

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || sending) return;

    const messageToSend = newMessage.trim();
    console.log("[ChatSidebar] Sending message:", messageToSend);
    console.log("[ChatSidebar] Contains @agen:", messageToSend.toLowerCase().includes("@agen"));

    try {
      setSending(true);
      const token = api.getAccessToken();
      
      if (!token) {
        console.error("[ChatSidebar] ERROR: No access token");
        toast({
          title: "Error",
          description: "Token tidak ditemukan. Silakan login ulang.",
          variant: "destructive",
        });
        return;
      }
      
      // Use API_BASE_URL from environment or fallback to current host
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "";
      const apiUrl = API_BASE_URL || window.location.origin;
      const url = `${apiUrl}/api/v1/rooms/${roomId}/messages`;
      
      console.log("[ChatSidebar] POST URL:", url);
      console.log("[ChatSidebar] Request body:", { message: messageToSend });
      
      const fetchResponse = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ message: messageToSend }),
      });

      console.log("[ChatSidebar] Response status:", fetchResponse.status);
      console.log("[ChatSidebar] Response ok:", fetchResponse.ok);

      if (!fetchResponse.ok) {
        const errorText = await fetchResponse.text();
        console.error("[ChatSidebar] Response error:", errorText);
        throw new Error(`Failed to send message: ${fetchResponse.status} ${errorText}`);
      }

      const responseData = await fetchResponse.json();
      console.log("[ChatSidebar] Response data:", responseData);
      
      const messageData = responseData.data || responseData;

      if (messageData) {
        console.log("[ChatSidebar] Message created:", messageData.id);
        setMessages((prev: ChatMessage[]) => {
          const exists = prev.some((m: ChatMessage) => m.id === messageData.id);
          if (exists) return prev;
          return [...prev, messageData];
        });
      }

      setNewMessage("");
      console.log("[ChatSidebar] Message sent successfully");
    } catch (error: any) {
      console.error("[ChatSidebar] Error sending message:", error);
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
              const isAIMessage = msg.is_ai || msg.user_id === "ai-agent";
              
              return (
                <div
                  key={msg.id}
                  className={`flex w-full ${isOwnMessage ? "justify-end" : "justify-start"} mb-1`}
                >
                  {isAIMessage ? (
                    // PESAN AI - DI KIRI DENGAN STYLE KHUSUS
                    <div className="flex gap-2 max-w-[85%]">
                      {/* Avatar AI */}
                      <div className="shrink-0 w-8 h-8 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 flex items-center justify-center text-xs text-white font-semibold">
                        🤖
                      </div>
                      
                      {/* Container pesan AI */}
                      <div className="flex flex-col items-start">
                        {/* Nama AI */}
                        <span className="text-xs text-purple-400 mb-1 px-1 font-semibold">
                          {msg.user_name || "AI Agent"}
                        </span>
                        
                        {/* Bubble pesan AI - GRADIENT */}
                        <div className="rounded-2xl px-4 py-2 shadow-lg bg-gradient-to-r from-purple-600/80 to-pink-600/80 text-white rounded-tl-md">
                          <p className="text-sm leading-relaxed whitespace-pre-wrap wrap-break-word">
                            {msg.message}
                            {msg.is_streaming && (
                              <span className="inline-block w-2 h-2 bg-white rounded-full ml-1 animate-pulse" />
                            )}
                          </p>
                        </div>
                        
                        {/* Waktu */}
                        <span className="text-xs text-gray-500 mt-0.5 px-1">
                          {formatTime(msg.created_at)}
                        </span>
                      </div>
                    </div>
                  ) : isOwnMessage ? (
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

