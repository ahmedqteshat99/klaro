import { useRef, useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PenTool, Trash2, Save, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { resolveUserFilePath, useUserFileUrl } from "@/hooks/useUserFileUrl";
import type { Profile } from "@/hooks/useProfile";

interface SignatureCanvasProps {
  profile: Profile | null;
  userId: string | null;
  onSave: (data: Partial<Profile>) => Promise<void>;
}

const SignatureCanvas = ({ profile, userId, onSave }: SignatureCanvasProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasContent, setHasContent] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();
  const { url: signaturUrl } = useUserFileUrl(profile?.signatur_url);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set canvas size
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * window.devicePixelRatio;
    canvas.height = rect.height * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    // Set drawing style
    ctx.strokeStyle = "#1a1a2e";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    // Fill white background
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, rect.width, rect.height);
  }, []);

  const getCoordinates = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    const rect = canvas.getBoundingClientRect();
    if ("touches" in e) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top
      };
    }
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    const coords = getCoordinates(e);
    if (!coords) return;

    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;

    ctx.beginPath();
    ctx.moveTo(coords.x, coords.y);
    setIsDrawing(true);
    setHasContent(true);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    e.preventDefault();

    const coords = getCoordinates(e);
    if (!coords) return;

    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;

    ctx.lineTo(coords.x, coords.y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const rect = canvas.getBoundingClientRect();
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, rect.width, rect.height);
    setHasContent(false);
  };

  const saveSignature = async () => {
    if (!canvasRef.current || !userId) return;

    setIsSaving(true);
    try {
      // Convert canvas to blob
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvasRef.current!.toBlob(
          (blob) => (blob ? resolve(blob) : reject(new Error("Failed to create blob"))),
          "image/png"
        );
      });

      const fileName = `${userId}/signatur.png`;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from("user-files")
        .upload(fileName, blob, { upsert: true });

      if (uploadError) throw uploadError;

      // Save to profile
      await onSave({ signatur_url: fileName });

      toast({
        title: "Erfolgreich",
        description: "Unterschrift wurde gespeichert."
      });
    } catch (error: any) {
      console.error("Save error:", error);
      toast({
        title: "Fehler",
        description: error.message || "Speichern fehlgeschlagen.",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const deleteSignature = async () => {
    if (!profile?.signatur_url || !userId) return;

    try {
      const filePath = resolveUserFilePath(profile.signatur_url);
      if (filePath) {
        await supabase.storage
          .from("user-files")
          .remove([filePath]);
      }

      await onSave({ signatur_url: null });
      clearCanvas();

      toast({
        title: "Gelöscht",
        description: "Unterschrift wurde entfernt."
      });
    } catch (error: any) {
      toast({
        title: "Fehler",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <PenTool className="h-5 w-5" />
          Unterschrift
        </CardTitle>
        <CardDescription>
          Zeichnen Sie Ihre Unterschrift für Anschreiben und Lebenslauf
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {signaturUrl && (
          <div className="mb-4">
            <p className="text-sm text-muted-foreground mb-2">Aktuelle Unterschrift:</p>
            <img 
              src={signaturUrl} 
              alt="Gespeicherte Unterschrift" 
              className="h-16 border rounded"
            />
          </div>
        )}

        <div className="border rounded-lg overflow-hidden bg-white">
          <canvas
            ref={canvasRef}
            className="w-full h-32 cursor-crosshair touch-none"
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            onTouchStart={startDrawing}
            onTouchMove={draw}
            onTouchEnd={stopDrawing}
          />
        </div>

        <div className="flex gap-2 justify-between">
          <Button variant="outline" onClick={clearCanvas} disabled={!hasContent}>
            <Trash2 className="mr-2 h-4 w-4" />
            Löschen
          </Button>
          <div className="flex gap-2">
            {profile?.signatur_url && (
              <Button variant="outline" onClick={deleteSignature}>
                Entfernen
              </Button>
            )}
            <Button onClick={saveSignature} disabled={!hasContent || isSaving}>
              {isSaving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Speichern
            </Button>
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          Zeichnen Sie mit der Maus oder dem Finger auf Touchscreens.
        </p>
      </CardContent>
    </Card>
  );
};

export default SignatureCanvas;
