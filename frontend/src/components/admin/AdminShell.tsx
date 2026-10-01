import { Link, useRouteContext } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import {
  ArrowLeft,
  BarChart3,
  BookOpen,
  Layers,
  LayoutDashboard,
  MessagesSquare,
  Monitor,
  PanelLeftClose,
  PanelLeftOpen,
  ShieldCheck,
  Users,
  Zap,
} from "lucide-react";
import skilloraLogo from "@/assets/skillora-logo.png";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/admin", label: "Overview", Icon: LayoutDashboard, adminOnly: false, exact: true },
  { to: "/admin/reports", label: "Reports", Icon: BarChart3, adminOnly: true, exact: false },
  { to: "/admin/units", label: "Units", Icon: Layers, adminOnly: false, exact: false },
  { to: "/admin/lessons", label: "Lessons", Icon: BookOpen, adminOnly: false, exact: false },
  { to: "/admin/challenge", label: "Daily challenge", Icon: Zap, adminOnly: true, exact: false },
  { to: "/admin/community", label: "Community", Icon: MessagesSquare, adminOnly: true, exact: false },
  { to: "/admin/learners", label: "Learners", Icon: Users, adminOnly: true, exact: false },
  { to: "/admin/admins", label: "Admins", Icon: ShieldCheck, adminOnly: true, exact: false },
] as const;

export function useStaffRole() {
  return useRouteContext({ from: "/_authenticated/admin" }).role;
}

export function AdminShell({
  title,
  subtitle,
  actions,
  children,
}: {
  title: string;
  subtitle?: string | undefined;
  actions?: ReactNode;
  children: ReactNode;
}) {
  const role = useStaffRole();
  const [open, setOpen] = useState(false);
  useEffect(() => {
    setOpen(localStorage.getItem("skillora.admin.nav") === "open");
  }, []);
  const toggle = () => {
    setOpen((o) => {
      localStorage.setItem("skillora.admin.nav", o ? "closed" : "open");
      return !o;
    });
  };
  return (
    <>
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-background p-8 text-center lg:hidden">
        <Monitor className="size-10 text-primary" />
        <p className="text-lg font-bold">Please open Skillora Admin on a computer</p>
        <p className="max-w-xs text-sm text-muted-foreground">The admin area is designed for desktop browsers.</p>
        <Link to="/" className="mt-2 text-sm font-semibold text-primary">
          Back to the app
        </Link>
      </div>

      <div className="hidden min-h-screen bg-muted/40 lg:flex">
        <aside
          className={cn(
            "sticky top-0 flex h-screen shrink-0 flex-col border-r border-border bg-background py-5 transition-[width] duration-200",
            open ? "w-60 px-3" : "w-16 px-2",
          )}
        >
          <div className={cn("mb-6 flex items-center gap-2", open ? "px-2" : "justify-center")}>
            <img src={skilloraLogo} alt="" className="size-8 shrink-0" />
            {open && (
              <div>
                <p className="font-display font-bold leading-tight">Skillora</p>
                <p className="text-xs text-muted-foreground">Admin · {role === "admin" ? "Admin" : "Editor"}</p>
              </div>
            )}
          </div>
          <nav className="flex flex-1 flex-col gap-0.5">
            {NAV.filter((n) => role === "admin" || !n.adminOnly).map(({ to, label, Icon, exact }) => (
              <Link
                key={to}
                to={to}
                title={open ? undefined : label}
                activeOptions={{ exact }}
                className={cn(
                  "flex items-center gap-2.5 rounded-lg py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground",
                  open ? "px-3" : "justify-center px-0",
                )}
                activeProps={{ className: "!bg-secondary !text-primary font-semibold" }}
              >
                <Icon className="size-4 shrink-0" />
                {open && label}
              </Link>
            ))}
          </nav>
          <button
            onClick={toggle}
            title={open ? "Collapse menu" : "Expand menu"}
            className={cn(
              "mb-1 flex items-center gap-2 rounded-lg py-2 text-sm font-medium text-muted-foreground hover:bg-secondary",
              open ? "px-3" : "justify-center",
            )}
          >
            {open ? <PanelLeftClose className="size-4" /> : <PanelLeftOpen className="size-4" />}
            {open && "Collapse"}
          </button>
          <Link
            to="/"
            title={open ? undefined : "Back to app"}
            className={cn(
              "flex items-center gap-2 rounded-lg py-2 text-sm font-medium text-muted-foreground hover:bg-secondary",
              open ? "px-3" : "justify-center",
            )}
          >
            <ArrowLeft className="size-4" /> {open && "Back to app"}
          </Link>
        </aside>

        <div className="min-w-0 flex-1">
          <header className="sticky top-0 z-10 flex items-center gap-4 border-b border-border bg-background/90 px-8 py-4 backdrop-blur">
            <div className="mr-auto">
              <h1 className="text-xl font-bold">{title}</h1>
              {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
            </div>
            {actions}
          </header>
          <main className="mx-auto max-w-6xl px-8 py-6">{children}</main>
        </div>
      </div>
    </>
  );
}

export function AdminCard({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn("rounded-xl border border-border bg-card p-5 shadow-sm", className)}>{children}</div>;
}

export function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    published: "bg-primary/15 text-primary",
    review: "bg-xp/20 text-foreground",
    draft: "bg-muted text-muted-foreground",
  };
  const label: Record<string, string> = { published: "Published", review: "In review", draft: "Draft" };
  return (
    <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-semibold", styles[status] ?? styles["draft"])}>
      {label[status] ?? status}
    </span>
  );
}

export function AdminsOnly() {
  return (
    <AdminCard className="py-12 text-center">
      <p className="font-bold">Admins only</p>
      <p className="text-sm text-muted-foreground">Ask an admin if you need access to this section.</p>
    </AdminCard>
  );
}
