import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/router";
import { useSession } from "next-auth/react";
import { api, TokenManager } from "@/lib/api";
import type { JoinRoomResponse } from "@/types/room";
import { Room, RemoteParticipant, RoomEvent, Track } from "livekit-client";
import Navbar from "@/components/general/Navbar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { Mic, MicOff, Video, VideoOff, PhoneOff, Users, MessageSquare, X, SwitchCamera, Monitor, MonitorOff } from "lucide-react";
import ChatSidebar from "@/components/zoom/ChatSidebar";

export default function ZoomCallPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const { roomId } = router.query;
  const [room, setRoom] = useState<Room | null>(null);
  const [participants, setParticipants] = useState<Map<string, RemoteParticipant>>(new Map());
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [chatOpen, setChatOpen] = useState(false); // Default closed on mobile
  const [isMobile, setIsMobile] = useState(false);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user"); // Front/back camera
  const [isSwitchingCamera, setIsSwitchingCamera] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [screenShareTrack, setScreenShareTrack] = useState<MediaStreamTrack | null>(null);
  
  const videoElementsRef = useRef<Map<string, HTMLVideoElement>>(new Map());
  const screenShareElementsRef = useRef<Map<string, HTMLVideoElement>>(new Map());
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const localScreenShareRef = useRef<HTMLVideoElement>(null);
  const isJoiningRef = useRef(false);
  const hasJoinedRef = useRef(false);

  // Detect mobile screen
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
      // Auto open chat on desktop, close on mobile
      if (window.innerWidth >= 768) {
        setChatOpen(true);
      }
    };
    
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const attachTrack = useCallback((track: Track, participant: RemoteParticipant) => {
    if (track.kind === "video") {
      // Check if this is a screen share track
      const publication = participant.getTrackPublication(track.source);
      const isScreenShare = publication?.source === Track.Source.ScreenShare;

      if (isScreenShare) {
        // Handle screen share track
        let screenShareEl = screenShareElementsRef.current.get(participant.identity);
        if (!screenShareEl) {
          screenShareEl = document.createElement("video");
          screenShareEl.autoplay = true;
          screenShareEl.playsInline = true;
          screenShareEl.className = "w-full h-full object-contain";
          screenShareEl.style.width = "100%";
          screenShareEl.style.height = "100%";
          screenShareEl.style.objectFit = "contain";
          screenShareEl.style.display = "block";
          screenShareElementsRef.current.set(participant.identity, screenShareEl);
        }
        track.attach(screenShareEl);
      } else {
        // Handle camera track
        let videoEl = videoElementsRef.current.get(participant.identity);
        if (!videoEl) {
          videoEl = document.createElement("video");
          videoEl.autoplay = true;
          videoEl.playsInline = true;
          videoEl.className = "w-full h-full object-cover rounded-lg";
          videoEl.style.width = "100%";
          videoEl.style.height = "100%";
          videoEl.style.objectFit = "cover";
          videoEl.style.display = "block";
          videoElementsRef.current.set(participant.identity, videoEl);
        }
        track.attach(videoEl);
      }
    } else if (track.kind === "audio") {
      const audioEl = track.attach();
      document.body.appendChild(audioEl);
    }
  }, []);

  const joinRoom = useCallback(async (id: string) => {
    // Prevent multiple simultaneous joins
    if (isJoiningRef.current || hasJoinedRef.current) {
      console.log("[DEBUG] Already joining or joined, skipping...");
      return;
    }

    // Check if already connected
    if (room && room.state === "connected") {
      console.log("[DEBUG] Already connected to room");
      setLoading(false);
      return;
    }

    isJoiningRef.current = true;

    try {
      console.log("[DEBUG] Starting joinRoom for room:", id);
      setLoading(true);
      setError(null);

      // Disconnect existing room if any
      if (room) {
        console.log("[DEBUG] Disconnecting existing room...");
        try {
          await room.disconnect();
        } catch (e) {
          console.warn("[DEBUG] Error disconnecting existing room:", e);
        }
      }

      // Get token from session or localStorage
      let token: string | null = null;
      
      if (session?.accessToken) {
        token = session.accessToken as string;
        console.log("[DEBUG] Using token from NextAuth session");
        // Save to localStorage for API client
        if (session.refreshToken) {
          TokenManager.setTokens(token, session.refreshToken as string);
        }
      } else {
        token = TokenManager.getAccessToken();
        console.log("[DEBUG] Using token from localStorage");
      }
      
      console.log("[DEBUG] Access token exists:", !!token);
      if (!token) {
        throw new Error("No access token found. Please login again.");
      }
      
      // Set token to API client
      api.setAccessToken(token);

      // Get join token from backend
      console.log("[DEBUG] Calling API joinRoom...");
      const data = await api.joinRoom(id) as JoinRoomResponse;
      console.log("[DEBUG] Join room response received:", { 
        hasToken: !!data.token, 
        url: data.url,
        roomId: data.room?.id 
      });

      // Connect to LiveKit room
      console.log("[DEBUG] Creating Room instance...");
      const newRoom = new Room({
        adaptiveStream: true,
        dynacast: true,
      });

      // Set up event listeners
      console.log("[DEBUG] Setting up room listeners...");
      
      // Participant connected
      newRoom.on(RoomEvent.ParticipantConnected, (participant) => {
        console.log("Participant connected:", participant.identity);
        setParticipants((prev) => {
          const newMap = new Map(prev);
          newMap.set(participant.identity, participant);
          return newMap;
        });
      });

      // Participant disconnected
      newRoom.on(RoomEvent.ParticipantDisconnected, (participant) => {
        console.log("Participant disconnected:", participant.identity);
        setParticipants((prev) => {
          const newMap = new Map(prev);
          newMap.delete(participant.identity);
          return newMap;
        });
        // Status is checked directly from participant in render, no need to remove separately
        // Remove video element
        const videoEl = videoElementsRef.current.get(participant.identity);
        if (videoEl) {
          videoEl.srcObject = null;
          videoElementsRef.current.delete(participant.identity);
        }
        // Remove screen share element
        const screenShareEl = screenShareElementsRef.current.get(participant.identity);
        if (screenShareEl) {
          screenShareEl.srcObject = null;
          screenShareElementsRef.current.delete(participant.identity);
        }
      });

      // Track subscribed
      newRoom.on(RoomEvent.TrackSubscribed, (track, publication, participant) => {
        console.log("Track subscribed:", track.kind, participant.identity);
        attachTrack(track, participant);
        
        // Update participants map if not already there
        setParticipants((prev) => {
          const newMap = new Map(prev);
          if (!newMap.has(participant.identity)) {
            newMap.set(participant.identity, participant);
          }
          return newMap;
        });

        // Status is checked directly from participant in render, no need to store separately
      });

      // Local track published
      newRoom.on(RoomEvent.LocalTrackPublished, (publication) => {
        console.log("Local track published:", publication.kind, publication.source);
        if (publication.kind === "video" && publication.track) {
          if (publication.source === Track.Source.ScreenShare) {
            // Handle screen share - only attach if not already attached via srcObject
            console.log("[DEBUG] Screen share track published");
            if (localScreenShareRef.current && !localScreenShareRef.current.srcObject) {
              try {
                publication.track.attach(localScreenShareRef.current);
                console.log("[DEBUG] Screen share track attached via LiveKit attach()");
              } catch (err) {
                console.error("[DEBUG] Error attaching screen share track:", err);
              }
            }
            setIsScreenSharing(true);
          } else if (publication.source === Track.Source.Camera && localVideoRef.current) {
            // Handle camera
            publication.track.attach(localVideoRef.current);
            setIsCameraOff(!newRoom.localParticipant.isCameraEnabled);
          }
        }
        // Update state based on actual track state
        if (publication.kind === "audio") {
          setIsMicMuted(!newRoom.localParticipant.isMicrophoneEnabled);
        }
      });

      // Local track unpublished
      newRoom.on(RoomEvent.LocalTrackUnpublished, (publication) => {
        console.log("Local track unpublished:", publication.kind, publication.source);
        // Update state based on actual LiveKit state
        setIsMicMuted(!newRoom.localParticipant.isMicrophoneEnabled);
        setIsCameraOff(!newRoom.localParticipant.isCameraEnabled);
        
        // Detach video element when camera or screen share is unpublished
        if (publication.kind === "video") {
          if (publication.source === Track.Source.ScreenShare) {
            // Handle screen share
            if (publication.track && localScreenShareRef.current) {
              publication.track.detach();
            }
            if (localScreenShareRef.current) {
              localScreenShareRef.current.srcObject = null;
            }
            setIsScreenSharing(false);
            setScreenShareTrack(null);
          } else if (publication.source === Track.Source.Camera) {
            // Handle camera
            if (publication.track && localVideoRef.current) {
              publication.track.detach();
            }
            if (localVideoRef.current) {
              localVideoRef.current.srcObject = null;
            }
          }
        }
      });

      // Track unsubscribed
      newRoom.on(RoomEvent.TrackUnsubscribed, (track) => {
        track.detach();
        // Status is checked directly from participant in render
      });

      // Status is checked directly from participant in render, no need for event handlers

      // Connect to room
      console.log("[DEBUG] Connecting to LiveKit:", { url: data.url, hasToken: !!data.token });
      await newRoom.connect(data.url, data.token);
      console.log("[DEBUG] Successfully connected to LiveKit room");
      
      // Get existing participants in the room
      const existingParticipants = new Map<string, RemoteParticipant>();
      newRoom.remoteParticipants.forEach((participant) => {
        console.log("[DEBUG] Found existing participant:", participant.identity);
        existingParticipants.set(participant.identity, participant);
        
        // Attach existing tracks
        participant.trackPublications.forEach((publication) => {
          if (publication.track) {
            console.log("[DEBUG] Attaching existing track:", publication.kind, participant.identity);
            attachTrack(publication.track, participant);
          }
        });
      });
      setParticipants(existingParticipants);
      
      setRoom(newRoom);
      hasJoinedRef.current = true;
      setLoading(false);

      // Try to enable camera and microphone, but don't fail if permission denied
      try {
        await newRoom.localParticipant.enableCameraAndMicrophone();
        // Update state based on actual LiveKit state
        setIsMicMuted(!newRoom.localParticipant.isMicrophoneEnabled);
        setIsCameraOff(!newRoom.localParticipant.isCameraEnabled);
        console.log("[DEBUG] Camera and microphone enabled");
      } catch (err: any) {
        console.warn("[DEBUG] Could not enable camera/microphone:", err);
        // Don't show error toast, just continue without camera/mic
        // Update state based on actual LiveKit state
        setIsMicMuted(!newRoom.localParticipant.isMicrophoneEnabled);
        setIsCameraOff(!newRoom.localParticipant.isCameraEnabled);
        // User can manually enable later
      }
    } catch (err: any) {
      console.error("[ERROR] Error joining room:", err);
      console.error("[ERROR] Error details:", {
        message: err.message,
        stack: err.stack,
        response: err.response,
      });
      const errorMessage = err.message || err.response?.data?.message || "Gagal bergabung ke room";
      setError(errorMessage);
      setLoading(false);
      hasJoinedRef.current = false;
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      
      // Don't redirect automatically, let user see the error
      // Only redirect if it's an auth error
      if (err.response?.status === 401 || err.message?.includes("token") || err.message?.includes("authenticated")) {
        console.log("[DEBUG] Auth error detected, redirecting to login...");
        setTimeout(() => {
          router.push("/auth/login");
        }, 2000);
      }
    } finally {
      isJoiningRef.current = false;
    }
  }, [attachTrack, session, room, router]);

  // Sync state with LiveKit participant state
  useEffect(() => {
    if (!room || room.state !== "connected") return;

    // Initial sync
    setIsMicMuted(!room.localParticipant.isMicrophoneEnabled);
    setIsCameraOff(!room.localParticipant.isCameraEnabled);

    // Set up interval to periodically sync state (fallback)
    // This ensures UI stays in sync with actual LiveKit state
    const syncInterval = setInterval(() => {
      if (room && room.state === "connected") {
        setIsMicMuted(() => !room.localParticipant.isMicrophoneEnabled);
        setIsCameraOff(() => !room.localParticipant.isCameraEnabled);
      }
    }, 500); // Check every 500ms

    return () => {
      clearInterval(syncInterval);
    };
  }, [room]);

  useEffect(() => {
    console.log("[DEBUG] useEffect triggered, roomId:", roomId, "session status:", status);
    
    // Wait for session to load
    if (status === "loading") {
      console.log("[DEBUG] Session loading, waiting...");
      return;
    }

    if (!roomId || typeof roomId !== "string") {
      console.log("[DEBUG] Invalid roomId, waiting...");
      return;
    }

    // Prevent multiple joins
    if (hasJoinedRef.current || isJoiningRef.current) {
      console.log("[DEBUG] Already joined or joining, skipping...");
      return;
    }

    // Check for token from NextAuth session first, then localStorage
    let token: string | null = null;
    
    if (session?.accessToken) {
      token = session.accessToken as string;
      console.log("[DEBUG] Token from NextAuth session");
      // Also save to localStorage for API client
      if (session.refreshToken) {
        TokenManager.setTokens(token, session.refreshToken as string);
      }
    } else {
      token = TokenManager.getAccessToken();
      console.log("[DEBUG] Token from localStorage");
    }

    console.log("[DEBUG] Token check:", { hasToken: !!token, roomId, hasSession: !!session });
    
    if (!token) {
      console.log("[DEBUG] No token found, redirecting to login");
      router.push("/auth/login?callbackUrl=" + encodeURIComponent(`/zoom/${roomId}`));
      return;
    }

    console.log("[DEBUG] Setting access token and joining room");
    api.setAccessToken(token);
    joinRoom(roomId);

    return () => {
      // Cleanup on unmount
      if (room && room.state === "connected") {
        console.log("[DEBUG] Cleaning up room on unmount");
        room.disconnect().catch(console.error);
      }
      hasJoinedRef.current = false;
      isJoiningRef.current = false;
    };
  }, [roomId, router, session, status]); // Removed joinRoom and room from dependencies to prevent loops

  const toggleMic = async () => {
    if (!room || room.state !== "connected") return;
    
    try {
      // Get current state from LiveKit
      const currentlyEnabled = room.localParticipant.isMicrophoneEnabled;
      const newEnabledState = !currentlyEnabled;
      
      console.log("[DEBUG] Toggling mic:", { currentlyEnabled, newEnabledState });
      
      // Toggle microphone
      await room.localParticipant.setMicrophoneEnabled(newEnabledState);
      
      // Update state based on actual LiveKit state after toggle
      setIsMicMuted(!room.localParticipant.isMicrophoneEnabled);
      
      console.log("[DEBUG] Mic state after toggle:", room.localParticipant.isMicrophoneEnabled);
    } catch (err: any) {
      console.error("Error toggling microphone:", err);
      
      // Update state based on actual LiveKit state (might not have changed)
      if (room) {
        setIsMicMuted(!room.localParticipant.isMicrophoneEnabled);
      }
      
      // Don't show error if permission denied, just update state
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        toast({
          title: "Izin Diperlukan",
          description: "Izin mikrofon diperlukan untuk menggunakan fitur ini",
          variant: "default",
        });
      } else {
        toast({
          title: "Error",
          description: "Tidak dapat mengakses mikrofon",
          variant: "destructive",
        });
      }
    }
  };

  const toggleCamera = async () => {
    if (!room || room.state !== "connected") return;
    
    try {
      // Get current state from LiveKit
      const currentlyEnabled = room.localParticipant.isCameraEnabled;
      const newEnabledState = !currentlyEnabled;
      
      console.log("[DEBUG] Toggling camera:", { currentlyEnabled, newEnabledState });
      
      // Toggle camera
      await room.localParticipant.setCameraEnabled(newEnabledState);
      
      // Update state based on actual LiveKit state after toggle
      setIsCameraOff(!room.localParticipant.isCameraEnabled);
      
      // Attach/detach video element
      if (room.localParticipant.isCameraEnabled && localVideoRef.current) {
        const videoPublication = room.localParticipant.getTrackPublication(Track.Source.Camera);
        if (videoPublication?.track) {
          videoPublication.track.attach(localVideoRef.current);
        }
      } else if (localVideoRef.current) {
        // Clear video element when camera is off
        localVideoRef.current.srcObject = null;
      }
      
      console.log("[DEBUG] Camera state after toggle:", room.localParticipant.isCameraEnabled);
    } catch (err: any) {
      console.error("Error toggling camera:", err);
      
      // Update state based on actual LiveKit state (might not have changed)
      if (room) {
        setIsCameraOff(!room.localParticipant.isCameraEnabled);
      }
      
      // Don't show error if permission denied, just update state
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        toast({
          title: "Izin Diperlukan",
          description: "Izin kamera diperlukan untuk menggunakan fitur ini",
          variant: "default",
        });
      } else {
        toast({
          title: "Error",
          description: "Tidak dapat mengakses kamera",
          variant: "destructive",
        });
      }
    }
  };

  // Switch between front and back camera
  const switchCamera = async () => {
    if (!room || room.state !== "connected" || isSwitchingCamera) return;
    
    // Only allow switching if camera is currently enabled
    if (!room.localParticipant.isCameraEnabled) {
      toast({
        title: "Kamera Mati",
        description: "Nyalakan kamera terlebih dahulu untuk switch",
        variant: "default",
      });
      return;
    }

    try {
      setIsSwitchingCamera(true);
      
      // Determine new facing mode
      const newFacingMode = facingMode === "user" ? "environment" : "user";
      
      console.log("[DEBUG] Switching camera from", facingMode, "to", newFacingMode);
      
      // Get the current video track
      const currentVideoPublication = room.localParticipant.getTrackPublication(Track.Source.Camera);
      
      // Stop and unpublish current video track
      if (currentVideoPublication?.track) {
        currentVideoPublication.track.detach();
        await room.localParticipant.unpublishTrack(currentVideoPublication.track);
      }
      
      // Create new video track with different facing mode
      const videoTrack = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { exact: newFacingMode },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });
      
      // Publish new track
      const newTrack = videoTrack.getVideoTracks()[0];
      await room.localParticipant.publishTrack(newTrack, {
        name: "camera",
        source: Track.Source.Camera,
      });
      
      // Attach to local video element
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = videoTrack;
      }
      
      // Update state
      setFacingMode(newFacingMode);
      setIsCameraOff(false);
      
      console.log("[DEBUG] Camera switched to", newFacingMode);
      
      toast({
        title: "Kamera Diubah",
        description: newFacingMode === "user" ? "Kamera depan aktif" : "Kamera belakang aktif",
      });
    } catch (err: any) {
      console.error("Error switching camera:", err);
      
      // If exact facingMode fails, try without exact constraint
      if (err.name === "OverconstrainedError") {
        try {
          const newFacingMode = facingMode === "user" ? "environment" : "user";
          
          const videoTrack = await navigator.mediaDevices.getUserMedia({
            video: {
              facingMode: newFacingMode, // Without 'exact'
              width: { ideal: 1280 },
              height: { ideal: 720 },
            },
          });
          
          const newTrack = videoTrack.getVideoTracks()[0];
          await room.localParticipant.publishTrack(newTrack, {
            name: "camera",
            source: Track.Source.Camera,
          });
          
          if (localVideoRef.current) {
            localVideoRef.current.srcObject = videoTrack;
          }
          
          setFacingMode(newFacingMode);
          setIsCameraOff(false);
          
          toast({
            title: "Kamera Diubah",
            description: newFacingMode === "user" ? "Kamera depan aktif" : "Kamera belakang aktif",
          });
        } catch (fallbackErr: any) {
          console.error("Fallback camera switch failed:", fallbackErr);
          toast({
            title: "Tidak Dapat Mengganti Kamera",
            description: "Perangkat tidak mendukung switch kamera",
            variant: "destructive",
          });
          
          // Re-enable the original camera
          try {
            await room.localParticipant.setCameraEnabled(true);
          } catch (e) {
            console.error("Failed to re-enable camera:", e);
          }
        }
      } else {
        toast({
          title: "Error",
          description: "Gagal mengganti kamera",
          variant: "destructive",
        });
        
        // Re-enable the original camera
        try {
          await room.localParticipant.setCameraEnabled(true);
        } catch (e) {
          console.error("Failed to re-enable camera:", e);
        }
      }
    } finally {
      setIsSwitchingCamera(false);
    }
  };

  // Toggle screen sharing
  const toggleScreenShare = async () => {
    if (!room || room.state !== "connected") return;

    try {
      if (isScreenSharing) {
        // Stop screen sharing
        console.log("[DEBUG] Stopping screen share");
        
        // Unpublish screen share track
        const screenSharePublication = room.localParticipant.getTrackPublication(Track.Source.ScreenShare);
        if (screenSharePublication?.track) {
          // Store track reference before unpublishing
          const track = screenSharePublication.track;
          await room.localParticipant.unpublishTrack(track);
          // Stop track after unpublishing
          if (track.stop) {
            track.stop();
          }
        }

        // Also stop track from state if available
        if (screenShareTrack && screenShareTrack.stop) {
          screenShareTrack.stop();
        }

        // Clear local screen share element
        if (localScreenShareRef.current) {
          localScreenShareRef.current.srcObject = null;
        }

        // Clear state
        setScreenShareTrack(null);
        setIsScreenSharing(false);

        toast({
          title: "Screen Share Dihentikan",
          description: "Berhenti membagikan layar",
        });
      } else {
        // Start screen sharing
        console.log("[DEBUG] Starting screen share");

        // Request screen share
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: {
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
          audio: true, // Include system audio if available
        });

        // Get video track
        const videoTrack = screenStream.getVideoTracks()[0];
        if (!videoTrack) {
          throw new Error("No video track in screen share");
        }

        // Handle track ended (user stops sharing from browser)
        videoTrack.onended = () => {
          console.log("[DEBUG] Screen share track ended by user");
          // Clean up state
          setIsScreenSharing(false);
          setScreenShareTrack(null);
          if (localScreenShareRef.current) {
            localScreenShareRef.current.srcObject = null;
          }
          // Unpublish from room
          const screenSharePublication = room.localParticipant.getTrackPublication(Track.Source.ScreenShare);
          if (screenSharePublication?.track) {
            room.localParticipant.unpublishTrack(screenSharePublication.track).catch(console.error);
          }
        };

        // Update state first so the video element is rendered
        setScreenShareTrack(videoTrack);
        setIsScreenSharing(true);

        // Attach stream to local video element immediately
        if (localScreenShareRef.current) {
          localScreenShareRef.current.srcObject = screenStream;
          console.log("[DEBUG] Screen share stream attached to local element");
        }

        // Publish screen share track to room
        await room.localParticipant.publishTrack(videoTrack, {
          name: "screen-share",
          source: Track.Source.ScreenShare,
        });
        
        console.log("[DEBUG] Screen share track published to room");

        toast({
          title: "Screen Share Dimulai",
          description: "Layar Anda sedang dibagikan",
        });
      }
    } catch (err: any) {
      console.error("Error toggling screen share:", err);

      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        toast({
          title: "Izin Diperlukan",
          description: "Izin untuk membagikan layar diperlukan",
          variant: "default",
        });
      } else if (err.name === "NotFoundError" || err.name === "NotReadableError") {
        toast({
          title: "Tidak Dapat Mengakses Layar",
          description: "Tidak dapat mengakses layar. Pastikan tidak ada aplikasi lain yang menggunakan layar.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: "Gagal membagikan layar",
          variant: "destructive",
        });
      }

      // Reset state on error
      setIsScreenSharing(false);
      setScreenShareTrack(null);
    }
  };

  const leaveRoom = async () => {
    if (room && room.state === "connected") {
      try {
        // Unpublish all tracks first
        const publications = Array.from(room.localParticipant.trackPublications.values());
        for (const publication of publications) {
          try {
            if (publication.track) {
              await room.localParticipant.unpublishTrack(publication.track);
            }
          } catch (err) {
            console.error("Error unpublishing track:", err);
          }
        }

        // Detach all tracks
        room.localParticipant.trackPublications.forEach((publication) => {
          if (publication.track) {
            publication.track.detach();
          }
        });

        // Disconnect from room
        await room.disconnect();
      } catch (err) {
        console.error("Error during disconnect:", err);
      } finally {
        setRoom(null);
        hasJoinedRef.current = false;
        isJoiningRef.current = false;
      }
    }

    // Call API to remove participant from room
    if (roomId && typeof roomId === "string") {
      try {
        await api.leaveRoom(roomId);
      } catch (err: any) {
        console.error("Error leaving room via API:", err);
        // Continue even if API call fails
      }
    }

    // Clear participants
    setParticipants(new Map());
    videoElementsRef.current.clear();
    screenShareElementsRef.current.clear();

    // Stop screen share track if active
    if (screenShareTrack) {
      screenShareTrack.stop();
      setScreenShareTrack(null);
    }

    // Reset state
    setIsMicMuted(false);
    setIsCameraOff(false);
    setIsScreenSharing(false);

    // Small delay to ensure cleanup is complete
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Navigate back to zoom list
    router.push("/zoom");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Menghubungkan ke room...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center">
        <Card className="p-8 max-w-md">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Error</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">{error}</p>
          <div className="space-y-2">
            <Button onClick={() => router.push("/zoom")} className="w-full">
              Kembali ke Rooms
            </Button>
            <Button 
              onClick={() => {
                console.log("[DEBUG] Retry button clicked");
                setError(null);
                setLoading(true);
                if (roomId && typeof roomId === "string") {
                  joinRoom(roomId);
                }
              }} 
              variant="outline" 
              className="w-full"
            >
              Coba Lagi
            </Button>
          </div>
          <details className="mt-4">
            <summary className="text-sm text-gray-500 cursor-pointer">Debug Info</summary>
            <pre className="mt-2 text-xs bg-gray-100 dark:bg-gray-800 p-2 rounded overflow-auto max-h-40">
              {JSON.stringify({ roomId, error, hasToken: !!TokenManager.getAccessToken() }, null, 2)}
            </pre>
          </details>
        </Card>
      </div>
    );
  }

  const participantCount = participants.size + 1; // +1 for local participant

  // Check if there's any active screen share (local or remote)
  const hasActiveScreenShare = isScreenSharing || Array.from(participants.values()).some(
    (participant) => {
      const screenSharePublication = participant.getTrackPublication(Track.Source.ScreenShare);
      return screenSharePublication?.isSubscribed && screenSharePublication.track;
    }
  );

  // Get active screen share participant (prioritize remote, then local)
  const activeScreenShareParticipant = Array.from(participants.values()).find(
    (participant) => {
      const screenSharePublication = participant.getTrackPublication(Track.Source.ScreenShare);
      return screenSharePublication?.isSubscribed && screenSharePublication.track;
    }
  ) || (isScreenSharing ? room?.localParticipant : null);

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col">
      <Navbar />
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="bg-gray-800 px-3 sm:px-6 py-3 sm:py-4 flex justify-between items-center">
          <div className="min-w-0 flex-1">
            <h2 className="text-base sm:text-xl font-semibold text-white truncate">
              <span className="hidden sm:inline">Room: </span>
              {typeof roomId === "string" ? roomId.slice(0, 8) + "..." : roomId}
            </h2>
            <p className="text-gray-400 text-xs sm:text-sm">Video Call</p>
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            <div className="flex items-center gap-1.5 sm:gap-2 bg-gray-700 px-2 sm:px-4 py-1.5 sm:py-2 rounded-full">
              <Users className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-gray-300" />
              <span className="text-white text-xs sm:text-sm">{participantCount}</span>
            </div>
            <Button
              onClick={() => setChatOpen(!chatOpen)}
              variant="ghost"
              size="icon"
              className={`text-gray-300 hover:text-white hover:bg-gray-700 relative ${
                chatOpen && !isMobile ? "bg-gray-700" : ""
              }`}
            >
              <MessageSquare className="h-5 w-5" />
              {/* Notification dot for mobile when chat is closed */}
              {isMobile && !chatOpen && (
                <span className="absolute -top-1 -right-1 w-2 h-2 bg-blue-500 rounded-full" />
              )}
            </Button>
          </div>
        </div>

        {/* Main Content with Sidebar */}
        <div className="flex-1 flex overflow-hidden relative">
          {/* Screen Share Full Screen Layout */}
          {hasActiveScreenShare ? (
            <div className="flex-1 relative bg-gray-900 overflow-hidden">
              {/* Full Screen Screen Share */}
              {activeScreenShareParticipant && (
                <div className="absolute inset-0 w-full h-full">
                  {activeScreenShareParticipant === room?.localParticipant ? (
                    // Local screen share
                    <video
                      ref={localScreenShareRef}
                      className="w-full h-full object-contain"
                      autoPlay
                      playsInline
                      muted
                    />
                  ) : (
                    // Remote screen share
                    <div
                      ref={(el) => {
                        if (el && activeScreenShareParticipant) {
                          const screenShareEl = screenShareElementsRef.current.get(activeScreenShareParticipant.identity);
                          if (screenShareEl && !el.contains(screenShareEl)) {
                            el.appendChild(screenShareEl);
                          }
                        }
                      }}
                      className="w-full h-full"
                    />
                  )}
                </div>
              )}

              {/* Camera Video - Bottom Right Corner (Absolute) */}
              <div className="absolute bottom-4 right-4 w-64 h-48 sm:w-80 sm:h-60 rounded-lg overflow-hidden shadow-2xl border-2 border-gray-700 bg-gray-800 z-10">
                {!isCameraOff ? (
                  <video
                    ref={localVideoRef}
                    className={`w-full h-full object-cover ${facingMode === "user" ? "" : "scale-x-100"}`}
                    autoPlay
                    playsInline
                    muted
                  />
                ) : (
                  <div className="w-full h-full bg-gray-900 flex items-center justify-center">
                    <VideoOff className="h-12 w-12 text-gray-600" />
                  </div>
                )}
                <div className="absolute bottom-2 left-2 flex items-center gap-1.5">
                  <span className="bg-black/70 text-white px-2 py-1 rounded text-xs">
                    Anda
                  </span>
                  {!isCameraOff && (
                    <span className="bg-blue-600/80 text-white px-2 py-1 rounded text-xs">
                      {facingMode === "user" ? "Depan" : "Belakang"}
                    </span>
                  )}
                </div>
                {/* Status Icons Overlay */}
                <div className="absolute top-2 right-2 flex gap-1">
                  {isMicMuted && (
                    <div className="bg-red-600/90 rounded-full p-1">
                      <MicOff className="h-3 w-3 text-white" />
                    </div>
                  )}
                  {isCameraOff && (
                    <div className="bg-red-600/90 rounded-full p-1">
                      <VideoOff className="h-3 w-3 text-white" />
                    </div>
                  )}
                </div>
              </div>

              {/* Screen Share Label */}
              <div className="absolute top-4 left-4 z-10">
                <span className="bg-blue-600/90 text-white px-3 py-1.5 rounded text-sm font-medium">
                  {activeScreenShareParticipant === room?.localParticipant 
                    ? "Layar Anda" 
                    : `${activeScreenShareParticipant?.identity || "Layar"} - Screen Share`}
                </span>
              </div>
            </div>
          ) : (
            /* Normal Grid Layout (No Screen Share) */
            <div className="flex-1 p-3 sm:p-6 h-[70vh]  transition-all duration-300 ">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-4 max-w-7xl mx-auto">
                {/* Local Video */}
                <Card className="relative p-0 aspect-video bg-gray-800 overflow-hidden border-0">
                <video
                  ref={localVideoRef}
                  className={`w-full h-full object-cover ${facingMode === "user" ? "" : "scale-x-100"}`}
                  autoPlay
                  playsInline
                  muted
                />
                <div className="absolute bottom-1.5 sm:bottom-2 left-1.5 sm:left-2 flex items-center gap-1.5">
                  <span className="bg-black/70 text-white px-2 sm:px-3 py-0.5 sm:py-1 rounded text-xs sm:text-sm">
                    Anda
                  </span>
                  {/* Camera mode indicator */}
                  {!isCameraOff && (
                    <span className="bg-blue-600/80 text-white px-1.5 sm:px-2 py-0.5 sm:py-1 rounded text-[10px] sm:text-xs">
                      {facingMode === "user" ? "Depan" : "Belakang"}
                    </span>
                  )}
                </div>
                {/* Status Icons Overlay */}
                <div className="absolute top-1.5 sm:top-2 right-1.5 sm:right-2 flex gap-1 sm:gap-2">
                  {isMicMuted && (
                    <div className="bg-red-600/90 rounded-full p-1 sm:p-1.5">
                      <MicOff className="h-3 w-3 sm:h-4 sm:w-4 text-white" />
                    </div>
                  )}
                  {isCameraOff && (
                    <div className="bg-red-600/90 rounded-full p-1 sm:p-1.5">
                      <VideoOff className="h-3 w-3 sm:h-4 sm:w-4 text-white" />
                    </div>
                  )}
                </div>
              </Card>

              {/* Remote Participants */}
              {Array.from(participants.entries()).map(([identity, participant]) => {
                // Check actual status from participant
                const micPublication = participant.getTrackPublication(Track.Source.Microphone);
                const cameraPublication = participant.getTrackPublication(Track.Source.Camera);
                const actualMicMuted = !micPublication?.isSubscribed || micPublication.isMuted;
                const actualCameraOff = !cameraPublication?.isSubscribed || !cameraPublication.track;
                
                return (
                  <Card key={identity} className="relative p-0 aspect-video bg-gray-800 overflow-hidden border-0">
                      <div
                        ref={(el) => {
                          if (el) {
                            const videoEl = videoElementsRef.current.get(identity);
                            if (videoEl && !el.contains(videoEl)) {
                              el.appendChild(videoEl);
                            }
                          }
                        }}
                        className="w-full h-full"
                      />
                      <div className="absolute bottom-1.5 sm:bottom-2 left-1.5 sm:left-2 bg-black/70 text-white px-2 sm:px-3 py-0.5 sm:py-1 rounded text-xs sm:text-sm truncate max-w-[80%]">
                        {identity}
                      </div>
                      {/* Status Icons Overlay */}
                      <div className="absolute top-1.5 sm:top-2 right-1.5 sm:right-2 flex gap-1 sm:gap-2">
                        {actualMicMuted && (
                          <div className="bg-red-600/90 rounded-full p-1 sm:p-1.5">
                            <MicOff className="h-3 w-3 sm:h-4 sm:w-4 text-white" />
                          </div>
                        )}
                        {actualCameraOff && (
                          <div className="bg-red-600/90 rounded-full p-1 sm:p-1.5">
                            <VideoOff className="h-3 w-3 sm:h-4 sm:w-4 text-white" />
                          </div>
                        )}
                      </div>
                    </Card>
                );
              })}
              </div>
            </div>
          )}

          {/* Chat Sidebar - Desktop */}
          {!isMobile && chatOpen && session?.user?.id && (
            <div className="w-80 border-l border-gray-700 shrink-0 h-full overflow-hidden hidden md:flex md:flex-col min-h-0">
              <ChatSidebar
                roomId={roomId as string}
                userId={session.user.id}
                isOpen={chatOpen}
              />
            </div>
          )}

          {/* Chat Modal - Mobile */}
          {isMobile && chatOpen && session?.user?.id && (
            <>
              {/* Backdrop */}
              <div 
                className="fixed inset-0 bg-black/60 z-40 md:hidden"
                onClick={() => setChatOpen(false)}
              />
              
              {/* Chat Panel */}
              <div className="fixed inset-x-0 bottom-0 top-16 z-50 md:hidden animate-in slide-in-from-bottom duration-300">
                <div className="h-full bg-gray-800 rounded-t-2xl flex flex-col overflow-hidden">
                  {/* Modal Header */}
                  <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="h-5 w-5 text-gray-300" />
                      <h3 className="text-lg font-semibold text-white">Chat</h3>
                    </div>
                    <Button
                      onClick={() => setChatOpen(false)}
                      variant="ghost"
                      size="icon"
                      className="text-gray-400 hover:text-white hover:bg-gray-700"
                    >
                      <X className="h-5 w-5" />
                    </Button>
                  </div>
                  
                  {/* Chat Content */}
                  <div className="flex-1 overflow-hidden">
                    <ChatSidebar
                      roomId={roomId as string}
                      userId={session.user.id}
                      isOpen={chatOpen}
                    />
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Controls */}
        <div className="bg-gray-800 px-4 sm:px-6 py-3 sm:py-4 flex justify-center gap-3 sm:gap-4">
          <Button
            onClick={toggleMic}
            size="lg"
            className={`rounded-full h-12 w-12 sm:h-14 sm:w-14 p-0 ${
              isMicMuted
                ? "bg-red-600 hover:bg-red-700"
                : "bg-gray-700 hover:bg-gray-600"
            }`}
          >
            {isMicMuted ? (
              <MicOff className="h-5 w-5 sm:h-6 sm:w-6" />
            ) : (
              <Mic className="h-5 w-5 sm:h-6 sm:w-6" />
            )}
          </Button>
          <Button
            onClick={toggleCamera}
            size="lg"
            className={`rounded-full h-12 w-12 sm:h-14 sm:w-14 p-0 ${
              isCameraOff
                ? "bg-red-600 hover:bg-red-700"
                : "bg-gray-700 hover:bg-gray-600"
            }`}
          >
            {isCameraOff ? (
              <VideoOff className="h-5 w-5 sm:h-6 sm:w-6" />
            ) : (
              <Video className="h-5 w-5 sm:h-6 sm:w-6" />
            )}
          </Button>
          
          {/* Switch Camera Button */}
          <Button
            onClick={switchCamera}
            size="lg"
            disabled={isCameraOff || isSwitchingCamera}
            className={`rounded-full h-12 w-12 sm:h-14 sm:w-14 p-0 ${
              isCameraOff || isSwitchingCamera
                ? "bg-gray-600 opacity-50 cursor-not-allowed"
                : "bg-gray-700 hover:bg-gray-600"
            }`}
            title={facingMode === "user" ? "Switch ke kamera belakang" : "Switch ke kamera depan"}
          >
            <SwitchCamera className={`h-5 w-5 sm:h-6 sm:w-6 ${isSwitchingCamera ? "animate-spin" : ""}`} />
          </Button>
          
          {/* Screen Share Button */}
          <Button
            onClick={toggleScreenShare}
            size="lg"
            className={`rounded-full h-12 w-12 sm:h-14 sm:w-14 p-0 ${
              isScreenSharing
                ? "bg-blue-600 hover:bg-blue-700"
                : "bg-gray-700 hover:bg-gray-600"
            }`}
            title={isScreenSharing ? "Berhenti membagikan layar" : "Bagikan layar"}
          >
            {isScreenSharing ? (
              <MonitorOff className="h-5 w-5 sm:h-6 sm:w-6" />
            ) : (
              <Monitor className="h-5 w-5 sm:h-6 sm:w-6" />
            )}
          </Button>
          
          <Button
            onClick={leaveRoom}
            size="lg"
            className="rounded-full h-12 w-12 sm:h-14 sm:w-14 p-0 bg-red-600 hover:bg-red-700"
          >
            <PhoneOff className="h-5 w-5 sm:h-6 sm:w-6" />
          </Button>
          
          {/* Chat button in controls - Mobile only */}
          <Button
            onClick={() => setChatOpen(!chatOpen)}
            size="lg"
            className={`rounded-full h-12 w-12 sm:h-14 sm:w-14 p-0 md:hidden ${
              chatOpen
                ? "bg-blue-600 hover:bg-blue-700"
                : "bg-gray-700 hover:bg-gray-600"
            }`}
          >
            <MessageSquare className="h-5 w-5 sm:h-6 sm:w-6" />
          </Button>
        </div>
      </div>
    </div>
  );
}

