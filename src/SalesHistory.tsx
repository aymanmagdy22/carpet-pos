import { useCallback, useEffect, useState } from 'react'
import { useAuth } from './auth'
import { supabase } from './lib/supabase'
import Receipt from './Receipt'

type Inv = {
  id: number; customer_name: string | null; customer_phone: string | null
  total: number; status: string; created_at: string; cancel_reason: string | null
}

export default function SalesHistory() {
  const { profile } = useAuth()
  const isOwner = profile?.role === 'owner'
  const [q, setQ] = useState('')
  const [date, setDate] = useState('')
  const [rows, setRows] = useState<Inv[]>([])
  const [openId, setOpenId] = useState<number | null>(null)
  const [version, setVersion] = useState(0)
  const [err, setErr] = useState('')

  const load = useCallback(async () => {
    setErr('')
    let query = supabase.from('invoices').select('*')
      .order('created_at', { ascending: false }).limit(50)

    const s = q.trim().replace(/[,()%]/g, '')
    if (s) {
      const parts = [`customer_name.ilike.%${s}%`, `customer_phone.ilike.%${s}%`]
      if (/^\d+$/.test(s)) parts.push(`id.eq.${s}`)
      query = query.or(parts.join(','))
    }
    if (date) {
      const from = new Date(date + 'T00:00:00')
      const to = new Date(from)
      to.setDate(to.getDate() + 1)
      query = query.gte('created_at', from.toISOString()).lt('created_at', to.toISOString())
    }
    const { data, error } = await query
    if (error) setErr(error.message)
    else setRows((data ?? []) as Inv[])
  }, [q, date])

  useEffect(() => { load() }, [load])

  async function cancel(id: number) {
    const reason = window.prompt('اكتب سبب إلغاء الفاتورة:')
    if (!reason || !reason.trim()) return
    if (!window.confirm(`تأكيد إلغاء الفاتورة رقم ${id}؟ الكمية هترجع للمخزون.`)) return
    const { error } = await supabase.rpc('cancel_invoice', { p_invoice: id, p_reason: reason })
    if (error) return setErr(error.message)
    setVersion(v => v + 1)
    load()
  }

  if (openId !== null) {
    const inv = rows.find(r => r.id === openId)
    return (
      <div>
        <button className="no-print" onClick={() => setOpenId(null)}>← رجوع للسجل</button>
        <Receipt key={version} invoiceId={openId} />
        {err && <p className="err">{err}</p>}
        {inv?.status === 'cancelled' && (
          <p className="err">سبب الإلغاء: {inv.cancel_reason}</p>
        )}
        {isOwner && inv?.status === 'active' && (
          <button className="no-print danger" onClick={() => cancel(openId)}>🚫 إلغاء الفاتورة</button>
        )}
      </div>
    )
  }

  return (
    <div>
      <h3>سجل المبيعات</h3>
      <div className="filters">
        <input value={q} onChange={e => setQ(e.target.value)}
               placeholder="رقم الفاتورة / اسم العميل / التليفون" />
        <input type="date" value={date} onChange={e => setDate(e.target.value)} />
        <button onClick={() => { setQ(''); setDate('') }}>مسح البحث</button>
      </div>
      {err && <p className="err">{err}</p>}
      <table>
        <thead><tr><th>#</th><th>التاريخ</th><th>العميل</th><th>الإجمالي</th><th>الحالة</th></tr></thead>
        <tbody>
          {rows.map(r => (
            <tr key={r.id} className="clickable" onClick={() => setOpenId(r.id)}>
              <td>{r.id}</td>
              <td>{new Date(r.created_at).toLocaleString('ar-EG')}</td>
              <td>{r.customer_name ?? '-'}<br /><small>{r.customer_phone ?? ''}</small></td>
              <td>{r.total}</td>
              <td>{r.status === 'cancelled' ? '🚫 ملغاة' : '✔ سارية'}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {rows.length === 0 && <p>مفيش فواتير مطابقة.</p>}
    </div>
  )
}