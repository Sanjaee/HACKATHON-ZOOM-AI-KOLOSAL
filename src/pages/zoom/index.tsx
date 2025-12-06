import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { useSession } from "next-auth/react";
import { api, TokenManager } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import Navbar from "@/components/general/Navbar";
import { toast } from "@/hooks/use-toast";
import { Video, Plus, Calendar, Copy, Check } from "lucide-react";

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
    } else {
      token = TokenManager.getAccessToken();
    }

    if (token) {
      api.setAccessToken(token);
    } else {
      router.push("/auth/login?callbackUrl=" + encodeURIComponent("/zoom"));
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
    <div className="min-h-screen bg-white dark:bg-gray-900">
      <Navbar />
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-80px)] px-4 py-12">
        {/* Main Heading */}
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-normal text-gray-900 dark:text-white mb-4 text-center">
          Rapat dan panggilan video untuk semua orang
        </h1>
        
        {/* Subtitle */}
        <p className="text-base sm:text-lg text-gray-600 dark:text-gray-400 mb-12 text-center max-w-2xl">
          Terhubung, berkolaborasi, dan merayakan dari mana saja dengan Zoom Meeting AI Agent
        </p>

        {/* Action Buttons */}
        <div className="w-full max-w-2xl space-y-4 mb-8">
          {/* Create Room Button */}
          <div className="flex justify-center">
            <Button
              onClick={() => setCreateDialogOpen(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 text-base font-medium rounded-lg shadow-sm"
              size="lg"
            >
              <Plus className="mr-2 h-5 w-5" />
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
                className="pl-10 h-12 text-base border-gray-300 dark:border-gray-600"
              />
            </div>
            <Button
              onClick={handleJoinRoom}
              disabled={!joinRoomId.trim()}
              className="bg-gray-200 hover:bg-gray-300 text-gray-700 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-gray-200 px-6 h-12 font-medium rounded-lg"
            >
              Gabung
            </Button>
          </div>
        </div>

        {/* Illustration Placeholder */}
        <div className="w-full max-w-3xl mb-8">
          <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-12 text-center">
            <Video className="h-24 w-24 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              Dapatkan link yang bisa Anda bagikan
            </p>
            <p className="text-gray-500 dark:text-gray-500 text-xs mt-2">
              Klik Rapat baru untuk dapatkan link yang bisa dikirim kepada orang yang ingin diajak rapat
            </p>
          </div>
        </div>
      </div>

      {/* Create Room Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Buat Rapat Baru</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="name">Nama Rapat *</Label>
              <Input
                id="name"
                placeholder="Masukkan nama rapat"
                value={roomName}
                onChange={(e) => setRoomName(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="description">Deskripsi</Label>
              <Textarea
                id="description"
                placeholder="Masukkan deskripsi (opsional)"
                value={roomDescription}
                onChange={(e) => setRoomDescription(e.target.value)}
                className="mt-1"
                rows={3}
              />
            </div>
            <div>
              <Label htmlFor="maxParticipants">Max Participants</Label>
              <Input
                id="maxParticipants"
                type="number"
                placeholder="Tidak terbatas"
                value={maxParticipants || ""}
                onChange={(e) => setMaxParticipants(e.target.value ? parseInt(e.target.value) : undefined)}
                className="mt-1"
                min={1}
              />
            </div>
            <Button
              onClick={handleCreateRoom}
              disabled={creating}
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              {creating ? "Membuat..." : "Buat Rapat"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Room ID Dialog - Show after room creation */}
      <Dialog open={roomIdDialogOpen} onOpenChange={setRoomIdDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Rapat Berhasil Dibuat</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>ID Room (Salin dan bagikan)</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  value={createdRoomId}
                  readOnly
                  className="flex-1 font-mono text-sm bg-gray-50 dark:bg-gray-800"
                />
                <Button
                  onClick={handleCopyRoomId}
                  variant="outline"
                  size="icon"
                  className="shrink-0"
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-green-600" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={handleEnterRoom}
                className="flex-1 bg-blue-600 hover:bg-blue-700"
              >
                <Video className="mr-2 h-4 w-4" />
                Masuk Rapat
              </Button>
              <Button
                onClick={() => setRoomIdDialogOpen(false)}
                variant="outline"
                className="flex-1"
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
