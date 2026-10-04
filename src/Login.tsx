import { useState, type FormEvent } from 'react'
import { supabase } from './lib/supabase'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) setError('البريد أو كلمة المرور غير صحيحة')
    setBusy(false)
  }

  return (
    <form className="box" onSubmit={submit}>
      <h2>🧶 تسجيل الدخول</h2>
      <label>البريد الإلكتروني</label>
      <input type="email" value={email} onChange={e => setEmail(e.target.value)} required />
      <label>كلمة المرور</label>
      <input type="password" value={password} onChange={e => setPassword(e.target.value)} required />
      {error && <p className="err">{error}</p>}
      <button disabled={busy}>{busy ? 'جاري الدخول...' : 'دخول'}</button>
    </form>
  )
}