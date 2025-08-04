import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { 
  Play, 
  Pause, 
  SkipForward, 
  SkipBack, 
  Volume2, 
  Shuffle, 
  Repeat, 
  Plus,
  Music,
  LogOut,
  Upload,
  List
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";

interface Song {
  id: string;
  title: string;
  artist?: string;
  url: string;
  duration?: number;
  category_id?: string;
  is_public?: boolean;
}

interface Category {
  id: string;
  name: string;
  description?: string;
}

interface Playlist {
  id: string;
  name: string;
  description?: string;
  is_public: boolean;
  songs?: Song[];
}

interface PlayerState {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  currentSongIndex: number;
  volume: number;
  shuffle: boolean;
  repeat: boolean;
}

export const EnhancedMJPlayer = () => {
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const audioRef = useRef<HTMLAudioElement>(null);
  
  // State
  const [songs, setSongs] = useState<Song[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [currentPlaylist, setCurrentPlaylist] = useState<Playlist | null>(null);
  const [playerState, setPlayerState] = useState<PlayerState>({
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    currentSongIndex: 0,
    volume: 1,
    shuffle: false,
    repeat: false,
  });
  
  // Forms
  const [newSongTitle, setNewSongTitle] = useState("");
  const [newSongArtist, setNewSongArtist] = useState("");
  const [newSongUrl, setNewSongUrl] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [newPlaylistName, setNewPlaylistName] = useState("");
  const [activeTab, setActiveTab] = useState("songs");

  const currentSong = songs[playerState.currentSongIndex];

  // Load data on mount
  useEffect(() => {
    if (user) {
      loadCategories();
      loadSongs();
      loadPlaylists();
    }
  }, [user]);

  // Audio event listeners
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateTime = () => {
      setPlayerState(prev => ({
        ...prev,
        currentTime: audio.currentTime,
        duration: audio.duration || 0,
      }));
    };

    const handleEnded = () => {
      if (playerState.repeat) {
        audio.currentTime = 0;
        audio.play();
      } else {
        nextSong();
      }
    };

    audio.addEventListener("timeupdate", updateTime);
    audio.addEventListener("loadedmetadata", updateTime);
    audio.addEventListener("ended", handleEnded);

    return () => {
      audio.removeEventListener("timeupdate", updateTime);
      audio.removeEventListener("loadedmetadata", updateTime);
      audio.removeEventListener("ended", handleEnded);
    };
  }, [playerState.repeat]);

  const loadCategories = async () => {
    const { data, error } = await supabase
      .from("categories")
      .select("*")
      .order("name");
    
    if (error) {
      toast({ title: "Error loading categories", description: error.message, variant: "destructive" });
    } else {
      setCategories(data || []);
    }
  };

  const loadSongs = async () => {
    const { data, error } = await supabase
      .from("songs")
      .select(`
        *,
        categories(name)
      `)
      .order("created_at", { ascending: false });
    
    if (error) {
      toast({ title: "Error loading songs", description: error.message, variant: "destructive" });
    } else {
      setSongs(data || []);
    }
  };

  const loadPlaylists = async () => {
    const { data, error } = await supabase
      .from("playlists")
      .select(`
        *,
        playlist_songs(
          songs(*)
        )
      `)
      .eq("user_id", user?.id)
      .order("created_at", { ascending: false });
    
    if (error) {
      toast({ title: "Error loading playlists", description: error.message, variant: "destructive" });
    } else {
      const playlistsWithSongs = data?.map(playlist => ({
        ...playlist,
        songs: playlist.playlist_songs?.map((ps: any) => ps.songs) || []
      })) || [];
      setPlaylists(playlistsWithSongs);
    }
  };

  const addSong = async () => {
    if (!newSongTitle || !newSongUrl) {
      toast({ title: "Error", description: "Please fill in title and URL", variant: "destructive" });
      return;
    }

    const { error } = await supabase.from("songs").insert({
      title: newSongTitle,
      artist: newSongArtist || null,
      url: newSongUrl,
      category_id: selectedCategory || null,
      uploaded_by: user?.id,
    });

    if (error) {
      toast({ title: "Error adding song", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Success", description: "Song added successfully!" });
      setNewSongTitle("");
      setNewSongArtist("");
      setNewSongUrl("");
      setSelectedCategory("");
      loadSongs();
    }
  };

  const createPlaylist = async () => {
    if (!newPlaylistName) {
      toast({ title: "Error", description: "Please enter playlist name", variant: "destructive" });
      return;
    }

    const { error } = await supabase.from("playlists").insert({
      name: newPlaylistName,
      user_id: user?.id,
    });

    if (error) {
      toast({ title: "Error creating playlist", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Success", description: "Playlist created successfully!" });
      setNewPlaylistName("");
      loadPlaylists();
    }
  };

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio || !currentSong) return;

    if (playerState.isPlaying) {
      audio.pause();
    } else {
      audio.play();
    }
    setPlayerState(prev => ({ ...prev, isPlaying: !prev.isPlaying }));
  };

  const nextSong = () => {
    if (songs.length === 0) return;
    
    let nextIndex;
    if (playerState.shuffle) {
      nextIndex = Math.floor(Math.random() * songs.length);
    } else {
      nextIndex = (playerState.currentSongIndex + 1) % songs.length;
    }
    
    setPlayerState(prev => ({ ...prev, currentSongIndex: nextIndex }));
  };

  const prevSong = () => {
    if (songs.length === 0) return;
    
    const prevIndex = playerState.currentSongIndex === 0 
      ? songs.length - 1 
      : playerState.currentSongIndex - 1;
    
    setPlayerState(prev => ({ ...prev, currentSongIndex: prevIndex }));
  };

  const seekTo = (value: number[]) => {
    const audio = audioRef.current;
    if (audio) {
      audio.currentTime = value[0];
    }
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-secondary/20">
        <Card className="text-center p-8">
          <CardHeader>
            <div className="flex items-center justify-center gap-2 mb-4">
              <Music className="h-12 w-12 text-primary" />
              <h1 className="text-3xl font-bold">MJ Player</h1>
            </div>
            <CardTitle>Welcome to MJ Player</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-6">
              Your personal music streaming platform
            </p>
            <Button onClick={() => window.location.href = '/auth'} size="lg">
              Get Started
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20">
      <div className="container mx-auto p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Music className="h-8 w-8 text-primary" />
            <h1 className="text-2xl font-bold">MJ Player</h1>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">
              Welcome, {user.email}
            </span>
            <Button variant="outline" size="sm" onClick={signOut}>
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Panel - Player */}
          <div className="lg:col-span-2 space-y-6">
            {/* Now Playing */}
            <Card>
              <CardHeader>
                <CardTitle>Now Playing</CardTitle>
              </CardHeader>
              <CardContent>
                {currentSong ? (
                  <div className="space-y-4">
                    <div className="text-center">
                      <h3 className="text-xl font-semibold">{currentSong.title}</h3>
                      {currentSong.artist && (
                        <p className="text-muted-foreground">{currentSong.artist}</p>
                      )}
                    </div>
                    
                    {/* Progress Bar */}
                    <div className="space-y-2">
                      <Slider
                        value={[playerState.currentTime]}
                        max={playerState.duration || 100}
                        step={1}
                        onValueChange={seekTo}
                        className="w-full"
                      />
                      <div className="flex justify-between text-sm text-muted-foreground">
                        <span>{formatTime(playerState.currentTime)}</span>
                        <span>{formatTime(playerState.duration)}</span>
                      </div>
                    </div>
                    
                    {/* Controls */}
                    <div className="flex items-center justify-center gap-4">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => setPlayerState(prev => ({ ...prev, shuffle: !prev.shuffle }))}
                        className={playerState.shuffle ? "bg-primary text-primary-foreground" : ""}
                      >
                        <Shuffle className="h-4 w-4" />
                      </Button>
                      
                      <Button variant="outline" size="icon" onClick={prevSong}>
                        <SkipBack className="h-4 w-4" />
                      </Button>
                      
                      <Button size="icon" onClick={togglePlay}>
                        {playerState.isPlaying ? (
                          <Pause className="h-5 w-5" />
                        ) : (
                          <Play className="h-5 w-5" />
                        )}
                      </Button>
                      
                      <Button variant="outline" size="icon" onClick={nextSong}>
                        <SkipForward className="h-4 w-4" />
                      </Button>
                      
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => setPlayerState(prev => ({ ...prev, repeat: !prev.repeat }))}
                        className={playerState.repeat ? "bg-primary text-primary-foreground" : ""}
                      >
                        <Repeat className="h-4 w-4" />
                      </Button>
                    </div>
                    
                    {/* Volume */}
                    <div className="flex items-center gap-2">
                      <Volume2 className="h-4 w-4" />
                      <Slider
                        value={[playerState.volume * 100]}
                        max={100}
                        step={1}
                        onValueChange={(value) => {
                          const newVolume = value[0] / 100;
                          setPlayerState(prev => ({ ...prev, volume: newVolume }));
                          if (audioRef.current) {
                            audioRef.current.volume = newVolume;
                          }
                        }}
                        className="flex-1"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Music className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No song selected</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Songs List */}
            <Card>
              <CardHeader>
                <CardTitle>Songs</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {songs.map((song, index) => (
                    <div
                      key={song.id}
                      className={`flex items-center justify-between p-2 rounded-lg cursor-pointer hover:bg-secondary/50 ${
                        index === playerState.currentSongIndex ? "bg-secondary" : ""
                      }`}
                      onClick={() => setPlayerState(prev => ({ ...prev, currentSongIndex: index }))}
                    >
                      <div>
                        <p className="font-medium">{song.title}</p>
                        {song.artist && (
                          <p className="text-sm text-muted-foreground">{song.artist}</p>
                        )}
                      </div>
                      {index === playerState.currentSongIndex && playerState.isPlaying && (
                        <div className="text-primary">
                          <Music className="h-4 w-4" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Panel - Controls */}
          <div className="space-y-6">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="songs">Add Song</TabsTrigger>
                <TabsTrigger value="playlists">Playlists</TabsTrigger>
              </TabsList>
              
              <TabsContent value="songs">
                <Card>
                  <CardHeader>
                    <CardTitle>Add New Song</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Input
                        placeholder="Song title"
                        value={newSongTitle}
                        onChange={(e) => setNewSongTitle(e.target.value)}
                      />
                    </div>
                    <div>
                      <Input
                        placeholder="Artist (optional)"
                        value={newSongArtist}
                        onChange={(e) => setNewSongArtist(e.target.value)}
                      />
                    </div>
                    <div>
                      <Input
                        placeholder="Song URL"
                        value={newSongUrl}
                        onChange={(e) => setNewSongUrl(e.target.value)}
                      />
                    </div>
                    <div>
                      <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          {categories.map((category) => (
                            <SelectItem key={category.id} value={category.id}>
                              {category.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Button onClick={addSong} className="w-full">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Song
                    </Button>
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="playlists">
                <Card>
                  <CardHeader>
                    <CardTitle>My Playlists</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex gap-2">
                      <Input
                        placeholder="Playlist name"
                        value={newPlaylistName}
                        onChange={(e) => setNewPlaylistName(e.target.value)}
                      />
                      <Button onClick={createPlaylist}>
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {playlists.map((playlist) => (
                        <div
                          key={playlist.id}
                          className="flex items-center justify-between p-2 rounded-lg hover:bg-secondary/50 cursor-pointer"
                          onClick={() => setCurrentPlaylist(playlist)}
                        >
                          <div>
                            <p className="font-medium">{playlist.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {playlist.songs?.length || 0} songs
                            </p>
                          </div>
                          <List className="h-4 w-4" />
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>

            {/* Categories */}
            <Card>
              <CardHeader>
                <CardTitle>Categories</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {categories.map((category) => (
                    <Badge key={category.id} variant="secondary">
                      {category.name}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Audio Element */}
        {currentSong && (
          <audio
            ref={audioRef}
            src={currentSong.url}
            onLoadedData={() => {
              if (audioRef.current) {
                audioRef.current.volume = playerState.volume;
              }
            }}
          />
        )}
      </div>
    </div>
  );
};