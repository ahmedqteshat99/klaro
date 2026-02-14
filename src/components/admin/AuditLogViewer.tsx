import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, Search, Shield } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface AuditLogEntry {
  id: string;
  admin_user_id: string;
  action: string;
  target_user_id: string | null;
  target_table: string | null;
  target_record_id: string | null;
  query_details: any;
  created_at: string;
  admin_name?: string;
  admin_email?: string;
  target_user_name?: string;
  target_user_email?: string;
}

const ACTION_LABELS: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  view_profile: { label: "Profil ansehen", variant: "default" },
  view_documents: { label: "Dokumente ansehen", variant: "default" },
  export_user_data: { label: "Daten exportiert", variant: "secondary" },
  delete_account: { label: "Konto gelöscht", variant: "destructive" },
  view_applications: { label: "Bewerbungen ansehen", variant: "default" },
  view_messages: { label: "Nachrichten ansehen", variant: "default" },
};

export default function AuditLogViewer() {
  const { toast } = useToast();
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchEmail, setSearchEmail] = useState("");
  const [limit, setLimit] = useState(50);

  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      let query = supabase
        .from("user_data_access_log")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit);

      if (searchEmail) {
        query = query.or(`admin_email.ilike.%${searchEmail}%,target_user_email.ilike.%${searchEmail}%`);
      }

      const { data, error } = await query;

      if (error) throw error;

      setLogs(data || []);
    } catch (error) {
      console.error("Error fetching audit logs:", error);
      toast({
        title: "Fehler beim Laden",
        description: "Die Audit-Logs konnten nicht geladen werden.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("de-DE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getActionBadge = (action: string) => {
    const actionInfo = ACTION_LABELS[action] || { label: action, variant: "outline" as const };
    return (
      <Badge variant={actionInfo.variant}>
        {actionInfo.label}
      </Badge>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Admin Audit-Logs
        </CardTitle>
        <CardDescription>
          Überwachung aller Admin-Zugriffe auf Benutzerdaten (DSGVO Art. 5(2) Rechenschaftspflicht)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <div className="flex-1 space-y-2">
            <Label htmlFor="search-email">Nach E-Mail filtern</Label>
            <Input
              id="search-email"
              type="email"
              placeholder="benutzer@example.com oder admin@example.com"
              value={searchEmail}
              onChange={(e) => setSearchEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && fetchLogs()}
            />
          </div>
          <div className="flex items-end gap-2">
            <Button onClick={fetchLogs} disabled={isLoading} variant="outline">
              {isLoading ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Search className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Zeitpunkt</TableHead>
                <TableHead>Admin</TableHead>
                <TableHead>Aktion</TableHead>
                <TableHead>Betroffener Benutzer</TableHead>
                <TableHead>Tabelle</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    {isLoading ? "Lädt..." : "Keine Audit-Logs gefunden"}
                  </TableCell>
                </TableRow>
              ) : (
                logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="text-sm">
                      {formatDate(log.created_at)}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <p className="font-medium">{log.admin_name || "Unbekannt"}</p>
                        <p className="text-muted-foreground text-xs">{log.admin_email}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      {getActionBadge(log.action)}
                    </TableCell>
                    <TableCell>
                      {log.target_user_name ? (
                        <div className="text-sm">
                          <p className="font-medium">{log.target_user_name}</p>
                          <p className="text-muted-foreground text-xs">{log.target_user_email}</p>
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {log.target_table || "—"}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <p>Zeige {logs.length} Einträge</p>
          <div className="flex items-center gap-2">
            <Label htmlFor="limit">Limit:</Label>
            <select
              id="limit"
              value={limit}
              onChange={(e) => {
                setLimit(Number(e.target.value));
                fetchLogs();
              }}
              className="border rounded px-2 py-1 text-sm"
            >
              <option value="25">25</option>
              <option value="50">50</option>
              <option value="100">100</option>
              <option value="200">200</option>
            </select>
          </div>
        </div>

        <div className="rounded-lg bg-muted/50 p-4 text-sm text-muted-foreground">
          <p className="font-medium mb-2">Audit-Log Aufbewahrung:</p>
          <ul className="list-disc pl-5 space-y-1 text-xs">
            <li>Alle Admin-Zugriffe auf Benutzerdaten werden protokolliert</li>
            <li>Logs werden für 2 Jahre aufbewahrt (DSGVO-Anforderung)</li>
            <li>Automatische Löschung nach Ablauf der Aufbewahrungsfrist</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
