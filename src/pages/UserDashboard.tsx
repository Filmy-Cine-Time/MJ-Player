import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Copy, Download, Music, Users, Gift, Crown } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface UserSubscription {
  id: string;
  plan: '2month' | '1year';
  expires_at: string;
  songs_uploaded: number;
  storage_used: number; // in MB
  is_active: boolean;
}

interface UserSong {
  id: string;
  title: string;
  artist?: string;
  url: string;
  category_id?: string;
  created_at: string;
  plays: number;
}

interface ReferralStats {
  total_referrals: number;
  points: number;
  pending_withdrawals: number;
}

export const UserDashboard = () => {
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  
  // User data
  const [subscription, setSubscription] = useState<UserSubscription | null>(null);
  const [userSongs, setUserSongs] = useState<UserSong[]>([]);
  const [referralStats, setReferralStats] = useState<ReferralStats>({
    total_referrals: 0,
    points: 0,
    pending_withdrawals: 0
  });
  const [categories, setCategories] = useState<any[]>([]);
  
  // Premium upload form
  const [newSong, setNewSong] = useState({
    title: "",
    artist: "",
    url: "",
    category_id: ""
  });

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }
    loadUserData();
  }, [user]);

  const loadUserData = async () => {
    try {
      await Promise.all([
        loadSubscription(),
        loadUserSongs(),
        loadReferralStats(),
        loadCategories()
      ]);
    } catch (error) {
      console.error("Error loading user data:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadSubscription = async () => {
    // This will be implemented with payment integration
    // For now, show demo data
    setSubscription({
      id: "demo",
      plan: "1year",
      expires_at: "2025-12-31",
      songs_uploaded: 0,
      storage_used: 0,
      is_active: false
    });
  };

  const loadUserSongs = async () => {
    try {
      const { data, error } = await supabase
        .from("songs")
        .select("*")
        .eq("uploaded_by", user?.id)
        .order("created_at", { ascending: false });
      
      if (error) {
        toast({ title: "Error", description: error.message, variant: "destructive" });
      } else {
        // Transform data to match UserSong interface
        const transformedSongs = (data || []).map(song => ({
          ...song,
          plays: 0 // Default value since plays tracking will be implemented later
        }));
        setUserSongs(transformedSongs);
      }
    } catch (error) {
      console.error("Error loading user songs:", error);
    }
  };

  const loadReferralStats = async () => {
    // This will be implemented with referral system
    setReferralStats({
      total_referrals: 0,
      points: 0,
      pending_withdrawals: 0
    });
  };

  const loadCategories = async () => {
    try {
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .order("name");
      
      if (error) {
        console.error("Error loading categories:", error);
      } else {
        setCategories(data || []);
      }
    } catch (error) {
      console.error("Error loading categories:", error);
    }
  };

  const uploadPremiumSong = async () => {
    if (!subscription?.is_active) {
      toast({ 
        title: "Premium Required", 
        description: "Please upgrade to premium to upload songs", 
        variant: "destructive" 
      });
      return;
    }

    if (!newSong.title || !newSong.url) {
      toast({ title: "Error", description: "Title and URL are required", variant: "destructive" });
      return;
    }

    // Check limits
    const maxSongs = subscription.plan === '2month' ? 5 : 50;
    const maxStorage = subscription.plan === '2month' ? 100 : 1024; // MB
    
    if (userSongs.length >= maxSongs) {
      toast({ 
        title: "Upload Limit Reached", 
        description: `You can only upload ${maxSongs} songs with your current plan`, 
        variant: "destructive" 
      });
      return;
    }

    try {
      const { error } = await supabase.from("songs").insert({
        title: newSong.title,
        artist: newSong.artist || null,
        url: newSong.url,
        category_id: newSong.category_id || null,
        uploaded_by: user?.id,
        is_public: true // User uploaded songs are public
      });

      if (error) {
        toast({ title: "Error", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Success", description: "Song uploaded successfully!" });
        setNewSong({ title: "", artist: "", url: "", category_id: "" });
        loadUserSongs();
      }
    } catch (error) {
      console.error("Error uploading song:", error);
      toast({ title: "Error", description: "Failed to upload song", variant: "destructive" });
    }
  };

  const deleteSong = async (songId: string) => {
    if (!confirm("Are you sure you want to delete this song?")) return;

    try {
      const { error } = await supabase
        .from("songs")
        .delete()
        .eq("id", songId)
        .eq("uploaded_by", user?.id);

      if (error) {
        toast({ title: "Error", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Success", description: "Song deleted successfully!" });
        loadUserSongs();
      }
    } catch (error) {
      console.error("Error deleting song:", error);
    }
  };

  const copyReferralLink = () => {
    const referralLink = `${window.location.origin}?ref=${user?.id}`;
    navigator.clipboard.writeText(referralLink);
    toast({ title: "Copied!", description: "Referral link copied to clipboard" });
  };

  const requestWithdrawal = () => {
    if (referralStats.points < 200) {
      toast({ 
        title: "Insufficient Points", 
        description: "You need at least 200 points to withdraw", 
        variant: "destructive" 
      });
      return;
    }
    
    toast({ 
      title: "Withdrawal Requested", 
      description: "Your withdrawal request has been submitted. You'll receive your Amazon gift voucher within 7 working days." 
    });
  };

  const handleUpgradeToPremium = () => {
    toast({ 
      title: "Premium Upgrade", 
      description: "Payment integration will be implemented here", 
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading Dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold">User Dashboard</h1>
            <p className="text-muted-foreground">Welcome back, {user?.email}</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => navigate("/")} variant="outline">
              Back to Player
            </Button>
            <Button onClick={signOut} variant="destructive">
              Sign Out
            </Button>
          </div>
        </div>

        {/* Subscription Status */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Crown className="h-5 w-5" />
              Subscription Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <Badge variant={subscription?.is_active ? "default" : "secondary"}>
                  {subscription?.is_active ? `${subscription.plan.toUpperCase()} Plan` : "Free Plan"}
                </Badge>
                {subscription?.is_active && (
                  <p className="text-sm text-muted-foreground mt-1">
                    Expires: {new Date(subscription.expires_at).toLocaleDateString()}
                  </p>
                )}
              </div>
              {!subscription?.is_active && (
                <Button onClick={handleUpgradeToPremium} className="flex items-center gap-2">
                  <Crown className="h-4 w-4" />
                  Upgrade to Premium
                </Button>
              )}
            </div>
            
            {subscription?.is_active && (
              <div className="mt-4 space-y-3">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Songs Uploaded</span>
                    <span>{userSongs.length}/{subscription.plan === '2month' ? 5 : 50}</span>
                  </div>
                  <Progress value={(userSongs.length / (subscription.plan === '2month' ? 5 : 50)) * 100} />
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Storage Used</span>
                    <span>{subscription.storage_used}/{subscription.plan === '2month' ? 100 : 1024} MB</span>
                  </div>
                  <Progress value={(subscription.storage_used / (subscription.plan === '2month' ? 100 : 1024)) * 100} />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Tabs defaultValue="songs" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="songs">My Songs</TabsTrigger>
            <TabsTrigger value="upload">Upload Song</TabsTrigger>
            <TabsTrigger value="referrals">Referrals</TabsTrigger>
            <TabsTrigger value="profile">Profile</TabsTrigger>
          </TabsList>

          <TabsContent value="songs" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Music className="h-5 w-5" />
                  My Uploaded Songs ({userSongs.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {userSongs.length === 0 ? (
                  <div className="text-center py-8">
                    <Music className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">No songs uploaded yet</p>
                    <p className="text-sm text-muted-foreground">Upgrade to premium to start uploading your own songs</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {userSongs.map((song) => (
                      <div key={song.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div>
                          <h3 className="font-semibold">{song.title}</h3>
                          {song.artist && <p className="text-sm text-muted-foreground">{song.artist}</p>}
                          <p className="text-xs text-muted-foreground">
                            Uploaded: {new Date(song.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{song.plays || 0} plays</Badge>
                          {subscription?.is_active && (
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => deleteSong(song.id)}
                            >
                              Delete
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="upload" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Upload New Song</CardTitle>
              </CardHeader>
              <CardContent>
                {!subscription?.is_active ? (
                  <div className="text-center py-8">
                    <Crown className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">Premium Feature</h3>
                    <p className="text-muted-foreground mb-4">Upload your own songs and share them with the world</p>
                    <div className="space-y-2 text-sm text-muted-foreground mb-6">
                      <p>• 2 Month Plan (₹50): Upload 5 songs, 100MB storage</p>
                      <p>• 1 Year Plan (₹500): Upload 50 songs, 1GB storage</p>
                    </div>
                    <Button onClick={handleUpgradeToPremium} size="lg">
                      Upgrade to Premium
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="songTitle">Song Title *</Label>
                        <Input
                          id="songTitle"
                          value={newSong.title}
                          onChange={(e) => setNewSong(prev => ({ ...prev, title: e.target.value }))}
                          placeholder="Enter song title"
                        />
                      </div>
                      <div>
                        <Label htmlFor="songArtist">Artist</Label>
                        <Input
                          id="songArtist"
                          value={newSong.artist}
                          onChange={(e) => setNewSong(prev => ({ ...prev, artist: e.target.value }))}
                          placeholder="Enter artist name"
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="songUrl">Direct Download URL *</Label>
                      <Input
                        id="songUrl"
                        value={newSong.url}
                        onChange={(e) => setNewSong(prev => ({ ...prev, url: e.target.value }))}
                        placeholder="Enter TeraBox or direct download link"
                      />
                    </div>
                    <div>
                      <Label htmlFor="songCategory">Category</Label>
                      <Select value={newSong.category_id} onValueChange={(value) => setNewSong(prev => ({ ...prev, category_id: value }))}>
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
                    <Button onClick={uploadPremiumSong} className="w-full">
                      Upload Song
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="referrals" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Referral Program
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary">{referralStats.total_referrals}</div>
                    <p className="text-sm text-muted-foreground">Total Referrals</p>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{referralStats.points}</div>
                    <p className="text-sm text-muted-foreground">Points</p>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-orange-600">{referralStats.pending_withdrawals}</div>
                    <p className="text-sm text-muted-foreground">Pending</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <Label>Your Referral Link</Label>
                    <div className="flex gap-2">
                      <Input
                        value={`${window.location.origin}?ref=${user?.id}`}
                        readOnly
                        className="font-mono text-sm"
                      />
                      <Button onClick={copyReferralLink} size="icon">
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="bg-muted p-4 rounded-lg">
                    <h3 className="font-semibold mb-2">How it works:</h3>
                    <ul className="text-sm space-y-1 text-muted-foreground">
                      <li>• Share your referral link with friends</li>
                      <li>• Earn 10 points for each successful referral</li>
                      <li>• Withdraw points when you reach 200 points</li>
                      <li>• Receive Amazon gift voucher within 7 working days</li>
                    </ul>
                  </div>

                  <Button 
                    onClick={requestWithdrawal} 
                    disabled={referralStats.points < 200}
                    className="w-full"
                  >
                    <Gift className="h-4 w-4 mr-2" />
                    Request Withdrawal (200 points required)
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="profile" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Profile Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Email</Label>
                  <Input value={user?.email || ""} disabled />
                </div>
                <div>
                  <Label>User ID</Label>
                  <Input value={user?.id || ""} disabled className="font-mono text-sm" />
                </div>
                <div>
                  <Label>Account Created</Label>
                  <Input value={user?.created_at ? new Date(user.created_at).toLocaleDateString() : ""} disabled />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};