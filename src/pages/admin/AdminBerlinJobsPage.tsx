import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import {
    Building2,
    CheckCircle2,
    ExternalLink,
    FileText,
    Loader2,
    MapPin,
    RefreshCw,
    Search,
    Sparkles,
    XCircle,
    AlertTriangle,
    Clock,
} from "lucide-react";

// ─── Types ──────────────────────────────────────────────────────

interface BerlinHospital {
    id: string;
    name: string;
    website_url: string | null;
    career_url: string | null;
    career_url_verified: boolean | null;
    dkv_url: string | null;
    last_scraped_at: string | null;
    scrape_status: string | null;
    scrape_error: string | null;
    is_active: boolean;
}

interface BerlinJob {
    id: string;
    hospital_id: string;
    title: string;
    department: string | null;
    apply_url: string | null;
    description: string | null;
    first_seen_at: string | null;
    last_seen_at: string | null;
    status: string | null;
    is_new: boolean | null;
    notes: string | null;
}

// ─── Helpers ────────────────────────────────────────────────────

const formatDate = (value: string | null) => {
    if (!value) return "–";
    return new Date(value).toLocaleString("de-DE", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
};

const formatRelative = (value: string | null) => {
    if (!value) return "Nie";
    const diff = Date.now() - new Date(value).getTime();
    const hours = Math.floor(diff / 3_600_000);
    if (hours < 1) return "Gerade eben";
    if (hours < 24) return `vor ${hours}h`;
    const days = Math.floor(hours / 24);
    return `vor ${days}d`;
};

const scrapeStatusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: typeof CheckCircle2 }> = {
    pending: { label: "Ausstehend", variant: "outline", icon: Clock },
    success: { label: "Erfolgreich", variant: "default", icon: CheckCircle2 },
    error: { label: "Fehler", variant: "destructive", icon: XCircle },
    no_jobs: { label: "Keine Stellen", variant: "secondary", icon: FileText },
    needs_manual: { label: "Manuell prüfen", variant: "destructive", icon: AlertTriangle },
};

const jobStatusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
    active: { label: "Aktiv", variant: "default" },
    gone: { label: "Verschwunden", variant: "secondary" },
    applied: { label: "Beworben", variant: "outline" },
};

// ─── Component ──────────────────────────────────────────────────

const AdminBerlinJobsPage = () => {
    const { toast } = useToast();
    const [hospitals, setHospitals] = useState<BerlinHospital[]>([]);
    const [jobs, setJobs] = useState<BerlinJob[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isScanning, setIsScanning] = useState(false);
    const [scanDialogOpen, setScanDialogOpen] = useState(false);
    const [scanResult, setScanResult] = useState<any>(null);
    const [filter, setFilter] = useState("all");
    const [searchQuery, setSearchQuery] = useState("");
    const [editingNotes, setEditingNotes] = useState<{ id: string; notes: string } | null>(null);
    const [tab, setTab] = useState<"jobs" | "hospitals">("jobs");

    // ── Data loading ──
    const loadData = useCallback(async () => {
        setIsLoading(true);
        const [hospitalsRes, jobsRes] = await Promise.all([
            supabase.from("berlin_hospitals").select("*").order("name"),
            supabase.from("berlin_hospital_jobs").select("*").order("first_seen_at", { ascending: false }),
        ]);

        if (hospitalsRes.error) {
            toast({ title: "Fehler", description: hospitalsRes.error.message, variant: "destructive" });
        } else {
            setHospitals((hospitalsRes.data as BerlinHospital[]) ?? []);
        }

        if (jobsRes.error) {
            toast({ title: "Fehler", description: jobsRes.error.message, variant: "destructive" });
        } else {
            setJobs((jobsRes.data as BerlinJob[]) ?? []);
        }
        setIsLoading(false);
    }, [toast]);

    useEffect(() => {
        void loadData();
    }, [loadData]);

    // ── Hospital lookup ──
    const hospitalMap = useMemo(() => {
        const map = new Map<string, BerlinHospital>();
        hospitals.forEach((h) => map.set(h.id, h));
        return map;
    }, [hospitals]);

    // ── Filtered jobs ──
    const filteredJobs = useMemo(() => {
        let result = jobs;

        // Status filter
        if (filter === "new") result = result.filter((j) => j.is_new);
        else if (filter === "active") result = result.filter((j) => j.status === "active");
        else if (filter === "gone") result = result.filter((j) => j.status === "gone");
        else if (filter === "applied") result = result.filter((j) => j.status === "applied");

        // Search
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            result = result.filter((j) => {
                const hospital = hospitalMap.get(j.hospital_id);
                return (
                    j.title.toLowerCase().includes(q) ||
                    (j.department?.toLowerCase().includes(q) ?? false) ||
                    (hospital?.name.toLowerCase().includes(q) ?? false)
                );
            });
        }

        return result;
    }, [jobs, filter, searchQuery, hospitalMap]);

    // ── Stats ──
    const stats = useMemo(() => ({
        total: jobs.length,
        active: jobs.filter((j) => j.status === "active").length,
        newJobs: jobs.filter((j) => j.is_new).length,
        gone: jobs.filter((j) => j.status === "gone").length,
        applied: jobs.filter((j) => j.status === "applied").length,
        hospitalsTotal: hospitals.length,
        hospitalsSuccess: hospitals.filter((h) => h.scrape_status === "success").length,
        hospitalsError: hospitals.filter((h) => h.scrape_status === "error" || h.scrape_status === "needs_manual").length,
    }), [jobs, hospitals]);

    // ── Trigger scan ──
    const handleTriggerScan = async () => {
        setIsScanning(true);
        setScanDialogOpen(true);
        setScanResult(null);

        try {
            const { data: { session } } = await supabase.auth.getSession();
            const resp = await fetch(
                `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/scrape-berlin-hospitals`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${session?.access_token}`,
                    },
                    body: "{}",
                }
            );

            const result = await resp.json();
            setScanResult(result);

            if (result.success) {
                toast({ title: "Scan abgeschlossen", description: `${result.jobsFound || 0} Stellen gefunden` });
            } else {
                toast({ title: "Scan fehlgeschlagen", description: result.error || "Unbekannter Fehler", variant: "destructive" });
            }

            await loadData();
        } catch (err) {
            const msg = err instanceof Error ? err.message : "Unbekannter Fehler";
            setScanResult({ success: false, error: msg });
            toast({ title: "Fehler", description: msg, variant: "destructive" });
        } finally {
            setIsScanning(false);
        }
    };

    // ── Mark as applied ──
    const handleMarkApplied = async (jobId: string) => {
        const { error } = await supabase
            .from("berlin_hospital_jobs")
            .update({ status: "applied", is_new: false, updated_at: new Date().toISOString() })
            .eq("id", jobId);

        if (error) {
            toast({ title: "Fehler", description: error.message, variant: "destructive" });
            return;
        }
        toast({ title: "Als beworben markiert" });
        await loadData();
    };

    // ── Mark as read (remove new flag) ──
    const handleMarkRead = async (jobId: string) => {
        await supabase
            .from("berlin_hospital_jobs")
            .update({ is_new: false })
            .eq("id", jobId);
        await loadData();
    };

    // ── Save notes ──
    const handleSaveNotes = async () => {
        if (!editingNotes) return;
        const { error } = await supabase
            .from("berlin_hospital_jobs")
            .update({ notes: editingNotes.notes || null, updated_at: new Date().toISOString() })
            .eq("id", editingNotes.id);

        if (error) {
            toast({ title: "Fehler", description: error.message, variant: "destructive" });
            return;
        }
        toast({ title: "Notizen gespeichert" });
        setEditingNotes(null);
        await loadData();
    };

    // ── Update career URL ──
    const handleUpdateCareerUrl = async (hospitalId: string, careerUrl: string) => {
        const { error } = await supabase
            .from("berlin_hospitals")
            .update({ career_url: careerUrl, career_url_verified: true, scrape_status: "pending" })
            .eq("id", hospitalId);

        if (error) {
            toast({ title: "Fehler", description: error.message, variant: "destructive" });
            return;
        }
        toast({ title: "Karriere-URL aktualisiert" });
        await loadData();
    };

    // ── Render ──
    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                        <MapPin className="h-6 w-6 text-primary" />
                        Berlin Jobs – Innere Medizin
                    </h1>
                    <p className="text-muted-foreground text-sm mt-1">
                        Private Stellensuche • {stats.hospitalsTotal} Krankenhäuser • Nur für dich sichtbar
                    </p>
                </div>
                <Button onClick={handleTriggerScan} disabled={isScanning}>
                    {isScanning ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                    Jetzt scannen
                </Button>
            </div>

            {/* Stats cards */}
            <div className="grid gap-4 md:grid-cols-5">
                <Card className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => setFilter("all")}>
                    <CardContent className="pt-4 pb-3 px-4">
                        <div className="text-2xl font-bold">{stats.total}</div>
                        <p className="text-xs text-muted-foreground">Gesamt</p>
                    </CardContent>
                </Card>
                <Card className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => setFilter("new")}>
                    <CardContent className="pt-4 pb-3 px-4">
                        <div className="text-2xl font-bold text-yellow-600">{stats.newJobs}</div>
                        <p className="text-xs text-muted-foreground">Neue Stellen</p>
                    </CardContent>
                </Card>
                <Card className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => setFilter("active")}>
                    <CardContent className="pt-4 pb-3 px-4">
                        <div className="text-2xl font-bold text-green-600">{stats.active}</div>
                        <p className="text-xs text-muted-foreground">Aktiv</p>
                    </CardContent>
                </Card>
                <Card className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => setFilter("applied")}>
                    <CardContent className="pt-4 pb-3 px-4">
                        <div className="text-2xl font-bold text-blue-600">{stats.applied}</div>
                        <p className="text-xs text-muted-foreground">Beworben</p>
                    </CardContent>
                </Card>
                <Card className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => setFilter("gone")}>
                    <CardContent className="pt-4 pb-3 px-4">
                        <div className="text-2xl font-bold text-gray-400">{stats.gone}</div>
                        <p className="text-xs text-muted-foreground">Verschwunden</p>
                    </CardContent>
                </Card>
            </div>

            {/* Tab switcher */}
            <div className="flex gap-2 border-b pb-2">
                <Button
                    variant={tab === "jobs" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setTab("jobs")}
                >
                    <Sparkles className="mr-1.5 h-4 w-4" />
                    Stellen ({filteredJobs.length})
                </Button>
                <Button
                    variant={tab === "hospitals" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setTab("hospitals")}
                >
                    <Building2 className="mr-1.5 h-4 w-4" />
                    Krankenhäuser ({hospitals.length})
                </Button>
            </div>

            {/* ═══════════════════════════ JOBS TAB ═══════════════════════════ */}
            {tab === "jobs" && (
                <Card>
                    <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-lg">Gefundene Stellen</CardTitle>
                            <div className="flex gap-2">
                                <div className="relative">
                                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        placeholder="Suche..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="pl-8 w-[200px]"
                                    />
                                </div>
                                <Select value={filter} onValueChange={setFilter}>
                                    <SelectTrigger className="w-[160px]">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Alle ({stats.total})</SelectItem>
                                        <SelectItem value="new">Neu ({stats.newJobs})</SelectItem>
                                        <SelectItem value="active">Aktiv ({stats.active})</SelectItem>
                                        <SelectItem value="applied">Beworben ({stats.applied})</SelectItem>
                                        <SelectItem value="gone">Verschwunden ({stats.gone})</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {filteredJobs.length === 0 ? (
                            <div className="text-center py-12 text-muted-foreground">
                                <FileText className="mx-auto h-10 w-10 mb-3 opacity-40" />
                                <p className="font-medium">Keine Stellen gefunden</p>
                                <p className="text-sm mt-1">Klicke auf "Jetzt scannen" um die Suche zu starten.</p>
                            </div>
                        ) : (
                            <div className="rounded-md border overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="w-[200px]">Krankenhaus</TableHead>
                                            <TableHead>Stelle</TableHead>
                                            <TableHead className="w-[140px]">Fachbereich</TableHead>
                                            <TableHead className="w-[100px]">Status</TableHead>
                                            <TableHead className="w-[100px]">Entdeckt</TableHead>
                                            <TableHead className="w-[160px]">Aktionen</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredJobs.map((job) => {
                                            const hospital = hospitalMap.get(job.hospital_id);
                                            const statusCfg = jobStatusConfig[job.status || "active"] || jobStatusConfig.active;
                                            return (
                                                <TableRow key={job.id} className={job.is_new ? "bg-yellow-50/50 dark:bg-yellow-950/10" : ""}>
                                                    <TableCell className="font-medium text-sm">
                                                        {hospital?.name || "Unbekannt"}
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex items-start gap-2">
                                                            {job.is_new && (
                                                                <Badge variant="outline" className="bg-yellow-100 text-yellow-700 border-yellow-300 text-xs shrink-0">
                                                                    Neu
                                                                </Badge>
                                                            )}
                                                            <div>
                                                                <div className="font-medium text-sm">{job.title}</div>
                                                                {job.notes && (
                                                                    <div className="text-xs text-muted-foreground mt-0.5 italic">📝 {job.notes}</div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-sm text-muted-foreground">
                                                        {job.department || "–"}
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge variant={statusCfg.variant}>{statusCfg.label}</Badge>
                                                    </TableCell>
                                                    <TableCell className="text-xs text-muted-foreground">
                                                        {formatRelative(job.first_seen_at)}
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex gap-1">
                                                            {job.apply_url && (
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    asChild
                                                                    className="h-7 px-2"
                                                                >
                                                                    <a href={job.apply_url} target="_blank" rel="noopener noreferrer">
                                                                        <ExternalLink className="h-3.5 w-3.5" />
                                                                    </a>
                                                                </Button>
                                                            )}
                                                            {job.status !== "applied" && (
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    className="h-7 px-2 text-green-600 hover:text-green-700"
                                                                    onClick={() => handleMarkApplied(job.id)}
                                                                    title="Als beworben markieren"
                                                                >
                                                                    <CheckCircle2 className="h-3.5 w-3.5" />
                                                                </Button>
                                                            )}
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                className="h-7 px-2"
                                                                onClick={() => setEditingNotes({ id: job.id, notes: job.notes || "" })}
                                                                title="Notizen"
                                                            >
                                                                📝
                                                            </Button>
                                                            {job.is_new && (
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    className="h-7 px-2 text-xs"
                                                                    onClick={() => handleMarkRead(job.id)}
                                                                    title="Als gelesen markieren"
                                                                >
                                                                    ✓
                                                                </Button>
                                                            )}
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* ═══════════ HOSPITALS TAB ═══════════ */}
            {tab === "hospitals" && (
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-lg">Krankenhäuser</CardTitle>
                        <CardDescription>
                            {stats.hospitalsSuccess} erfolgreich gescannt • {stats.hospitalsError} benötigen Aufmerksamkeit
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="rounded-md border overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Krankenhaus</TableHead>
                                        <TableHead className="w-[120px]">Status</TableHead>
                                        <TableHead className="w-[100px]">Stellen</TableHead>
                                        <TableHead className="w-[120px]">Letzter Scan</TableHead>
                                        <TableHead className="w-[250px]">Karriere-URL</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {hospitals.map((hospital) => {
                                        const cfg = scrapeStatusConfig[hospital.scrape_status || "pending"] || scrapeStatusConfig.pending;
                                        const Icon = cfg.icon;
                                        const jobCount = jobs.filter((j) => j.hospital_id === hospital.id && j.status === "active").length;
                                        return (
                                            <TableRow key={hospital.id}>
                                                <TableCell>
                                                    <div className="font-medium text-sm">{hospital.name}</div>
                                                    {hospital.scrape_error && (
                                                        <div className="text-xs text-destructive mt-0.5">{hospital.scrape_error}</div>
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant={cfg.variant} className="gap-1">
                                                        <Icon className="h-3 w-3" />
                                                        {cfg.label}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-sm">
                                                    {jobCount > 0 ? (
                                                        <span className="text-green-600 font-medium">{jobCount}</span>
                                                    ) : (
                                                        <span className="text-muted-foreground">0</span>
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-xs text-muted-foreground">
                                                    {formatRelative(hospital.last_scraped_at)}
                                                </TableCell>
                                                <TableCell>
                                                    {hospital.career_url ? (
                                                        <a
                                                            href={hospital.career_url}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="text-xs text-primary hover:underline flex items-center gap-1 truncate max-w-[240px]"
                                                        >
                                                            <ExternalLink className="h-3 w-3 shrink-0" />
                                                            {hospital.career_url.replace(/^https?:\/\//, "")}
                                                        </a>
                                                    ) : (
                                                        <EditableCareerUrl
                                                            hospitalId={hospital.id}
                                                            onSave={handleUpdateCareerUrl}
                                                        />
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* ═══════════ Notes Dialog ═══════════ */}
            <Dialog open={!!editingNotes} onOpenChange={(open) => !open && setEditingNotes(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Notizen</DialogTitle>
                        <DialogDescription>Persönliche Notizen zu dieser Stelle</DialogDescription>
                    </DialogHeader>
                    <Textarea
                        value={editingNotes?.notes || ""}
                        onChange={(e) => setEditingNotes((prev) => prev ? { ...prev, notes: e.target.value } : null)}
                        placeholder="z.B. Ansprechpartner, Bewerbungsfrist..."
                        rows={4}
                    />
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setEditingNotes(null)}>Abbrechen</Button>
                        <Button onClick={handleSaveNotes}>Speichern</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ═══════════ Scan Results Dialog ═══════════ */}
            <Dialog open={scanDialogOpen} onOpenChange={setScanDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>
                            {isScanning ? "Scan läuft..." : scanResult?.success ? "Scan abgeschlossen" : "Scan fehlgeschlagen"}
                        </DialogTitle>
                    </DialogHeader>
                    {isScanning ? (
                        <div className="flex items-center gap-3 py-6">
                            <Loader2 className="h-6 w-6 animate-spin text-primary" />
                            <p className="text-muted-foreground">Krankenhäuser werden gescannt...</p>
                        </div>
                    ) : scanResult ? (
                        <div className="space-y-3">
                            {scanResult.success ? (
                                <>
                                    <div className="grid grid-cols-2 gap-3 text-sm">
                                        <div><span className="text-muted-foreground">Krankenhäuser:</span> {scanResult.hospitalsProcessed}</div>
                                        <div><span className="text-muted-foreground">Karriere-URLs entdeckt:</span> {scanResult.careerUrlsDiscovered}</div>
                                        <div><span className="text-muted-foreground">Stellen gefunden:</span> {scanResult.jobsFound}</div>
                                        <div><span className="text-muted-foreground">Neu importiert:</span> {scanResult.jobsInserted}</div>
                                        <div><span className="text-muted-foreground">Aktualisiert:</span> {scanResult.jobsUpdated}</div>
                                        <div><span className="text-muted-foreground">Verschwunden:</span> {scanResult.jobsMarkedGone}</div>
                                    </div>
                                    {scanResult.errors?.length > 0 && (
                                        <div className="text-xs text-destructive mt-2">
                                            <p className="font-medium">Fehler:</p>
                                            {scanResult.errors.map((e: string, i: number) => (
                                                <p key={i}>• {e}</p>
                                            ))}
                                        </div>
                                    )}
                                </>
                            ) : (
                                <p className="text-destructive">{scanResult.error}</p>
                            )}
                        </div>
                    ) : null}
                    <DialogFooter>
                        <Button onClick={() => setScanDialogOpen(false)}>Schließen</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

// ── Inline editable career URL component ──
const EditableCareerUrl = ({
    hospitalId,
    onSave,
}: {
    hospitalId: string;
    onSave: (id: string, url: string) => Promise<void>;
}) => {
    const [editing, setEditing] = useState(false);
    const [value, setValue] = useState("");

    if (!editing) {
        return (
            <Button variant="ghost" size="sm" className="h-6 text-xs text-muted-foreground" onClick={() => setEditing(true)}>
                + URL hinzufügen
            </Button>
        );
    }

    return (
        <div className="flex gap-1">
            <Input
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder="https://karriere.example.de"
                className="h-7 text-xs"
                autoFocus
            />
            <Button
                size="sm"
                className="h-7 px-2"
                onClick={async () => {
                    if (value.trim()) {
                        await onSave(hospitalId, value.trim());
                        setEditing(false);
                        setValue("");
                    }
                }}
            >
                ✓
            </Button>
            <Button variant="ghost" size="sm" className="h-7 px-2" onClick={() => { setEditing(false); setValue(""); }}>
                ✕
            </Button>
        </div>
    );
};

export default AdminBerlinJobsPage;
