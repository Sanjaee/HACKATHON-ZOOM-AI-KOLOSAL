import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { useSession } from "next-auth/react";
import { api, TokenManager } from "@/lib/api";
import type { Room } from "@/types/room";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import Navbar from "@/components/general/Navbar";
import { toast } from "@/hooks/use-toast";
import { Video, Plus, Users, Calendar, Trash2 } from "lucide-react";

export default function ZoomRoomsPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [roomName, setRoomName] = useState("");
  const [roomDescription, setRoomDescription] = useState("");
  const [maxParticipants, setMaxParticipants] = useState<number | undefined>();
  const [creating, setCreating] = useState(false);

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
      fetchRooms();
    } else {
      router.push("/auth/login?callbackUrl=" + encodeURIComponent("/zoom"));
    }
  }, [session, status, router]);

  const fetchRooms = async () => {
    try {
      setLoading(true);
      
      // Ensure token is set from session or localStorage
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
      
      if (!token) {
        router.push("/auth/login?callbackUrl=" + encodeURIComponent("/zoom"));
        return;
      }
      
      api.setAccessToken(token);
      
      const data = await api.getRooms() as Room[];
      setRooms(Array.isArray(data) ? data : []);
    } catch (error: any) {
      console.error("Error fetching rooms:", error);
      toast({
        title: "Error",
        description: error.message || "Gagal memuat rooms",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

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
      
      const data = await api.createRoom({
        name: roomName,
        description: roomDescription || undefined,
        max_participants: maxParticipants || undefined,
      });

      toast({
        title: "Success",
        description: "Room berhasil dibuat",
      });

      setCreateDialogOpen(false);
      setRoomName("");
      setRoomDescription("");
      setMaxParticipants(undefined);
      fetchRooms();
    } catch (error: any) {
      console.error("Error creating room:", error);
      toast({
        title: "Error",
        description: error.message || "Gagal membuat room",
        variant: "destructive",
      });
    } finally {
      setCreating(false);
    }
  };

  const handleJoinRoom = (roomId: string) => {
    router.push(`/zoom/${roomId}`);
  };

  const handleDeleteRoom = async (roomId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click event
    
    if (!confirm("Apakah Anda yakin ingin menghapus room ini?")) {
      return;
    }

    try {
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
      
      await api.deleteRoom(roomId);
      
      toast({
        title: "Success",
        description: "Room berhasil dihapus",
      });
      
      // Refresh rooms list
      fetchRooms();
    } catch (error: any) {
      console.error("Error deleting room:", error);
      toast({
        title: "Error",
        description: error.message || "Gagal menghapus room",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <Navbar />
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
              Video Call Rooms
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Buat atau bergabung ke room video call
            </p>
          </div>
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700">
                <Plus className="mr-2 h-4 w-4" />
                Buat Room
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Buat Room Baru</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div>
                  <Label htmlFor="name">Nama Room *</Label>
                  <Input
                    id="name"
                    placeholder="Masukkan nama room"
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
                  className="w-full bg-gradient-to-r from-purple-600 to-indigo-600"
                >
                  {creating ? "Membuat..." : "Buat Room"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
            <p className="mt-4 text-gray-600 dark:text-gray-400">Memuat rooms...</p>
          </div>
        ) : rooms.length === 0 ? (
          <Card className="p-12 text-center">
            <Video className="h-16 w-16 mx-auto text-gray-400 mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              Belum ada room
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Buat room pertama Anda untuk memulai video call
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {rooms.map((room) => (
              <Card
                key={room.id}
                className="p-6 hover:shadow-lg transition-shadow cursor-pointer border-2 hover:border-purple-500"
                onClick={() => handleJoinRoom(room.id)}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-1">
                      {room.name}
                    </h3>
                    {room.description && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                        {room.description}
                      </p>
                    )}
                  </div>
                  {session?.user?.id === room.created_by_id && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="ml-2 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                      onClick={(e) => handleDeleteRoom(room.id, e)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                <div className="space-y-2 mb-4">
                  <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                    <Users className="h-4 w-4 mr-2" />
                    {room.participant_count} peserta
                    {room.max_participants && ` / ${room.max_participants}`}
                  </div>
                  <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                    <Calendar className="h-4 w-4 mr-2" />
                    {new Date(room.created_at).toLocaleDateString("id-ID")}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Dibuat oleh: {room.created_by_name}
                  </div>
                </div>
                <Button
                  className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleJoinRoom(room.id);
                  }}
                >
                  <Video className="mr-2 h-4 w-4" />
                  Gabung Room
                </Button>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

