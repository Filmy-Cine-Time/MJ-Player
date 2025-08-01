import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { 
  Play, 
  Pause, 
  SkipBack, 
  SkipForward, 
  Shuffle, 
  Repeat, 
  Download, 
  Heart, 
  List, 
  Menu 
} from "lucide-react";

interface Song {
  id: string;
  title: string;
  url: string;
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

export const MJPlayer = () => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isMysongsMode, setIsMysongsMode] = useState(true);
  const [mySongs, setMySongs] = useState<Song[]>([]);
  const [youtubeSongs, setYoutubeSongs] = useState<Song[]>([]);
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [showPlaylist, setShowPlaylist] = useState(false);
  const [sideMenuOpen, setSideMenuOpen] = useState(false);
  
  const [playerState, setPlayerState] = useState<PlayerState>({
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    currentSongIndex: 0,
    volume: 0.7,
    shuffle: false,
    repeat: false,
  });

  const currentPlaylist = isMysongsMode ? mySongs : youtubeSongs;
  const currentSong = currentPlaylist[playerState.currentSongIndex];

  // Load data from localStorage on mount
  useEffect(() => {
    const savedMySongs = localStorage.getItem("mjplayer-mysongs");
    const savedYoutubeSongs = localStorage.getItem("mjplayer-youtube");
    const savedMode = localStorage.getItem("mjplayer-mode");
    
    if (savedMySongs) setMySongs(JSON.parse(savedMySongs));
    if (savedYoutubeSongs) setYoutubeSongs(JSON.parse(savedYoutubeSongs));
    if (savedMode) setIsMysongsMode(savedMode === "mysongs");
  }, []);

  // Save data to localStorage when changed
  useEffect(() => {
    localStorage.setItem("mjplayer-mysongs", JSON.stringify(mySongs));
  }, [mySongs]);

  useEffect(() => {
    localStorage.setItem("mjplayer-youtube", JSON.stringify(youtubeSongs));
  }, [youtubeSongs]);

  useEffect(() => {
    localStorage.setItem("mjplayer-mode", isMysongsMode ? "mysongs" : "youtube");
  }, [isMysongsMode]);

  // Audio event handlers
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
    if (currentPlaylist.length === 0) return;
    
    let nextIndex;
    if (playerState.shuffle) {
      nextIndex = Math.floor(Math.random() * currentPlaylist.length);
    } else {
      nextIndex = (playerState.currentSongIndex + 1) % currentPlaylist.length;
    }
    
    setPlayerState(prev => ({ ...prev, currentSongIndex: nextIndex }));
  };

  const prevSong = () => {
    if (currentPlaylist.length === 0) return;
    
    const prevIndex = playerState.currentSongIndex === 0 
      ? currentPlaylist.length - 1 
      : playerState.currentSongIndex - 1;
    
    setPlayerState(prev => ({ ...prev, currentSongIndex: prevIndex }));
  };

  const seekTo = (value: number[]) => {
    const audio = audioRef.current;
    if (!audio) return;
    
    audio.currentTime = value[0];
    setPlayerState(prev => ({ ...prev, currentTime: value[0] }));
  };

  const addMySong = () => {
    const title = prompt("Song Name:");
    if (!title) return;
    
    const url = prompt("TeraBox Direct Download Link:");
    if (!url) return;
    
    const newSong: Song = {
      id: Date.now().toString(),
      title,
      url,
    };
    
    setMySongs(prev => [...prev, newSong]);
  };

  const addYoutubeSong = () => {
    if (!youtubeUrl.trim()) return;
    
    // Extract video ID from YouTube URL
    const videoId = youtubeUrl.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/);
    if (!videoId) {
      alert("Invalid YouTube URL");
      return;
    }
    
    // In a real app, you'd use a YouTube API or extraction service
    // For demo purposes, we'll use a placeholder
    const title = `YouTube Video ${videoId[1]}`;
    const audioUrl = `https://example.com/youtube-audio/${videoId[1]}.mp3`; // Placeholder
    
    const newSong: Song = {
      id: Date.now().toString(),
      title,
      url: audioUrl,
    };
    
    setYoutubeSongs(prev => [...prev, newSong]);
    setYoutubeUrl("");
  };

  const formatTime = (time: number) => {
    if (isNaN(time)) return "0:00";
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700&display=swap" rel="stylesheet" />
      
      {/* Header */}
      <header className="flex items-center justify-between p-4 border-b border-border">
        <h1 className="text-2xl font-bold text-primary">MJ Player</h1>
        <Sheet open={sideMenuOpen} onOpenChange={setSideMenuOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon">
              <Menu className="h-6 w-6" />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-80">
            <div className="space-y-6 pt-6">
              <div className="flex items-center space-x-2">
                <Switch 
                  id="mode-switch" 
                  checked={!isMysongsMode}
                  onCheckedChange={(checked) => setIsMysongsMode(!checked)}
                />
                <Label htmlFor="mode-switch">
                  {isMysongsMode ? "My Songs" : "YouTube"}
                </Label>
              </div>
              
              <Button 
                onClick={addMySong}
                className="w-full"
                variant="outline"
              >
                Add My Song (Link)
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      </header>

      {/* Main Player Area */}
      <div className="flex flex-col items-center justify-center p-8 space-y-8">
        {/* Vinyl Record */}
        <div className="relative">
          <img 
            src="/lovable-uploads/66998a74-a7e0-4bb4-bc94-9e833b61c7b8.png"
            alt="Vinyl Record"
            className={`w-48 h-48 rounded-full ${
              playerState.isPlaying ? "vinyl-spinning" : ""
            }`}
          />
        </div>

        {/* Song Info */}
        <div className="text-center">
          <h2 className="text-xl font-semibold">
            {currentSong?.title || "No song selected"}
          </h2>
        </div>

        {/* Action Icons */}
        <div className="flex items-center space-x-8">
          <a
            href={isMysongsMode && currentSong ? currentSong.url : "#"}
            download={isMysongsMode && currentSong ? currentSong.title : undefined}
            className={`${
              !isMysongsMode || !currentSong ? "pointer-events-none opacity-50" : ""
            }`}
          >
            <Button variant="ghost" size="icon" disabled={!isMysongsMode || !currentSong}>
              <Download className="h-6 w-6" />
            </Button>
          </a>
          
          <Button variant="ghost" size="icon">
            <Heart className="h-6 w-6" />
          </Button>
          
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => setShowPlaylist(!showPlaylist)}
          >
            <List className="h-6 w-6" />
          </Button>
        </div>

        {/* Playback Controls */}
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setPlayerState(prev => ({ ...prev, shuffle: !prev.shuffle }))}
            className={playerState.shuffle ? "text-primary" : ""}
          >
            <Shuffle className="h-5 w-5" />
          </Button>
          
          <Button variant="ghost" size="icon" onClick={prevSong}>
            <SkipBack className="h-6 w-6" />
          </Button>
          
          <Button 
            variant="outline" 
            size="icon" 
            className="h-12 w-12"
            onClick={togglePlay}
            disabled={!currentSong}
          >
            {playerState.isPlaying ? (
              <Pause className="h-6 w-6" />
            ) : (
              <Play className="h-6 w-6" />
            )}
          </Button>
          
          <Button variant="ghost" size="icon" onClick={nextSong}>
            <SkipForward className="h-6 w-6" />
          </Button>
          
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setPlayerState(prev => ({ ...prev, repeat: !prev.repeat }))}
            className={playerState.repeat ? "text-primary" : ""}
          >
            <Repeat className="h-5 w-5" />
          </Button>
        </div>

        {/* Seek Bar */}
        <div className="w-full max-w-md space-y-2">
          <Slider
            value={[playerState.currentTime]}
            max={playerState.duration || 100}
            step={1}
            onValueChange={seekTo}
            className="w-full"
            disabled={!currentSong}
          />
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>{formatTime(playerState.currentTime)}</span>
            <span>{formatTime(playerState.duration)}</span>
          </div>
        </div>

        {/* Playlist Display */}
        {showPlaylist && (
          <div className="w-full max-w-md bg-card p-4 rounded-lg">
            <h3 className="font-semibold mb-2">
              {isMysongsMode ? "My Songs" : "YouTube Playlist"}
            </h3>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {currentPlaylist.map((song, index) => (
                <div
                  key={song.id}
                  className={`p-2 rounded cursor-pointer ${
                    index === playerState.currentSongIndex
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-secondary"
                  }`}
                  onClick={() => setPlayerState(prev => ({ ...prev, currentSongIndex: index }))}
                >
                  {song.title}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* YouTube Input Section */}
      {!isMysongsMode && (
        <div className="fixed bottom-20 left-0 right-0 p-4 bg-card border-t border-border">
          <div className="flex space-x-2 max-w-md mx-auto">
            <Input
              placeholder="YouTube link yahan daalein"
              value={youtubeUrl}
              onChange={(e) => setYoutubeUrl(e.target.value)}
              className="flex-1"
            />
            <Button 
              onClick={addYoutubeSong}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Add song
            </Button>
          </div>
        </div>
      )}

      {/* Ad Placeholder */}
      <div 
        id="adsterra-banner-ad" 
        className="fixed bottom-0 left-0 right-0 h-16 bg-muted flex items-center justify-center text-muted-foreground"
      >
        Advertisement Placeholder
      </div>

      {/* Audio Element */}
      {currentSong && (
        <audio
          ref={audioRef}
          src={currentSong.url}
          onPlay={() => setPlayerState(prev => ({ ...prev, isPlaying: true }))}
          onPause={() => setPlayerState(prev => ({ ...prev, isPlaying: false }))}
        />
      )}
    </div>
  );
};