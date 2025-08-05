import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Trash2, Edit, Ban, Shield } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface Category {
  id: string;
  name: string;
  description?: string;
}

interface Song {
  id: string;
  title: string;
  artist?: string;
  url: string;
  category_id?: string;
  uploaded_by?: string;
  created_at: string;
}

interface User {
  id: string;
  email: string;
  full_name?: string;
  created_at: string;
  banned?: boolean;
}

export const AdminPanel = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // Song management
  const [songs, setSongs] = useState<Song[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [newSong, setNewSong] = useState({
    title: "",
    artist: "",
    url: "",
    category_id: ""
  });
  
  // Category management
  const [newCategory, setNewCategory] = useState({
    name: "",
    description: ""
  });
  
  // User management
  const [users, setUsers] = useState<User[]>([]);

  useEffect(() => {
    checkAdminRole();
  }, [user]);

  const checkAdminRole = async () => {
    if (!user) {
      navigate("/auth");
      return;
    }

    try {
      const { data, error } = await supabase.rpc('has_role', {
        _user_id: user.id,
        _role: 'admin'
      });
      
      if (error) {
        console.error("Error checking admin role:", error);
        toast({ title: "Access Denied", description: "You don't have admin privileges", variant: "destructive" });
        navigate("/");
        return;
      }
      
      setIsAdmin(data);
      if (data) {
        loadData();
      } else {
        toast({ title: "Access Denied", description: "You don't have admin privileges", variant: "destructive" });
        navigate("/");
      }
    } catch (error) {
      console.error("Error:", error);
      navigate("/");
    } finally {
      setLoading(false);
    }
  };

  const loadData = async () => {
    await Promise.all([
      loadSongs(),
      loadCategories(),
      loadUsers()
    ]);
  };

  const loadSongs = async () => {
    try {
      const { data, error } = await supabase
        .from("songs")
        .select(`
          *,
          categories(name)
        `)
        .order("created_at", { ascending: false });
      
      if (error) {
        toast({ title: "Error", description: error.message, variant: "destructive" });
      } else {
        setSongs(data || []);
      }
    } catch (error) {
      console.error("Error loading songs:", error);
    }
  };

  const loadCategories = async () => {
    try {
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .order("name");
      
      if (error) {
        toast({ title: "Error", description: error.message, variant: "destructive" });
      } else {
        setCategories(data || []);
      }
    } catch (error) {
      console.error("Error loading categories:", error);
    }
  };

  const loadUsers = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select(`
          id,
          user_id,
          full_name,
          created_at,
          updated_at
        `)
        .order("created_at", { ascending: false });
      
      if (error) {
        toast({ title: "Error", description: error.message, variant: "destructive" });
      } else {
        // Transform the data to match User interface
        const transformedUsers = (data || []).map(profile => ({
          id: profile.user_id,
          email: `user${profile.user_id.slice(-4)}@example.com`, // Placeholder since we can't get email from profiles
          full_name: profile.full_name,
          created_at: profile.created_at,
          banned: false // We'll implement this later
        }));
        setUsers(transformedUsers);
      }
    } catch (error) {
      console.error("Error loading users:", error);
    }
  };

  const addSong = async () => {
    if (!newSong.title || !newSong.url) {
      toast({ title: "Error", description: "Title and URL are required", variant: "destructive" });
      return;
    }

    try {
      const { error } = await supabase.from("songs").insert({
        title: newSong.title,
        artist: newSong.artist || null,
        url: newSong.url,
        category_id: newSong.category_id || null,
        uploaded_by: user?.id,
      });

      if (error) {
        toast({ title: "Error", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Success", description: "Song added successfully!" });
        setNewSong({ title: "", artist: "", url: "", category_id: "" });
        loadSongs();
      }
    } catch (error) {
      console.error("Error adding song:", error);
      toast({ title: "Error", description: "Failed to add song", variant: "destructive" });
    }
  };

  const deleteSong = async (songId: string) => {
    if (!confirm("Are you sure you want to delete this song?")) return;

    try {
      const { error } = await supabase
        .from("songs")
        .delete()
        .eq("id", songId);

      if (error) {
        toast({ title: "Error", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Success", description: "Song deleted successfully!" });
        loadSongs();
      }
    } catch (error) {
      console.error("Error deleting song:", error);
    }
  };

  const addCategory = async () => {
    if (!newCategory.name) {
      toast({ title: "Error", description: "Category name is required", variant: "destructive" });
      return;
    }

    try {
      const { error } = await supabase.from("categories").insert({
        name: newCategory.name,
        description: newCategory.description || null,
      });

      if (error) {
        toast({ title: "Error", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Success", description: "Category added successfully!" });
        setNewCategory({ name: "", description: "" });
        loadCategories();
      }
    } catch (error) {
      console.error("Error adding category:", error);
    }
  };

  const deleteCategory = async (categoryId: string) => {
    if (!confirm("Are you sure you want to delete this category?")) return;

    try {
      const { error } = await supabase
        .from("categories")
        .delete()
        .eq("id", categoryId);

      if (error) {
        toast({ title: "Error", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Success", description: "Category deleted successfully!" });
        loadCategories();
      }
    } catch (error) {
      console.error("Error deleting category:", error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading Admin Panel...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold">Admin Panel</h1>
          <Button onClick={() => navigate("/")} variant="outline">
            Back to Player
          </Button>
        </div>

        <Tabs defaultValue="songs" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="songs">Songs</TabsTrigger>
            <TabsTrigger value="categories">Categories</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="songs" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Add New Song</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="title">Song Title *</Label>
                    <Input
                      id="title"
                      value={newSong.title}
                      onChange={(e) => setNewSong(prev => ({ ...prev, title: e.target.value }))}
                      placeholder="Enter song title"
                    />
                  </div>
                  <div>
                    <Label htmlFor="artist">Artist</Label>
                    <Input
                      id="artist"
                      value={newSong.artist}
                      onChange={(e) => setNewSong(prev => ({ ...prev, artist: e.target.value }))}
                      placeholder="Enter artist name"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="url">Direct Download URL *</Label>
                  <Input
                    id="url"
                    value={newSong.url}
                    onChange={(e) => setNewSong(prev => ({ ...prev, url: e.target.value }))}
                    placeholder="Enter direct download link"
                  />
                </div>
                <div>
                  <Label htmlFor="category">Category</Label>
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
                <Button onClick={addSong} className="w-full">
                  Add Song
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Manage Songs ({songs.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {songs.map((song) => (
                    <div key={song.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex-1">
                        <h3 className="font-semibold">{song.title}</h3>
                        {song.artist && <p className="text-sm text-muted-foreground">{song.artist}</p>}
                        <p className="text-xs text-muted-foreground">
                          Added: {new Date(song.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => deleteSong(song.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="categories" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Add New Category</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="categoryName">Category Name *</Label>
                  <Input
                    id="categoryName"
                    value={newCategory.name}
                    onChange={(e) => setNewCategory(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Enter category name"
                  />
                </div>
                <div>
                  <Label htmlFor="categoryDesc">Description</Label>
                  <Textarea
                    id="categoryDesc"
                    value={newCategory.description}
                    onChange={(e) => setNewCategory(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Enter category description"
                  />
                </div>
                <Button onClick={addCategory} className="w-full">
                  Add Category
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Manage Categories ({categories.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {categories.map((category) => (
                    <div key={category.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <h3 className="font-semibold">{category.name}</h3>
                        {category.description && (
                          <p className="text-sm text-muted-foreground">{category.description}</p>
                        )}
                      </div>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => deleteCategory(category.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="users" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>User Management ({users.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {users.map((user) => (
                    <div key={user.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <h3 className="font-semibold">{user.full_name || "No Name"}</h3>
                        <p className="text-sm text-muted-foreground">{user.email}</p>
                        <p className="text-xs text-muted-foreground">
                          Joined: {new Date(user.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={user.banned ? "destructive" : "default"}>
                          {user.banned ? "Banned" : "Active"}
                        </Badge>
                        <Button size="sm" variant="outline">
                          <Ban className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Payment Gateway Settings</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Razorpay integration will be added here for premium features.</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};