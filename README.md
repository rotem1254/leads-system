# פלטפורמת לידים מרכזית (מולטי־לקוח)

אפליקציית **Next.js** אחת עם לוח בקרה בעברית (RTL). דפי נחיתה מרובים שולחים לידים ל-**מקור אמת יחיד** ב-Supabase Postgres. כל דף נחיתה מזוהה ב-**`landing_token`**; השרת מקשר אוטומטית ללקוח (בעלים) — בלי לסמוך על `user_id` מהטופס החיצוני.

## תפקידים

| תפקיד | גישה |
|--------|------|
| **admin** | כל הלידים, משתמשים, דפי נחיתה, מחיקת לידים, סינון לפי לקוח/דף |
| **client** | רק לידים ודפי נחיתה שלו; עדכון ליד (סטטוס, הערות, שדות קשר); ללא מחיקה וללא רשימת משתמשים |

התפקיד נשמר בטבלת `profiles` (מקושר ל-`auth.users`).

## ארכיטקטורה

```
[דף נחיתה חיצוני]
       │  POST /api/leads + landing_token
       ▼
  Route Handler (Zod) ──► פתרון דף נחיתה ──► INSERT ליד + user_id + landing_page_id
       ▲
       │  סשן עוגיות (Supabase Auth)
[לוח admin / client] ──► GET/PATCH /api/leads …
```

- **מקור אמת אחד**: טבלאות `leads`, `profiles`, `landing_pages`.
- **שירות ציבורי**: רק `POST /api/leads` (נשאר ציבורי; בעלות נגזרת בשרת).
- **שאר ה-API**: מחייב התחברות; בדיקת תפקיד בצד השרת (`getAuthContext` + שאילתות ממוקדות).

## טכנולוגיות

- Next.js 15 (App Router) + TypeScript  
- Tailwind CSS v4 + shadcn/ui + lucide-react  
- Supabase (Postgres + Auth)  
- Zod  
- TanStack Query  

## משתני סביבה

העתק `.env.example` ל-`.env.local`:

| משתנה | שימוש |
|--------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | כתובת הפרויקט |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | התחברות בדפדפן (סשן) |
| `SUPABASE_SERVICE_ROLE_KEY` | **רק בשרת** — Route Handlers + Auth Admin API |

אופציונלי: `ALLOWED_ORIGINS` — מקורות מופרדים בפסיק ל-`Access-Control-Allow-Origin` על `POST /api/leads`.

אופציונלי לדיבוג: `DEBUG_LEADS_API=1` — מדפיס לקונסול השרת (בלבד) שלבי בקשה ל-`POST /api/leads`: אורך טוקן, קידומת טוקן, תוצאת חיפוש דף נחיתה (ללא טוקן מלא). להסיר או לכבות בפרודקשן.

לאחר עריכת `.env.local` יש להפעיל מחדש את `npm run dev`.

**אבטחה:** אין לחשוף `SUPABASE_SERVICE_ROLE_KEY` לדפדפן.

> הערה: גישת **Bearer / ADMIN_TOKEN** ל-API הוחלפה בסשן Supabase (עוגיות). אם יש אוטומציות חיצוניות שסמכו על `ADMIN_TOKEN`, יש להעבירן לזרימה עם סשן או ליצור נתיב ייעודי מאובטח.

## סכמת מסד (תמצית)

הרצה ב-**SQL Editor** לפי הסדר:

1. `supabase/migrations/001_leads.sql` — טבלת `leads` + enum סטטוס  
2. `supabase/migrations/002_platform_multiclient.sql` — `profiles`, `landing_pages`, עמודות `user_id` / `landing_page_id` ב-`leads`, טריגר פרופיל למשתמש חדש  

טבלאות עיקריות:

- **`profiles`**: `id` (= `auth.users.id`), `full_name`, `role` (`admin` | `client`), `is_active`, timestamps  
- **`landing_pages`**: `name`, `slug` (ייחודי), `user_id` (בעלים), `public_token` (ייחודי, לטפסים), `is_active`  
- **`leads`**: שדות קיימים + `landing_page_id`, `user_id` (nullable לרשומות לפני מיגרציה)

## הגדרת Supabase Auth

1. פרויקט ב-[Supabase](https://supabase.com).  
2. הרץ מיגרציות 001 ואז 002.  
3. **Authentication**: מומלץ לכבות הרשמה ציבורית אם רק מנהלים יוצרים משתמשים דרך הלוח (`/dashboard/users`).  
4. העתק מפתחות ל-`.env.local`.  
5. **משתמש מנהל ראשון**: אחרי התחברות ראשונה, עדכן ב-SQL:

```sql
update public.profiles
set role = 'admin'
where id = '<uuid של המשתמש מ-auth.users>';
```

או צור משתמש דרך `/dashboard/users` עם תפקיד `admin`.

## פיתוח מקומי

```bash
npm install
cp .env.example .env.local
# ערוך .env.local
npm run dev
```

פתח [http://localhost:3000](http://localhost:3000) — `/login` → `/dashboard`.

## ממשק (עברית / RTL)

| נתיב | תיאור |
|------|--------|
| `/login` | התחברות אימייל + סיסמה |
| `/dashboard` | סקירה (תלוי תפקיד) |
| `/dashboard/leads` | לידים — חיפוש, סינון, עריכה; מחיקה למנהל בלבד |
| `/dashboard/users` | **מנהל בלבד** — יצירת משתמשים והפעלה/השבתה |
| `/dashboard/landing-pages` | דפי נחיתה + טוקנים + הוראות אינטגרציה |

## API — ציבורי

### `POST /api/leads`

גוף JSON (שדות חובה: `full_name`, `phone`, `page_source`, `landing_token`).

תשובה: `{ "success": true, "message": "...", "leadId": "..." }` או `success: false` + `message`.

פירוט: [docs/LANDING_PAGE_INTEGRATION.md](./docs/LANDING_PAGE_INTEGRATION.md).

## API — מחובר (סשן)

| שיטה | נתיב | הערות |
|------|------|--------|
| GET | `/api/me` | פרופיל + תפקיד |
| GET | `/api/dashboard/stats` | סטטיסטיקות לפי תפקיד |
| GET | `/api/leads` | רשימה — admin: כל; client: רק שלו; פרמטרים: `page`, `limit`, `q`, `status`, `page_source`, `user_id` (admin), `landing_page_id` |
| GET/PATCH | `/api/leads/:id` | PATCH — admin: כל השדות; client: שדות מוגבלים |
| DELETE | `/api/leads/:id` | **מנהל בלבד** |
| GET/POST | `/api/users` | **מנהל בלבד** |
| PATCH | `/api/users/:id` | **מנהל בלבד** |
| GET/POST | `/api/landing-pages` | GET: כולם (scoped); POST: **מנהל** |
| GET/PATCH | `/api/landing-pages/:id` | PATCH: מנהל מלא; לקוח — `name` / `is_active` בלבד |

## אימות אחרי מיגרציה (001 + 002)

לאחר הרצת **`001_leads.sql`** ואז **`002_platform_multiclient.sql`** ב-SQL Editor:

1. **הפעילו מחדש** את `npm run dev` (מומלץ) — בדיקת מוכנות הסכמה נשמרת בקאש קצר (~60 שניות).
2. פתחו את האפליקציה: אם הסכמה תקינה, תראו את לוח הבקרה; אם לא — מסך **"המסד לא מוכן"** עם קוד שגיאה, או **503** ב-API עם `code` מפורש.
3. **מנהל ראשון:** אם עדיין אין מנהל, התחברו פעם אחת והריצו ב-SQL:  
   `update public.profiles set role = 'admin' where id = '<uuid>';`
4. **לקוח:** `/dashboard/users` → צרו משתמש `client` (אימייל + סיסמה).
5. **דף נחיתה:** `/dashboard/landing-pages` → צרו דף, שייכו ללקוח, העתיקו את **`public_token`** (מתחיל ב-`lp_`).
6. **שליחת ליד:** `POST /api/leads` עם `landing_token`, `full_name`, `phone`, `page_source` — תשובה `success: true` + `leadId`.
7. **בידוד:** התחברו כ**לקוח** → `/dashboard/leads` — רק לידים שלו. התחברו כ**מנהל** — כל הלידים + סינון לפי לקוח/דף נחיתה.

**בדיקת מוכנות (שרת):** הפונקציה `getSchemaReadiness()` (`lib/supabase/schema-readiness.ts`) מאמתת גישה ל-`landing_pages`, `profiles`, ול-`leads` עם `landing_page_id` / `user_id`. ניתן לייבא `clearSchemaReadinessCache()` אחרי מיגרציה אם צריך לאלץ רענון לפני תום ה-TTL.

## פתרון בעיות: 500 / `PGRST205` ב-`POST /api/leads`

- **שגיאת PostgREST `PGRST205`** (`Could not find the table 'public.landing_pages' in the schema cache`): המיגרציה **`002_platform_multiclient.sql`** לא הורצה על פרויקט ה-Supabase שמוגדר ב-`.env.local`. הריצו אותה ב-SQL Editor, ואז ודאו שקיימות הטבלאות `profiles`, `landing_pages` ועמודות `leads.landing_page_id`, `leads.user_id`.
- ה-API מחזיר **503** עם `code` (למשל `PGRST205`) כשהסכמה חסרה; לוח הבקרה מציג מסך הסבר במקום להיכנס ללולאת התחברות.
- לדיבוג זמני ל-`POST /api/leads`: `DEBUG_LEADS_API=1` (לוגים בלי סודות).

## מיגרציה מנתונים קיימים

רשומות `leads` ישנות ללא `user_id` / `landing_page_id` נשארות תקינות (עמודות nullable). לידים חדשים מקבלים שיוך דרך `landing_token`. ניתן לתעד backfill ידני (למשל לפי `page_source`) — לא אוטומטי בפרויקט זה.

## פריסה

- הגדר משתני סביבה בפלטפורמת הפריסה.  
- ב-Supabase: **Authentication → URL Configuration** — Site URL ו-Redirect URLs לדומיין הייצור.  
- עדכן בדוגמאות הטפסים את `BASE_URL` ו-`landing_token`.

## קבצים ודוגמאות

- `public/examples/landing-form-example.html`  
- `docs/LANDING_PAGE_INTEGRATION.md`  
- `docs/INTEGRATION.md`  

## רישיון

פרטי.
