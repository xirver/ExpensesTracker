const BASE = '/api'

function getToken() {
  return localStorage.getItem('et_token')
}

function headers() {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${getToken()}`
  }
}

async function request(method, path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: headers(),
    body: body ? JSON.stringify(body) : undefined
  })
  if (res.status === 401) {
    window.dispatchEvent(new Event('auth:logout'))
    throw new Error('Unauthorized')
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || 'Request failed')
  }
  return res.json()
}

export const api = {
  login:  (u, p)   => request('POST', '/auth/login',    { username: u, password: p }),
  register:(u, p)  => request('POST', '/auth/register', { username: u, password: p }),
  getData:()       => request('GET',  '/data'),
  addTransaction:     (tx)  => request('POST',   '/transactions',      tx),
  updateTransaction:  (id, tx) => request('PUT',  `/transactions/${id}`, tx),
  deleteTransaction:  (id)  => request('DELETE', `/transactions/${id}`),
  updateBudget:   (b)  => request('PUT', '/budget',   b),
  updateSettings: (s)  => request('PUT', '/settings', s),
}
