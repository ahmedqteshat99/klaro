import { NavLink, Outlet } from "react-router-dom";
import { BriefcaseBusiness, LayoutDashboard, Shield, Users } from "lucide-react";
import BrandLogo from "@/components/BrandLogo";
import { cn } from "@/lib/utils";

const navItems = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/admin/jobs", label: "Jobs", icon: BriefcaseBusiness, end: false },
  { to: "/admin/users", label: "Benutzer", icon: Users, end: false },
  { to: "/admin/data-subjects", label: "DSGVO-Rechte", icon: Shield, end: false },
];

const AdminLayout = () => {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card/80 backdrop-blur">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <BrandLogo />
          <span className="text-sm text-muted-foreground">Admin</span>
        </div>
      </header>
      <div className="container mx-auto px-6 py-8">
        <div className="grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)]">
          <aside className="space-y-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground hover:bg-muted",
                      isActive && "bg-muted text-foreground"
                    )
                  }
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </NavLink>
              );
            })}
          </aside>
          <main className="min-w-0">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
};

export default AdminLayout;
