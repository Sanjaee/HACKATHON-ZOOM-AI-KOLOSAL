import { useState, useEffect, useRef, useCallback } from "react";
import { useSession } from "next-auth/react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Send, MessageSquare, Settings } from "lucide-react";
import { api } from "@/lib/api";
import { toast } from "@/hooks/use-toast";
import { parseMarkdown } from "@/utils/chatbot/markdown";

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
  } catch {
    return null;
  }
}

export default function ChatSidebar({ roomId, userId, isOpen, hideHeader = false }: ChatSidebarProps) {
  const { data: session } = useSession();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [aiStreaming, setAiStreaming] = useState(false);
  const [streamingUserId, setStreamingUserId] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null); // Base64 image for OCR
  const [aiModel, setAiModel] = useState<string>("meta-llama/llama-4-maverick-17b-128e-instruct");
  const [availableModels, setAvailableModels] = useState<Array<{id: string; name: string}>>([]);
  const [maxTokens, setMaxTokens] = useState<number>(1000);
  const [useCache, setUseCache] = useState<boolean>(false);
  const [ocrAutoFix, setOcrAutoFix] = useState<boolean>(true);
  const [ocrInvoice, setOcrInvoice] = useState<boolean>(false);
  const [settingsOpen, setSettingsOpen] = useState<boolean>(false);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isConnectingRef = useRef(false);
  const hasFetchedMessagesRef = useRef(false);
  
  // Get userId from database via JWT token (not from session.user.id which is Google ID)
  const databaseUserId = getUserIdFromToken(session?.accessToken as string) || getUserIdFromToken(api.getAccessToken()) || userId;

  // Fetch available models on mount from frontend API
  useEffect(() => {
    const fetchModels = async () => {
      try {
        const url = `/api/kolosal/model`;
        
        console.log("[ChatSidebar] Fetching models from:", url);
        const response = await fetch(url);
        
        if (response.ok) {
          const data = await response.json();
          console.log("[ChatSidebar] Models response:", data);
          
          if (data.models && Array.isArray(data.models)) {
            const mappedModels = data.models.map((m: any) => ({
              id: m.id || "",
              name: m.name || m.id || "Unknown Model"
            })).filter((m: any) => m.id); // Filter out invalid models
            
            console.log("[ChatSidebar] Mapped models:", mappedModels);
            setAvailableModels(mappedModels);
            
            // Set default model if available and current model is not in list
            if (mappedModels.length > 0) {
              const currentModelExists = mappedModels.some((m: any) => m.id === aiModel);
              if (!currentModelExists) {
                setAiModel(mappedModels[0].id);
                console.log("[ChatSidebar] Set default model to:", mappedModels[0].id);
              }
            }
          } else {
            console.warn("[ChatSidebar] Invalid models response format:", data);
          }
        } else {
          const errorText = await response.text();
          console.error("[ChatSidebar] Failed to fetch models:", response.status, errorText);
        }
      } catch (error) {
        console.error("[ChatSidebar] Error fetching models:", error);
      }
    };
    
    fetchModels();
  }, [aiModel]); // Include aiModel in dependencies to check if it exists in fetched models

  const checkIfAtBottom = useCallback(() => {
    if (!messagesContainerRef.current) return false;
    const container = messagesContainerRef.current;
    const threshold = 100;
    return container.scrollHeight - container.scrollTop - container.clientHeight < threshold;
  }, []);

  const handleScroll = useCallback(() => {
    setIsAtBottom(checkIfAtBottom());
  }, [checkIfAtBottom]);

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
      } catch {
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
    } catch {
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
        console.log("[ChatSidebar] WebSocket connected successfully:", wsUrl);
        // Clear any pending reconnect
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
          reconnectTimeoutRef.current = null;
        }
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          console.log("[ChatSidebar] WebSocket message received:", message.type, message);
          
          if (message.type === "message" && message.payload) {
            setMessages((prev: ChatMessage[]) => {
              // Avoid duplicates
              const exists = prev.some((m) => m.id === message.payload.id);
              if (exists) return prev;
              return [...prev, message.payload];
            });
          } else if (message.type === "ai_typing" && message.payload) {
            // Set streaming status - disable chat for all users
            setAiStreaming(true);
            setStreamingUserId(message.payload.user_id || null);
            console.log("[ChatSidebar] AI typing started by:", message.payload.user_id);
          } else if (message.type === "ai_stream" && message.payload) {
            // Update streaming AI message - disable chat for all users
            setAiStreaming(true);
            setStreamingUserId(message.payload.user_id || null);
            setMessages((prev: ChatMessage[]) => {
              const tempId = message.payload.id;
              const content = message.payload.content || "";
              
              // Check if temp message already exists
              const exists = prev.some((m) => m.id === tempId);
              if (exists) {
                // Update existing streaming message
                return prev.map((m) => {
                  if (m.id === tempId) {
                    return {
                      ...m,
                      message: content,
                      is_ai: true,
                      is_streaming: true,
                    };
                  }
                  return m;
                });
              } else {
                // Create new streaming message
                return [...prev, {
                  id: tempId,
                  room_id: roomId,
                  user_id: message.payload.user_id || "ai-agent",
                  user_name: message.payload.user_name || "AI Agent",
                  user_email: message.payload.user_email || "ai@agent.com",
                  message: content,
                  created_at: new Date().toISOString(),
                  is_ai: true,
                  is_streaming: true,
                }];
              }
            });
          } else if (message.type === "ai_complete" && message.payload) {
            // Mark AI message as complete and clear streaming status - enable chat again
            setAiStreaming(false);
            setStreamingUserId(null);
            setMessages((prev: ChatMessage[]) => {
              const finalMessage = message.payload.message || message.payload;
              const tempId = message.payload.temp_id;
              
              // Remove temp message and add final message
              const filtered = prev.filter((m) => !(tempId && m.id === tempId));
              
              // Check if final message already exists
              const exists = filtered.some((m) => m.id === finalMessage.id);
              if (exists) {
                // Update existing message
                return filtered.map((m) => 
                  m.id === finalMessage.id 
                    ? { ...finalMessage, is_ai: true, is_streaming: false }
                    : m
                );
              } else {
                // Add new final message
                return [...filtered, { ...finalMessage, is_ai: true, is_streaming: false }];
              }
            });
          } else if (message.type === "ai_error" && message.payload) {
            // Clear streaming status on error - enable chat again
            setAiStreaming(false);
            setStreamingUserId(null);
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
        } catch {
          // Error parsing WebSocket message
        }
      };

      ws.onerror = (error) => {
        isConnectingRef.current = false;
        console.error("[ChatSidebar] WebSocket error:", error);
        // WebSocket error - don't reconnect immediately, wait for onclose
      };

      ws.onclose = (event) => {
        isConnectingRef.current = false;
        console.log("[ChatSidebar] WebSocket closed:", {
          code: event.code,
          reason: event.reason,
          wasClean: event.wasClean,
          isOpen: isOpen,
          roomId: roomId,
          userId: userId
        });
        
        // Don't reconnect if:
        // 1. Chat is closed
        // 2. Close code indicates authentication error (4001, 4003, 1008)
        // 3. Already have a pending reconnect
        if (!isOpen) {
          console.log("[ChatSidebar] Chat is closed, not reconnecting");
          return;
        }

        // Check if it's an auth error (401)
        if (event.code === 1008 || event.code === 4001 || event.code === 4003) {
          console.log("[ChatSidebar] WebSocket closed due to auth error, not reconnecting");
          return;
        }

        // Only reconnect if connection was established before (normal close)
        // Don't reconnect if it was never opened (connection failed)
        if (event.code === 1000 || event.code === 1001) {
          // Normal closure or going away - reconnect after delay
          if (!reconnectTimeoutRef.current) {
            console.log("[ChatSidebar] Scheduling reconnect in 5 seconds...");
            reconnectTimeoutRef.current = setTimeout(() => {
              reconnectTimeoutRef.current = null;
              if (isOpen && roomId && userId) {
                console.log("[ChatSidebar] Reconnecting WebSocket...");
                connectWebSocket();
              }
            }, 5000); // Increased to 5 seconds to reduce polling
          }
        } else {
          console.log("[ChatSidebar] WebSocket closed with code", event.code, "- not reconnecting");
        }
      };
    } catch {
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

  // Scroll to bottom when chat opens
  useEffect(() => {
    if (isOpen) {
      // Defer state update to avoid cascading renders
      requestAnimationFrame(() => {
        setIsAtBottom(true);
        setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
        }, 1);
      });
    }
  }, [isOpen]);

  // Auto-scroll when new messages arrive (only if user is at bottom)
  useEffect(() => {
    if (isAtBottom) {
      requestAnimationFrame(() => {
        setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
        }, 1);
      });
    }
  }, [messages, isAtBottom]);

  // Add scroll event listener
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (container) {
      container.addEventListener("scroll", handleScroll);
      return () => {
        container.removeEventListener("scroll", handleScroll);
      };
    }
  }, [handleScroll]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || sending || aiStreaming) return;

    const messageToSend = newMessage.trim();
    const isAIRequest = messageToSend.toLowerCase().startsWith("@ai ") || messageToSend.toLowerCase().startsWith("@agen ");
    
    console.log("[ChatSidebar] Sending message:", messageToSend);
    console.log("[ChatSidebar] Is AI request:", isAIRequest);

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
        setSending(false);
        return;
      }
      
      if (isAIRequest) {
        // Handle AI request via HTTP (Kolosal API with realtime streaming)
        const aiPrompt = messageToSend.replace(/^@(ai|agen)\s+/i, "").trim();
        
        if (!aiPrompt && !selectedImage) {
          toast({
            title: "Error",
            description: "Pertanyaan AI tidak boleh kosong atau upload gambar untuk OCR",
            variant: "destructive",
          });
          setSending(false);
          return;
        }
        
        if (selectedImage && !aiPrompt) {
          // Auto-use OCR if image is selected and no prompt
          console.log("[ChatSidebar] Image selected with no prompt - using OCR mode");
        }

        // DON'T set AI streaming status here - wait for WebSocket ai_typing message
        // Backend will broadcast ai_typing via WebSocket which will disable input for all users

        try {
          // Call Kolosal API endpoint via HTTP
          // Backend will handle realtime streaming via WebSocket broadcasts
          const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "";
          const apiUrl = API_BASE_URL || window.location.origin;
          const url = `${apiUrl}/api/v1/rooms/${roomId}/kolosal`;
          
          console.log("[ChatSidebar] Requesting AI via HTTP (realtime via WebSocket):", url);
          console.log("[ChatSidebar] Prompt:", aiPrompt);
          
          const response = await fetch(url, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              prompt: aiPrompt,
              model: aiModel,
              max_tokens: maxTokens,
              cache: useCache || undefined,
              image_data: selectedImage || undefined,
              use_ocr: !!selectedImage, // Use OCR if image is provided
              ocr_language: "auto",
            }),
          });

          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Failed to call Kolosal API: ${response.status} ${errorText}`);
          }

          await response.json(); // Response is not needed - WebSocket will handle streaming
          console.log("[ChatSidebar] AI request sent successfully, waiting for WebSocket streaming...");
          
          // Clear input and image immediately - WebSocket will handle the rest
          setNewMessage("");
          setSelectedImage(null);
          
          // Note: AI message will be added/updated via WebSocket:
          // 1. ai_typing -> disables input for all users
          // 2. ai_stream -> updates streaming message for all users
          // 3. ai_complete -> finalizes message and enables input again
        } catch (error: any) {
          console.error("[ChatSidebar] Error calling Kolosal API:", error);
          toast({
            title: "Error",
            description: error.message || "Gagal memanggil Kolosal API",
            variant: "destructive",
          });
          // Clear streaming status on error (in case WebSocket didn't send error)
          setAiStreaming(false);
          setStreamingUserId(null);
        } finally {
          setSending(false);
        }
      } else {
        // Handle regular message via HTTP
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
          
          // Check if it's a conflict (AI is processing)
          if (fetchResponse.status === 409) {
            toast({
              title: "Chat dinonaktifkan",
              description: "Chat dinonaktifkan saat AI sedang memproses. Silakan tunggu sebentar.",
              variant: "destructive",
            });
          } else {
            throw new Error(`Failed to send message: ${fetchResponse.status} ${errorText}`);
          }
          return;
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
      }
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

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast({
        title: "Error",
        description: "File harus berupa gambar",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "Error",
        description: "Ukuran gambar maksimal 10MB",
        variant: "destructive",
      });
      return;
    }

    // Convert to base64
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setSelectedImage(base64);
      toast({
        title: "Gambar dipilih",
        description: "Gambar siap untuk OCR. Kirim dengan @ai untuk ekstrak teks.",
      });
    };
    reader.onerror = () => {
      toast({
        title: "Error",
        description: "Gagal membaca gambar",
        variant: "destructive",
      });
    };
    reader.readAsDataURL(file);
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
    <Card className="w-full h-full flex flex-col rounded-none p-0 bg-gray-800 border-0 shadow-none overflow-hidden">
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
              // Check if it's AI message by user_email or is_ai flag
              const isAIMessage = msg.is_ai || msg.user_email === "ai@agent.com" || msg.user_name === "AI Agent";
              
              return (
                <div
                  key={msg.id}
                  className={`flex w-full ${isOwnMessage ? "justify-end" : "justify-start"} mb-1`}
                >
                  {isAIMessage ? (
                    // PESAN AI - DI KIRI DENGAN STYLE KHUSUS
                    <div className="flex gap-2 max-w-[85%] mb-20">
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
                        <div className="rounded-2xl px-4 py-3 shadow-lg bg-gradient-to-r from-purple-600/80 to-pink-600/80 text-white rounded-tl-md">
                          <div className="text-sm leading-relaxed wrap-break-word">
                            {parseMarkdown(msg.message)}
                            {msg.is_streaming && (
                              <span className="inline-block w-2 h-2 bg-white rounded-full ml-1 animate-pulse" />
                            )}
                          </div>
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

      {/* Chat Input - Integrated with AI */}
      <div className="shrink-0 p-3 sm:p-4 border-t border-gray-700 pb-safe">
        {aiStreaming && (
          <div className="text-xs text-purple-400 mb-2 px-1 flex items-center gap-2">
            <div className="shrink-0 w-6 h-6 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 flex items-center justify-center text-xs text-white font-semibold">
              🤖
            </div>
            <span>
              {streamingUserId === databaseUserId 
                ? "AI sedang memproses permintaan Anda..." 
                : "AI sedang digunakan oleh pengguna lain. Chat dinonaktifkan..."}
            </span>
          </div>
        )}
        {selectedImage && (
          <div className="mb-2 p-2 bg-gray-700 rounded-lg flex items-center gap-2">
            <img 
              src={selectedImage} 
              alt="Selected" 
              className="w-12 h-12 object-cover rounded"
            />
            <span className="text-xs text-gray-300 flex-1">Gambar dipilih untuk OCR</span>
            <Button
              onClick={() => setSelectedImage(null)}
              size="sm"
              variant="ghost"
              className="h-6 px-2 text-xs"
            >
              Hapus
            </Button>
          </div>
        )}
        <div className="flex gap-2">
          <input
            type="file"
            ref={fileInputRef}
            accept="image/*"
            onChange={handleImageSelect}
            className="hidden"
          />
          <Button
            onClick={() => fileInputRef.current?.click()}
            size="icon"
            variant="ghost"
            className="shrink-0 h-10 w-10 bg-gray-700 hover:bg-gray-600"
            disabled={sending || aiStreaming}
            title="Upload gambar untuk OCR"
          >
            📷
          </Button>
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={aiStreaming 
              ? (streamingUserId === databaseUserId ? "AI sedang memproses..." : "Chat dinonaktifkan saat AI aktif...")
              : selectedImage 
                ? "Ketik @ai untuk ekstrak teks dari gambar..."
                : "Ketik pesan atau @ai [pertanyaan] untuk AI..."}
            className="bg-gray-700 border-gray-600 text-white placeholder:text-gray-400 text-base"
            disabled={sending || aiStreaming}
          />
          <Button
            onClick={handleSendMessage}
            disabled={!newMessage.trim() || sending || aiStreaming}
            size="icon"
            className={`shrink-0 h-10 w-10 ${
              newMessage.trim().toLowerCase().startsWith("@ai ") || newMessage.trim().toLowerCase().startsWith("@agen ")
                ? "bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                : "bg-blue-600 hover:bg-blue-700"
            }`}
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex items-center gap-2 mt-2">
          <Button
            onClick={() => setSettingsOpen(true)}
            size="sm"
            variant="ghost"
            className="text-xs text-gray-400 hover:text-white"
            disabled={sending || aiStreaming}
          >
            <Settings className="h-3 w-3 mr-1" />
            Settings
          </Button>
          {selectedImage && (
            <>
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <input
                  type="checkbox"
                  checked={ocrAutoFix}
                  onChange={(e) => setOcrAutoFix(e.target.checked)}
                  className="rounded"
                  disabled={sending || aiStreaming}
                />
                <span>Auto Fix</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <input
                  type="checkbox"
                  checked={ocrInvoice}
                  onChange={(e) => setOcrInvoice(e.target.checked)}
                  className="rounded"
                  disabled={sending || aiStreaming}
                />
                <span>Invoice</span>
              </div>
            </>
          )}
        </div>
        <div className="text-xs text-gray-500 mt-1 px-1">
          Tip: Gunakan @ai atau @agen di awal pesan untuk bertanya ke AI. Upload gambar untuk OCR.
        </div>
      </div>

      {/* Settings Dialog */}
      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="sm:max-w-[500px] bg-white/10 backdrop-blur-xl border-white/20 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-white font-semibold text-xl">AI Settings</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="model" className="text-gray-300 font-medium">Model</Label>
              <select
                id="model"
                value={aiModel}
                onChange={(e) => setAiModel(e.target.value)}
                className="mt-1 flex h-10 w-full rounded-md border border-white/20 bg-white/10 px-3 py-2 text-sm text-white ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={sending || aiStreaming}
              >
                {availableModels.length > 0 ? (
                  availableModels.map((model) => (
                    <option key={model.id} value={model.id} className="bg-gray-800 text-white">
                      {model.name}
                    </option>
                  ))
                ) : (
                  <option value="meta-llama/llama-4-maverick-17b-128e-instruct" className="bg-gray-800 text-white">Loading models...</option>
                )}
              </select>
            </div>
            <div>
              <Label htmlFor="maxTokens" className="text-gray-300 font-medium">Max Tokens</Label>
              <Input
                id="maxTokens"
                type="number"
                value={maxTokens}
                onChange={(e) => setMaxTokens(parseInt(e.target.value) || 1000)}
                min={100}
                max={4000}
                disabled={sending || aiStreaming}
                className="mt-1 bg-white/10 border-white/20 text-white placeholder:text-gray-400 focus:bg-white/15 focus:border-indigo-400 focus:ring-indigo-400/20"
              />
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="cache"
                checked={useCache}
                onChange={(e) => setUseCache(e.target.checked)}
                className="rounded"
                disabled={sending || aiStreaming}
              />
              <Label htmlFor="cache" className="cursor-pointer text-gray-300 font-medium">
                Enable Response Cache
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button 
              onClick={() => setSettingsOpen(false)}
              className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-700 hover:via-purple-700 hover:to-pink-700 text-white font-medium shadow-lg shadow-purple-500/20 hover:shadow-purple-500/40 transition-all"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

