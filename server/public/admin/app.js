const TOKEN_KEY = 'leads_admin_token'

let cachedRows = []

const api = (path, opts = {}) => {
  const token = sessionStorage.getItem(TOKEN_KEY)
  const headers = {
    'Content-Type': 'application/json',
    ...(opts.headers || {})
  }
  if (token) headers.Authorization = `Bearer ${token}`
  return fetch(path, { ...opts, headers })
}

const $ = (sel) => document.querySelector(sel)

const STATUS_OPTIONS = [
  'new',
  'contacted',
  'qualified',
  'won',
  'lost',
  'spam'
]

function formatDate(iso) {
  if (!iso) return '—'
  try {
    const d = new Date(iso)
    return d.toLocaleString('he-IL', {
      dateStyle: 'short',
      timeStyle: 'short'
    })
  } catch {
    return iso
  }
}

function showLoginError(msg) {
  const el = $('#loginError')
  el.textContent = msg
  el.hidden = !msg
}

function showLoadError(msg) {
  const el = $('#loadError')
  el.textContent = msg
  el.hidden = !msg
}

function setLoggedIn(on) {
  $('#panelLogin').hidden = on
  $('#panelDash').hidden = !on
  $('#btnLogout').hidden = !on
}

async function loadLeads() {
  showLoadError('')
  const res = await api('/api/leads')
  if (res.status === 401) {
    sessionStorage.removeItem(TOKEN_KEY)
    setLoggedIn(false)
    showLoginError('הטוקן אינו תקין או שפג תוקף. נסה שוב.')
    return
  }
  if (!res.ok) {
    const j = await res.json().catch(() => ({}))
    showLoadError(j.error || 'שגיאה בטעינת לידים')
    return
  }
  const { data } = await res.json()
  cachedRows = Array.isArray(data) ? data : []
  renderTable(cachedRows)
}

function renderStats(rows) {
  const el = $('#stats')
  const total = rows.length
  const fresh = rows.filter((r) => r.status === 'new').length
  el.innerHTML = `
    <span class="stat">סה״כ לידים: <strong>${total}</strong></span>
    <span class="stat">חדשים: <strong>${fresh}</strong></span>
  `
}

function renderTable(rows) {
  const q = ($('#q').value || '').trim().toLowerCase()
  let list = rows
  if (q) {
    list = rows.filter((r) => {
      const blob = [
        r.full_name,
        r.phone,
        r.email,
        r.page_source,
        r.message,
        r.status
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      return blob.includes(q)
    })
  }

  renderStats(rows)

  const tbody = $('#tbody')
  const empty = $('#emptyState')
  tbody.innerHTML = ''

  if (!list.length) {
    empty.hidden = rows.length > 0
    return
  }
  empty.hidden = true

  for (const r of list) {
    const tr = document.createElement('tr')
    const phoneDisplay = r.phone || '—'
    const phoneHref = (r.phone || '').replace(/\s/g, '')
    const statusValues = [...STATUS_OPTIONS]
    if (r.status && !statusValues.includes(r.status)) statusValues.push(r.status)
    statusValues.push('__custom__')

    tr.innerHTML = `
      <td>${escapeHtml(r.full_name || '—')}</td>
      <td>
        ${
          phoneHref
            ? `<a class="phone-link" href="tel:${escapeAttr(phoneHref)}">${escapeHtml(
                phoneDisplay
              )}</a>`
            : escapeHtml(phoneDisplay)
        }
      </td>
      <td>${escapeHtml(r.page_source || '—')}</td>
      <td>
        <select class="status-select" data-id="${escapeAttr(r.id)}" aria-label="סטטוס">
          ${statusValues
            .map((s) => {
              if (s === '__custom__') {
                return `<option value="__custom__">מותאם אישית…</option>`
              }
              return `<option value="${escapeAttr(s)}" ${
                r.status === s ? 'selected' : ''
              }>${escapeHtml(s)}</option>`
            })
            .join('')}
        </select>
      </td>
      <td>${formatDate(r.created_at)}</td>
      <td class="col-actions">
        <div class="actions">
          <button type="button" class="btn btn-ghost btn-sm btn-view" data-id="${escapeAttr(
            r.id
          )}">צפייה</button>
          <button type="button" class="btn btn-danger btn-sm btn-del" data-id="${escapeAttr(
            r.id
          )}">מחיקה</button>
        </div>
      </td>
    `
    tbody.appendChild(tr)
  }

  tbody.querySelectorAll('.status-select').forEach((sel) => {
    sel.addEventListener('change', async () => {
      const id = sel.getAttribute('data-id')
      let status = sel.value
      if (status === '__custom__') {
        const v = window.prompt('הזן סטטוס:', '')
        if (v == null || !String(v).trim()) {
          await loadLeads()
          return
        }
        status = String(v).trim()
      }
      const res = await api(`/api/leads/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ status })
      })
      if (!res.ok) {
        alert('שגיאה בעדכון סטטוס')
        await loadLeads()
        return
      }
      await loadLeads()
    })
  })

  tbody.querySelectorAll('.btn-view').forEach((btn) => {
    btn.addEventListener('click', () => openModal(rows.find((x) => x.id === btn.dataset.id)))
  })

  tbody.querySelectorAll('.btn-del').forEach((btn) => {
    btn.addEventListener('click', async () => {
      if (!confirm('למחוק ליד זה? ללא אפשרות שחזור.')) return
      const res = await api(`/api/leads/${btn.dataset.id}`, { method: 'DELETE' })
      if (!res.ok) {
        alert('שגיאה במחיקה')
        return
      }
      await loadLeads()
    })
  })
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function escapeAttr(s) {
  return escapeHtml(s).replace(/'/g, '&#39;')
}

function openModal(row) {
  if (!row) return
  $('#modalTitle').textContent = row.full_name || 'ליד'
  const dl = $('#detail')
  dl.innerHTML = `
    <dt>שם</dt><dd>${escapeHtml(row.full_name || '—')}</dd>
    <dt>טלפון</dt><dd>${escapeHtml(row.phone || '—')}</dd>
    <dt>אימייל</dt><dd>${escapeHtml(row.email || '—')}</dd>
    <dt>מקור דף</dt><dd>${escapeHtml(row.page_source || '—')}</dd>
    <dt>סטטוס</dt><dd>${escapeHtml(row.status || '—')}</dd>
    <dt>הודעה</dt><dd>${escapeHtml(row.message || '—')}</dd>
    <dt>נוצר</dt><dd>${formatDate(row.created_at)}</dd>
    <dt>עודכן</dt><dd>${formatDate(row.updated_at)}</dd>
    <dt>מזהה</dt><dd><code>${escapeHtml(row.id)}</code></dd>
  `
  $('#modal').hidden = false
}

function closeModal() {
  $('#modal').hidden = true
}

$('#btnLogin').addEventListener('click', () => {
  const t = ($('#adminToken').value || '').trim()
  if (!t) {
    showLoginError('הזן טוקן.')
    return
  }
  sessionStorage.setItem(TOKEN_KEY, t)
  showLoginError('')
  setLoggedIn(true)
  loadLeads()
})

$('#btnLogout').addEventListener('click', () => {
  sessionStorage.removeItem(TOKEN_KEY)
  setLoggedIn(false)
})

$('#btnRefresh').addEventListener('click', () => {
  if (sessionStorage.getItem(TOKEN_KEY)) loadLeads()
})

$('#q').addEventListener('input', () => {
  renderTable(cachedRows)
})

$('#modalClose').addEventListener('click', closeModal)
$('#modal').addEventListener('click', (e) => {
  if (e.target && e.target.dataset && e.target.dataset.close !== undefined) closeModal()
})

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeModal()
})

// אם כבר יש טוקן — נכנס אוטומטית
if (sessionStorage.getItem(TOKEN_KEY)) {
  setLoggedIn(true)
  loadLeads()
}
