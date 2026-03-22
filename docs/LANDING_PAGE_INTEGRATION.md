# חיבור דפי נחיתה לפלטפורמה

מסמך זה מיועד למפתחים שמחברים טפסים חיצוניים למערכת הלידים המרכזית.

## עקרון

- כל **דף נחיתה** במערכת מקבל `public_token` ייחודי (פורמט: `lp_` + מחרוזת הקסדצימלית).
- השרת **אף פעם לא** סומך על `user_id` או בעלות מהלקוח — רק על `landing_token` (או מזהה דף נחיתה פנימי) כדי לדעת לאיזה לקוח לשייך את הליד.
- `page_source` נשאר **מטא-דאטה** מהטופס (סינון ודוחות), ואינו קובע בעלות.

## נקודת קצה

```http
POST {BASE_URL}/api/leads
Content-Type: application/json
```

`BASE_URL` הוא דומיין האפליקציה (למשל `https://app.example.com`).

## גוף JSON (חובה)

```json
{
  "full_name": "ישראל ישראלי",
  "phone": "0501234567",
  "email": "user@example.com",
  "message": "אשמח לשיחה",
  "page_source": "classa-landing",
  "landing_token": "lp_xxxxxxxx"
}
```

| שדה | חובה | הערות |
|-----|------|--------|
| full_name | כן | |
| phone | כן | |
| page_source | כן | מזהה טקסטואלי לדף (היסטוריה / דוחות) |
| landing_token | כן | הטוקן ממסך **דפי נחיתה** בלוח הבקרה |
| email | לא | אם נשלח — חייב להיות אימייל תקין |
| message | לא | |

## תגובות

| מצב | HTTP | message (דוגמה) |
|-----|------|-------------------|
| הצלחה | 200 | Lead created successfully |
| ולידציה | 400 | Validation error |
| טוקן לא קיים | 404 | Landing page not found |
| דף כבוי | 403 | Landing page inactive |
| יותר מדי בקשות | 429 | Too many requests… |
| שרת לא מוגדר | 503 | Service unavailable… |

## דוגמת fetch

```javascript
const res = await fetch("https://YOUR-APP.com/api/leads", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    full_name: "ישראל ישראלי",
    phone: "0501234567",
    email: "user@example.com",
    message: "",
    page_source: "my-campaign-2025",
    landing_token: "lp_abc123...",
  }),
});
const data = await res.json();
```

## CORS ו-rate limit

- נתמך `OPTIONS` וכותרות CORS (ברירת מחדל `Access-Control-Allow-Origin: *` או `ALLOWED_ORIGINS` מהסביבה).
- מגבלת קצב משוערת: 60 בקשות `POST` לדקה לכל IP (בשרת).

## טוקן חדש (מנהלים)

אם דף נחיתה מאותחל מחדש, הטוקן משתנה — יש לעדכן את כל הטפסים שמשתמשים בו. בלוח הבקרה: **דפי נחיתה → אינטגרציה** או פעולת **רענון טוקן** (מנהל בלבד).

## קבצים בפרויקט

- `public/examples/landing-form-example.html` — דף HTML מלא לבדיקה.
- `docs/INTEGRATION.md` — תקציר קצר ישן (מעודכן בחלקו ל-`landing_token`).
