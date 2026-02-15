import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Loader2, MessageCircle, Sparkles, Send, Trash2 } from "lucide-react";
import { enhanceAnschreiben } from "@/lib/api/generation";
import { useToast } from "@/hooks/use-toast";

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface AnschreibenEnhancerProps {
  currentHtml: string | null;
  onHtmlUpdated: (html: string) => void;
  disabled?: boolean;
}

const AnschreibenEnhancer = ({ currentHtml, onHtmlUpdated, disabled }: AnschreibenEnhancerProps) => {
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isProcessing) return;

    const userMessage: Message = {
      role: "user",
      content: inputValue.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");
    setIsProcessing(true);

    try {
      const conversationHistory = messages.map((msg) => ({
        role: msg.role,
        content: msg.content,
      }));

      const result = await enhanceAnschreiben({
        currentHtml,
        userMessage: userMessage.content,
        conversationHistory,
      });

      if (!result.success || !result.message) {
        throw new Error(result.error || "Konnte keine Antwort generieren");
      }

      const assistantMessage: Message = {
        role: "assistant",
        content: result.message,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);

      // If HTML was updated, notify parent
      if (result.updatedHtml) {
        onHtmlUpdated(result.updatedHtml);
        toast({
          title: "Anschreiben aktualisiert",
          description: "Die Änderungen wurden in der Vorschau übernommen.",
        });
      }
    } catch (error) {
      console.error("Enhancement error:", error);
      toast({
        title: "Fehler",
        description: error instanceof Error ? error.message : "Anfrage konnte nicht verarbeitet werden.",
        variant: "destructive",
      });

      const errorMessage: Message = {
        role: "assistant",
        content: "Entschuldigung, es gab einen Fehler bei der Verarbeitung Ihrer Anfrage. Bitte versuchen Sie es erneut.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsProcessing(false);
      textareaRef.current?.focus();
    }
  };

  const handleClearConversation = () => {
    setMessages([]);
    toast({
      title: "Konversation gelöscht",
      description: "Der Chat-Verlauf wurde zurückgesetzt.",
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("de-DE", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Anschreiben verbessern
            </CardTitle>
            <CardDescription className="mt-1.5">
              {currentHtml
                ? "Sagen Sie mir, wie ich Ihr Anschreiben verbessern soll"
                : "Beschreiben Sie, was Ihr Anschreiben enthalten soll"}
            </CardDescription>
          </div>
          {messages.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearConversation}
              className="shrink-0"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Messages Display */}
        {messages.length > 0 && (
          <ScrollArea ref={scrollAreaRef} className="h-[320px] pr-4">
            <div className="space-y-4">
              {messages.map((msg, index) => (
                <div
                  key={index}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[85%] rounded-lg px-4 py-3 ${
                      msg.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted"
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      {msg.role === "assistant" && (
                        <MessageCircle className="h-3.5 w-3.5 opacity-70" />
                      )}
                      <span className="text-xs opacity-70">{formatTime(msg.timestamp)}</span>
                    </div>
                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}

        {/* Suggestions when no messages */}
        {messages.length === 0 && (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground mb-3">Beispiele:</p>
            <div className="grid grid-cols-1 gap-2">
              {[
                "Mach es formaler und professioneller",
                "Betone mehr meine Erfahrung in der Kardiologie",
                "Kürze es auf eine Seite",
                "Füge einen Absatz über meine Motivation hinzu",
              ].map((suggestion, index) => (
                <Button
                  key={index}
                  variant="outline"
                  size="sm"
                  className="justify-start text-left h-auto py-2 px-3"
                  onClick={() => setInputValue(suggestion)}
                  disabled={disabled || isProcessing}
                >
                  <Badge variant="secondary" className="mr-2 shrink-0">
                    {index + 1}
                  </Badge>
                  <span className="text-xs">{suggestion}</span>
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Input Area */}
        <div className="space-y-2">
          <Textarea
            ref={textareaRef}
            placeholder={
              currentHtml
                ? "z.B. 'Mach es formaler' oder 'Betone meine Kardiologie-Erfahrung'"
                : "z.B. 'Erstelle ein Anschreiben für eine Assistenzarztstelle in der Inneren Medizin'"
            }
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={disabled || isProcessing}
            className="min-h-[80px] resize-none"
          />
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              Enter zum Senden, Shift+Enter für neue Zeile
            </p>
            <Button
              onClick={handleSendMessage}
              disabled={disabled || isProcessing || !inputValue.trim()}
              size="sm"
            >
              {isProcessing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              <span className="ml-2">Senden</span>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default AnschreibenEnhancer;
