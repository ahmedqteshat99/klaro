import { useState, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Camera, Upload, Trash2, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { resolveUserFilePath, useUserFileUrl } from "@/hooks/useUserFileUrl";
import type { Profile } from "@/hooks/useProfile";

interface PhotoUploadProps {
  profile: Profile | null;
  userId: string | null;
  onSave: (data: Partial<Profile>) => Promise<void>;
}

const PhotoUpload = ({ profile, userId, onSave }: PhotoUploadProps) => {
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { url: photoUrl } = useUserFileUrl(profile?.foto_url);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !userId) return;

    // Validate file
    if (!file.type.startsWith("image/")) {
      toast({
        title: "Ungültiger Dateityp",
        description: "Bitte wählen Sie eine Bilddatei.",
        variant: "destructive"
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "Datei zu groß",
        description: "Die Datei darf maximal 5MB groß sein.",
        variant: "destructive"
      });
      return;
    }

    setIsUploading(true);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${userId}/foto.${fileExt}`;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from("user-files")
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Save to profile
      await onSave({ foto_url: fileName });

      toast({
        title: "Erfolgreich",
        description: "Profilfoto wurde hochgeladen."
      });
    } catch (error: any) {
      console.error("Upload error:", error);
      toast({
        title: "Fehler beim Hochladen",
        description: error.message || "Bitte versuchen Sie es erneut.",
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleDelete = async () => {
    if (!profile?.foto_url || !userId) return;

    try {
      // Delete from storage
      const filePath = resolveUserFilePath(profile.foto_url);
      if (filePath) {
        await supabase.storage
          .from("user-files")
          .remove([filePath]);
      }

      // Update profile
      await onSave({ foto_url: null });

      toast({
        title: "Gelöscht",
        description: "Profilfoto wurde entfernt."
      });
    } catch (error: any) {
      toast({
        title: "Fehler",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const initials = profile
    ? `${profile.vorname?.charAt(0) || ""}${profile.nachname?.charAt(0) || ""}`
    : "?";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Camera className="h-5 w-5" />
          Profilfoto
        </CardTitle>
        <CardDescription>
          Ihr Bewerbungsfoto für den Lebenslauf
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-center gap-4">
        <Avatar className="h-32 w-32 border-4 border-border">
          <AvatarImage src={photoUrl || undefined} alt="Profilfoto" />
          <AvatarFallback className="text-2xl">{initials}</AvatarFallback>
        </Avatar>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileSelect}
        />

        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
          >
            {isUploading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Upload className="mr-2 h-4 w-4" />
            )}
            {profile?.foto_url ? "Ändern" : "Hochladen"}
          </Button>
          {profile?.foto_url && (
            <Button variant="outline" onClick={handleDelete}>
              <Trash2 className="mr-2 h-4 w-4" />
              Entfernen
            </Button>
          )}
        </div>

        <p className="text-xs text-muted-foreground text-center">
          Empfohlen: Passfoto-Format, max. 5MB
        </p>
      </CardContent>
    </Card>
  );
};

export default PhotoUpload;
