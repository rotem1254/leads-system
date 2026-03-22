# אינטגרציה לדפי נחיתה (תקציר)

למסמך המלא והעדכני ביותר ראה **[LANDING_PAGE_INTEGRATION.md](./LANDING_PAGE_INTEGRATION.md)**.

## נקודת קצה

```
POST {BASE_URL}/api/leads
Content-Type: application/json
```

## גוף הבקשה

```json
{
  "full_name": "ישראל ישראלי",
  "phone": "0501234567",
  "email": "user@example.com",
  "message": "אשמח לשיחה",
  "page_source": "my-landing-summer-2025",
  "landing_token": "lp_..."
}
```

| שדה | חובה | הערות |
|-----|------|--------|
| full_name | כן | |
| phone | כן | |
| page_source | כן | מטא-דאטה לדוחות (לא קובע בעלות) |
| landing_token | כן | מהמסך **דפי נחיתה** בלוח הבקרה |
| email | לא | אם נשלח — חייב להיות אימייל תקין |
| message | לא | |

## דוגמת fetch

```javascript
const res = await fetch("https://YOUR-DOMAIN.com/api/leads", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    full_name: "ישראל ישראלי",
    phone: "0501234567",
    email: "user@example.com",
    message: "",
    page_source: "campaign-facebook-01",
    landing_token: "lp_YOUR_TOKEN_HERE",
  }),
});
```

## דוגמת HTML מלאה

`public/examples/landing-form-example.html`

## CORS

השרת מחזיר כותרות CORS לשילוב מדומיינים חיצוניים. לפרודקשן עם רשימת מקורות: `ALLOWED_ORIGINS`.
