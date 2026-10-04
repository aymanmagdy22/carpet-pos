import { useCallback, useEffect, useState } from 'react'
import { supabase } from './lib/supabase'

type Cat = { id: number; name: string }
type Exp = {
  id: number; amount: number; description: string | null; expense_date: string
  expense_categories: { name: string } | null
}

const today = () => new Date().toLocaleDateString('en-CA')

export default function Expenses() {
  const [cats, setCats] = useState<Cat[]>([])
  const [rows, setRows] = useState<Exp[]>([])
  const [catId, setCatId] = useState('')
  const [amount, setAmount] = useState('')
  const [desc, setDesc] = useState('')
  const [date, setDate] = useState(today())
  const [err, setErr] = useState('')
  const [msg, setMsg] = useState('')

  const load = useCallback(async () => {
    const c = await supabase.from('expense_categories').select('*').order('id')
    const cs = (c.data ?? []) as Cat[]
    setCats(cs)
    setCatId(prev => prev || (cs[0] ? String(cs[0].id) : ''))
    const e = await supabase.from('expenses')
      .select('id, amount, description, expense_date, expense_categories(name)')
      .order('expense_date', { ascending: false }).order('id', { ascending: false }).limit(100)
    if (e.error) setErr(e.error.message)
    else setRows((e.data ?? []) as unknown as Exp[])
  }, [])

  useEffect(() => { load() }, [load])

  async function save() {
    setErr('')
    const amt = Number(amount)
    if (!catId) return setErr('اختار التصنيف')
    if (isNaN(amt) || amt <= 0) return setErr('اكتب قيمة صحيحة أكبر من صفر')
    const { error } = await supabase.from('expenses').insert({
      category_id: Number(catId), amount: amt,
      description: desc.trim() || null, expense_date: date,
    })
    if (error) return setErr(error.message)
    setAmount(''); setDesc('')
    setMsg('تم تسجيل المصروف ✔')
    setTimeout(() => setMsg(''), 3000)
    load()
  }

  const total = rows.reduce((a, r) => a + Number(r.amount), 0)

  return (
    <div>
      <h3>المصروفات</h3>
      <div className="box2">
        <div className="formgrid">
          <div>
            <label>التصنيف</label>
            <select value={catId} onChange={e => setCatId(e.target.value)}>
              {cats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div><label>القيمة</label>
            <input type="number" min="0" value={amount} onChange={e => setAmount(e.target.value)} /></div>
          <div><label>التاريخ</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} /></div>
          <div><label>الوصف</label>
            <input value={desc} onChange={e => setDesc(e.target.value)} /></div>
        </div>
        {err && <p className="err">{err}</p>}
        {msg && <p style={{ color: 'green' }}>{msg}</p>}
        <button onClick={save}>➕ تسجيل المصروف</button>
      </div>

      <p style={{ marginTop: 16 }}>إجمالي آخر {rows.length} مصروف: <b>{total.toFixed(2)} ج</b></p>
      <div style={{ overflowX: 'auto' }}>
        <table>
          <thead><tr><th>التاريخ</th><th>التصنيف</th><th>القيمة</th><th>الوصف</th></tr></thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.id}>
                <td>{r.expense_date}</td>
                <td>{r.expense_categories?.name}</td>
                <td>{r.amount}</td>
                <td>{r.description ?? '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}