import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Search } from "lucide-react";

interface AdminUserRow {
  user_id: string;
  email: string | null;
  role: string | null;
  created_at: string | null;
  last_seen_at: string | null;
  vorname: string | null;
  nachname: string | null;
  cvCount: number;
  anschreibenCount: number;
}

const formatDateTime = (value: string | null) => {
  if (!value) return "-";
  return new Date(value).toLocaleString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const AdminUsersPage = () => {
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const loadUsers = async () => {
      setIsLoading(true);
      setError(null);

      const [profilesRes, docsRes] = await Promise.all([
        supabase
          .from("profiles")
          .select("user_id, email, role, created_at, last_seen_at, vorname, nachname")
          .order("created_at", { ascending: false }),
        supabase
          .from("document_versions")
          .select("user_id, typ"),
      ]);

      if (profilesRes.error) {
        setError(profilesRes.error.message);
        setIsLoading(false);
        return;
      }

      if (docsRes.error) {
        setError(docsRes.error.message);
        setIsLoading(false);
        return;
      }

      const counts = new Map<string, { cv: number; anschreiben: number }>();
      (docsRes.data ?? []).forEach((doc) => {
        const entry = counts.get(doc.user_id) ?? { cv: 0, anschreiben: 0 };
        if (doc.typ === "CV") entry.cv += 1;
        if (doc.typ === "Anschreiben") entry.anschreiben += 1;
        counts.set(doc.user_id, entry);
      });

      const mapped = (profilesRes.data ?? []).map((profile) => {
        const count = counts.get(profile.user_id) ?? { cv: 0, anschreiben: 0 };
        return {
          user_id: profile.user_id,
          email: profile.email,
          role: profile.role,
          created_at: profile.created_at,
          last_seen_at: profile.last_seen_at,
          vorname: profile.vorname,
          nachname: profile.nachname,
          cvCount: count.cv,
          anschreibenCount: count.anschreiben,
        } as AdminUserRow;
      });

      setUsers(mapped);
      setIsLoading(false);
    };

    void loadUsers();
  }, []);

  const filteredUsers = useMemo(() => {
    if (!search.trim()) return users;
    const term = search.toLowerCase();
    return users.filter((user) => {
      const haystack = [
        user.email,
        user.vorname,
        user.nachname,
        user.user_id,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(term);
    });
  }, [search, users]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Fehler</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          {error}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Benutzer</h1>
        <p className="text-sm text-muted-foreground">
          Alle registrierten Nutzer mit Aktivitätsstatus.
        </p>
      </div>

      <Card>
        <CardHeader className="space-y-3">
          <CardTitle className="text-base">Suche</CardTitle>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="E-Mail, Name oder ID"
              className="pl-9"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>E-Mail</TableHead>
                <TableHead>Rolle</TableHead>
                <TableHead>Erstellt</TableHead>
                <TableHead>Letzter Zugriff</TableHead>
                <TableHead>CVs</TableHead>
                <TableHead>Anschreiben</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map((user) => (
                <TableRow
                  key={user.user_id}
                  className="cursor-pointer"
                  onClick={() => navigate(`/admin/users/${user.user_id}`)}
                  tabIndex={0}
                  role="button"
                  aria-label={`Benutzer ${user.email ?? user.user_id} öffnen`}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      navigate(`/admin/users/${user.user_id}`);
                    }
                  }}
                >
                  <TableCell className="font-medium">
                    {user.email || `${user.vorname ?? ""} ${user.nachname ?? ""}`.trim() || user.user_id}
                  </TableCell>
                  <TableCell>{user.role ?? "USER"}</TableCell>
                  <TableCell>{formatDateTime(user.created_at)}</TableCell>
                  <TableCell>{formatDateTime(user.last_seen_at)}</TableCell>
                  <TableCell>{user.cvCount}</TableCell>
                  <TableCell>{user.anschreibenCount}</TableCell>
                </TableRow>
              ))}
              {filteredUsers.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-sm text-muted-foreground">
                    Keine Nutzer gefunden.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminUsersPage;
