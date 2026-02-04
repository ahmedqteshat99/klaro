import { Loader2 } from "lucide-react";
import AdminLayout from "@/components/admin/AdminLayout";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import AdminForbidden from "@/pages/AdminForbidden";

const AdminRoute = () => {
  const { isAdmin, isLoading } = useIsAdmin();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) {
    return <AdminForbidden />;
  }

  return <AdminLayout />;
};

export default AdminRoute;
