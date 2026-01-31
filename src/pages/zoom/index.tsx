import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { useSession } from "next-auth/react";
import { Space_Grotesk, Outfit } from "next/font/google";
import { api, TokenManager } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import Navbar from "@/components/general/Navbar";
import { toast } from "@/hooks/use-toast";
import { Video, Plus, Calendar, Copy, Check } from "lucide-react";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space",
  subsets: ["latin"],
});

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
});

// Generate particles for background
const PARTICLES = Array.from({ length: 20 }, (_, i) => ({
  id: i,
  left: (i * 17 + 13) % 100,
  top: (i * 23 + 7) % 100,
  duration: 3 + (i % 5),
  delay: (i % 3) * 0.7,
}));

export default function ZoomRoomsPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [roomIdDialogOpen, setRoomIdDialogOpen] = useState(false);
  const [createdRoomId, setCreatedRoomId] = useState("");
  const [roomName, setRoomName] = useState("");
  const [roomDescription, setRoomDescription] = useState("");
  const [maxParticipants, setMaxParticipants] = useState<number | undefined>();
  const [creating, setCreating] = useState(false);
  const [joinRoomId, setJoinRoomId] = useState("");
  const [copied, setCopied] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  useEffect(() => {
    // Wait for session to load
    if (status === "loading") {
      return;
    }

    // Check if user is authenticated
    if (status === "unauthenticated") {
      router.push("/auth/login?callbackUrl=" + encodeURIComponent("/zoom"));
      return;
    }

    // Get token from NextAuth session or localStorage
    let token: string | null = null;
    
    if (session?.accessToken) {
      token = session.accessToken as string;
      // Save to localStorage for API client
      if (session.refreshToken) {
        TokenManager.setTokens(token, session.refreshToken as string);
      }
      // Set token to API client
      api.setAccessToken(token);
      console.log("[Zoom] Token set from session:", { hasToken: !!token, loginType: session.loginType });
    } else {
      // Fallback to localStorage
      token = TokenManager.getAccessToken();
      if (token) {
        api.setAccessToken(token);
        console.log("[Zoom] Token set from localStorage:", { hasToken: !!token });
      } else {
        console.error("[Zoom] No token found, redirecting to login");
        router.push("/auth/login?callbackUrl=" + encodeURIComponent("/zoom"));
      }
    }
  }, [session, status, router]);

  const handleCreateRoom = async () => {
    if (!roomName.trim()) {
      toast({
        title: "Error",
        description: "Nama room harus diisi",
        variant: "destructive",
      });
      return;
    }

    try {
      setCreating(true);
      
      // Ensure token is set
      let token: string | null = null;
      
      if (session?.accessToken) {
        token = session.accessToken as string;
        if (session.refreshToken) {
          TokenManager.setTokens(token, session.refreshToken as string);
        }
      } else {
        token = TokenManager.getAccessToken();
      }
      
      if (!token) {
        toast({
          title: "Error",
          description: "Anda harus login terlebih dahulu",
          variant: "destructive",
        });
        router.push("/auth/login?callbackUrl=" + encodeURIComponent("/zoom"));
        return;
      }
      
      api.setAccessToken(token);
      
      const data: any = await api.createRoom({
        name: roomName,
        description: roomDescription || undefined,
        max_participants: maxParticipants || undefined,
      });

      // Get room ID from response
      const roomId = data?.data?.id || data?.id;
      
      if (roomId) {
        setCreatedRoomId(roomId);
        setCreateDialogOpen(false);
        setRoomIdDialogOpen(true);
        setRoomName("");
        setRoomDescription("");
        setMaxParticipants(undefined);
        
        toast({
          title: "Success",
          description: "Room berhasil dibuat",
        });
      } else {
        throw new Error("Room ID tidak ditemukan dalam response");
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Gagal membuat room",
        variant: "destructive",
      });
    } finally {
      setCreating(false);
    }
  };

  const handleJoinRoom = async () => {
    if (!joinRoomId.trim()) {
      toast({
        title: "Error",
        description: "Masukkan ID room terlebih dahulu",
        variant: "destructive",
      });
      return;
    }

    router.push(`/zoom/${joinRoomId.trim()}`);
  };

  const handleCopyRoomId = () => {
    if (createdRoomId) {
      navigator.clipboard.writeText(createdRoomId);
      setCopied(true);
      toast({
        title: "Berhasil",
        description: "ID room berhasil disalin",
      });
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleEnterRoom = () => {
    setRoomIdDialogOpen(false);
    router.push(`/zoom/${createdRoomId}`);
  };

  return (
    <div
      className={`${spaceGrotesk.variable} ${outfit.variable} relative min-h-screen overflow-hidden bg-[#0a0a0f] font-sans`}
    >
      <Navbar />
      
      {/* Animated gradient background */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Primary gradient orbs */}
        <div
          className="absolute w-[800px] h-[800px] rounded-full opacity-30 blur-[120px] animate-pulse"
          style={{
            background: "radial-gradient(circle, #6366f1 0%, transparent 70%)",
            left: `${mousePosition.x * 0.02}px`,
            top: `${mousePosition.y * 0.02}px`,
            transition: "all 0.3s ease-out",
          }}
        />
        <div
          className="absolute right-0 bottom-0 w-[600px] h-[600px] rounded-full opacity-25 blur-[100px]"
          style={{
            background: "radial-gradient(circle, #ec4899 0%, transparent 70%)",
            animation: "float 8s ease-in-out infinite",
          }}
        />
        <div
          className="absolute left-1/2 top-1/2 w-[500px] h-[500px] rounded-full opacity-20 blur-[80px]"
          style={{
            background: "radial-gradient(circle, #06b6d4 0%, transparent 70%)",
            animation: "float 10s ease-in-out infinite reverse",
          }}
        />

        {/* Grid overlay */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `
              linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)
            `,
            backgroundSize: "100px 100px",
          }}
        />

        {/* Floating particles */}
        {PARTICLES.map((particle) => (
          <div
            key={particle.id}
            className="absolute w-1 h-1 bg-white rounded-full opacity-20"
            style={{
              left: `${particle.left}%`,
              top: `${particle.top}%`,
              animation: `twinkle ${particle.duration}s ease-in-out infinite`,
              animationDelay: `${particle.delay}s`,
            }}
          />
        ))}
      </div>

      {/* Main content */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-[calc(100vh-80px)] px-4 py-12">
        {/* Main Heading */}
        <h1 className={`text-center text-5xl  lg:text-6xl font-bold tracking-tight mb-3 sm:mb-4 md:mb-5 font-[family-name:var(--font-outfit)] ${mounted ? "animate-fadeInUp" : "opacity-0"}`}
          style={{ animationDelay: "0.1s", animationFillMode: "forwards" }}>
          <span className="bg-gradient-to-r from-white via-gray-200 to-gray-400 bg-clip-text text-transparent">
            Meeting Profesional
          </span>
          <br />
          <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
            UMKM & Investor
          </span>
        </h1>
        
        {/* Subtitle */}
        <p className={`text-center text-sm sm:text-base md:text-lg text-gray-400 sm:max-w-md md:max-w-lg lg:max-w-2xl mb-6 sm:mb-8 md:mb-10 px-4 sm:px-0 leading-relaxed font-[family-name:var(--font-outfit)] ${mounted ? "animate-fadeInUp" : "opacity-0"}`}
          style={{ animationDelay: "0.2s", animationFillMode: "forwards" }}>
          Terhubung, berkolaborasi, dan merayakan dari mana saja dengan{" "}
          <span className="text-indigo-400 font-semibold">Zoom Meeting AI Agent</span>.
          Platform meeting profesional untuk <span className="text-purple-400 font-semibold">UMKM</span> melakukan 
          pertemuan dengan <span className="text-pink-400 font-semibold">investor</span>. Dapatkan transkrip, 
          analisis, dan rekomendasi otomatis dari setiap pertemuan.
        </p>

        {/* Action Buttons */}
        <div className={`w-full max-w-2xl space-y-3 sm:space-y-4 mb-6 sm:mb-8 ${mounted ? "animate-fadeInUp" : "opacity-0"}`}
          style={{ animationDelay: "0.3s", animationFillMode: "forwards" }}>
          {/* Create Room Button */}
          <div className="flex justify-center">
            <Button
              onClick={() => setCreateDialogOpen(true)}
              className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-700 hover:via-purple-700 hover:to-pink-700 text-white px-6 sm:px-8 py-4 sm:py-6 text-sm sm:text-base font-medium rounded-sm shadow-lg shadow-purple-500/20 hover:shadow-purple-500/40 transition-all w-full "
              size="lg"
            >
              <Plus className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
              Rapat baru
            </Button>
          </div>

          {/* Join Room Input */}
          <div className="flex gap-2 items-center">
            <div className="flex-1 relative">
              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <Input
                placeholder="Masukkan kode atau link"
                value={joinRoomId}
                onChange={(e) => setJoinRoomId(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === "Enter") {
                    handleJoinRoom();
                  }
                }}
                className="pl-10 h-12 text-base bg-white/10 border-white/20 text-white placeholder:text-gray-400 focus:bg-white/15 focus:border-indigo-400"
              />
            </div>
            <Button
              onClick={handleJoinRoom}
              disabled={!joinRoomId.trim()}
              className={`px-6 h-12 font-medium rounded-lg transition-all ${
                joinRoomId.trim()
                  ? "bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-700 hover:via-purple-700 hover:to-pink-700 text-white shadow-lg shadow-purple-500/20 hover:shadow-purple-500/40"
                  : "bg-white/10 hover:bg-white/20 text-white border border-white/20 hover:border-white/30 opacity-50 cursor-not-allowed"
              }`}
            >
              Gabung
            </Button>
          </div>
        </div>

        {/* Illustration Placeholder */}
        <div className={`w-full max-w-3xl mb-8 ${mounted ? "animate-fadeInUp" : "opacity-0"}`}
          style={{ animationDelay: "0.4s", animationFillMode: "forwards" }}>
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-12 text-center">
            <Video className="h-24 w-24 mx-auto text-indigo-400 mb-4" />
            <p className="text-gray-300 text-sm font-medium mb-2">
              Dapatkan link yang bisa Anda bagikan
            </p>
            <p className="text-gray-400 text-xs">
              Klik Rapat baru untuk dapatkan link yang bisa dikirim kepada orang yang ingin diajak rapat
            </p>
          </div>
        </div>
      </div>

      {/* Create Room Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="sm:max-w-[500px] bg-white/10 backdrop-blur-xl border-white/20 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-white font-semibold text-xl">Buat Rapat Baru</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="name" className="text-gray-300 font-medium">Nama Rapat *</Label>
              <Input
                id="name"
                placeholder="Masukkan nama rapat"
                value={roomName}
                onChange={(e) => setRoomName(e.target.value)}
                className="mt-1 bg-white/10 border-white/20 text-white placeholder:text-gray-400 focus:bg-white/15 focus:border-indigo-400 focus:ring-indigo-400/20"
              />
            </div>
            <div>
              <Label htmlFor="description" className="text-gray-300 font-medium">Deskripsi</Label>
              <Textarea
                id="description"
                placeholder="Masukkan deskripsi (opsional)"
                value={roomDescription}
                onChange={(e) => setRoomDescription(e.target.value)}
                className="mt-1 bg-white/10 border-white/20 text-white placeholder:text-gray-400 focus:bg-white/15 focus:border-indigo-400 focus:ring-indigo-400/20 resize-none"
                rows={3}
              />
            </div>
            <div>
              <Label htmlFor="maxParticipants" className="text-gray-300 font-medium">Max Participants</Label>
              <Input
                id="maxParticipants"
                type="number"
                placeholder="Tidak terbatas"
                value={maxParticipants || ""}
                onChange={(e) => setMaxParticipants(e.target.value ? parseInt(e.target.value) : undefined)}
                className="mt-1 bg-white/10 border-white/20 text-white placeholder:text-gray-400 focus:bg-white/15 focus:border-indigo-400 focus:ring-indigo-400/20"
                min={1}
              />
            </div>
            <Button
              onClick={handleCreateRoom}
              disabled={creating}
              className="w-full bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-700 hover:via-purple-700 hover:to-pink-700 text-white font-medium shadow-lg shadow-purple-500/20 hover:shadow-purple-500/40 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {creating ? "Membuat..." : "Buat Rapat"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Room ID Dialog - Show after room creation */}
      <Dialog open={roomIdDialogOpen} onOpenChange={setRoomIdDialogOpen}>
        <DialogContent className="sm:max-w-[500px] bg-white/10 backdrop-blur-xl border-white/20 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-white font-semibold text-xl">Rapat Berhasil Dibuat</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label className="text-gray-300 font-medium">ID Room (Salin dan bagikan)</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  value={createdRoomId}
                  readOnly
                  className="flex-1 font-mono text-sm bg-white/10 border-white/20 text-white"
                />
                <Button
                  onClick={handleCopyRoomId}
                  variant="outline"
                  size="icon"
                  className="shrink-0 bg-white/10 border-white/20 text-white hover:bg-white/20 hover:border-white/30"
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-green-400" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={handleEnterRoom}
                className="flex-1 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-700 hover:via-purple-700 hover:to-pink-700 text-white font-medium shadow-lg shadow-purple-500/20 hover:shadow-purple-500/40 transition-all"
              >
                <Video className="mr-2 h-4 w-4" />
                Masuk Rapat
              </Button>
              <Button
                onClick={() => setRoomIdDialogOpen(false)}
                variant="outline"
                className="flex-1 bg-white/10 border-white/20 text-white hover:bg-white/20 hover:border-white/30"
              >
                Tutup
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
