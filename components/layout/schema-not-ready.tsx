import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function SchemaNotReady({
  code,
  message,
}: {
  code: string;
  message: string;
}) {
  return (
    <div
      className="flex min-h-screen items-center justify-center bg-zinc-50 p-4"
      dir="rtl"
    >
      <Card className="w-full max-w-lg border-amber-200/80 shadow-lg">
        <CardHeader>
          <CardTitle>המסד לא מוכן</CardTitle>
          <CardDescription>
            יש להריץ את מיגרציות ה-SQL ב-Supabase לפני שימוש בלוח הבקרה.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>{message}</p>
          <p className="font-mono text-xs text-foreground/80" dir="ltr">
            code: {code}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
