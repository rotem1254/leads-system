"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { toast } from "sonner";

export function AdminLogoutButton({ iconOnly }: { iconOnly?: boolean }) {
  const router = useRouter();

  async function logout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    toast.success("התנתקת");
    router.push("/login");
    router.refresh();
  }

  if (iconOnly) {
    return (
      <Button variant="ghost" size="icon" onClick={logout} aria-label="התנתקות">
        <LogOut className="size-4" />
      </Button>
    );
  }

  return (
    <Button
      variant="outline"
      className="w-full justify-start gap-2"
      onClick={logout}
    >
      <LogOut className="size-4" />
      התנתקות
    </Button>
  );
}
