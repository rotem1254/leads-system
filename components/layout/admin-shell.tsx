import Link from "next/link";
import {
  LayoutDashboard,
  Inbox,
  Users,
  Globe,
} from "lucide-react";
import { buttonVariants } from "@/components/ui/button-variants";
import { cn } from "@/lib/utils";
import { AdminLogoutButton } from "@/components/layout/admin-logout-button";
import type { UserRole } from "@/types/profile";

const baseNav = [
  { href: "/dashboard", label: "סקירה", icon: LayoutDashboard },
  { href: "/dashboard/leads", label: "לידים", icon: Inbox },
];

const adminOnlyNav = [
  { href: "/dashboard/users", label: "משתמשים", icon: Users },
  { href: "/dashboard/landing-pages", label: "דפי נחיתה", icon: Globe },
];

export function AdminShell({
  children,
  role,
}: {
  children: React.ReactNode;
  role: UserRole;
}) {
  const nav =
    role === "admin" ? [...baseNav, ...adminOnlyNav] : [...baseNav, { href: "/dashboard/landing-pages", label: "דפי הנחיתה שלי", icon: Globe }];

  return (
    <div className="flex min-h-screen bg-zinc-50">
      <aside className="hidden w-60 shrink-0 border-e border-zinc-200/80 bg-white shadow-sm md:flex md:flex-col">
        <div className="border-b border-zinc-100 px-5 py-6">
          <Link href="/dashboard" className="text-lg font-bold tracking-tight">
            לידים <span className="text-primary">Pro</span>
          </Link>
          <p className="mt-1 text-xs text-muted-foreground">
            {role === "admin" ? "ניהול פלטפורמה" : "אזור לקוח"}
          </p>
        </div>
        <nav className="flex flex-1 flex-col gap-1 p-3">
          {nav.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100"
            >
              <Icon className="size-4 opacity-80" />
              {label}
            </Link>
          ))}
        </nav>
        <div className="border-t border-zinc-100 p-3">
          <AdminLogoutButton />
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-10 flex items-center justify-between border-b border-zinc-200/80 bg-white/90 px-4 py-3 backdrop-blur md:hidden">
          <Link href="/dashboard" className="font-bold">
            לידים
          </Link>
          <div className="flex gap-2">
            <Link
              href="/dashboard/leads"
              className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
            >
              לידים
            </Link>
            <AdminLogoutButton iconOnly />
          </div>
        </header>
        <main className="flex-1 p-4 md:p-8">{children}</main>
      </div>
    </div>
  );
}
