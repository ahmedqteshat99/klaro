import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, Database, Clock, Trash2 } from "lucide-react";
import AdminLayout from "@/components/admin/AdminLayout";
import UserDataExporter from "@/components/admin/UserDataExporter";
import AuditLogViewer from "@/components/admin/AuditLogViewer";
import AccountDeletionManager from "@/components/admin/AccountDeletionManager";

const AdminDataSubjectPage = () => {
  const [activeTab, setActiveTab] = useState("export");

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            DSGVO-Betroffenenrechte
          </h1>
          <p className="text-muted-foreground mt-2">
            Verwaltung von Auskunfts-, Export- und Löschanfragen gemäß DSGVO
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Datenauskunft
              </CardTitle>
              <Database className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">Art. 15</div>
              <p className="text-xs text-muted-foreground mt-1">
                Recht auf Auskunft
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Audit-Logs
              </CardTitle>
              <Shield className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">Art. 5(2)</div>
              <p className="text-xs text-muted-foreground mt-1">
                Rechenschaftspflicht
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Löschung
              </CardTitle>
              <Trash2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">Art. 17</div>
              <p className="text-xs text-muted-foreground mt-1">
                Recht auf Vergessenwerden
              </p>
            </CardContent>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList>
            <TabsTrigger value="export" className="flex items-center gap-2">
              <Database className="h-4 w-4" />
              Datenexport
            </TabsTrigger>
            <TabsTrigger value="audit" className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Audit-Logs
            </TabsTrigger>
            <TabsTrigger value="delete" className="flex items-center gap-2">
              <Trash2 className="h-4 w-4" />
              Kontolöschung
            </TabsTrigger>
          </TabsList>

          <TabsContent value="export" className="space-y-4">
            <UserDataExporter />
          </TabsContent>

          <TabsContent value="audit" className="space-y-4">
            <AuditLogViewer />
          </TabsContent>

          <TabsContent value="delete" className="space-y-4">
            <AccountDeletionManager />
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
};

export default AdminDataSubjectPage;
