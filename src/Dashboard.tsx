import { useCallback, useEffect, useState } from 'react'
import { useAuth } from './auth'
import { supabase } from './lib/supabase'

type Report = {
  invoices_count: number; sales: number; gross_profit: number
  expenses: number; net_profit: number
}
type Row = { product_name: string; quantity: number }

const fmtDate = (d: Date) => d.toLocaleDateString('en-CA')
const nextDay = (s: string) => {
  const d = new Date(s + 'T00:00:00')
  d.setDate(d.getDate() + 1)
  return d.toISOString()
}

export default function Dashboard({ go }: { go: (t: string) => void }) {
  const { profile } = useAuth()
  const isOwner = profile?.role === 'owner'
  const now = new Date()
  const [from, setFrom] = useState(fmtDate(now))
  const [to, setTo] = useState(fmtDate(now))
  const [rep, setRep] = useState<Report | null>(null)
  const [pieces, setPieces] = useState(0)
  const [top, setTop] = useState<[string, number][]>([])
  const [low, setLow] = useState(0)
  const [err, setErr] = useState('')

  const load = useCallback(async () => {
    if (!isOwner) return
    setErr('')
    const [r, it, pr] = await Promise.all([
      supabase.rpc('profit_report', { p_from: from, p_to: to }),
      supabase.from('invoice_items')
        .select('product_name, quantity, invoices!inner(status, created_at)')
        .eq('invoices.status', 'active')
        .gte('invoices.created_at', new Date(from + 'T00:00:00').toISOString())
        .lt('invoices.created_at', nextDay(to)),
      supabase.from('products').select('quantity, min_stock').eq('active', true),
    ])
    if (r.error) return setErr(r.error.message)
    setRep((r.data as Report[])[0] ?? null)

    const items = (it.data ?? []) as unknown as Row[]
    setPieces(items.reduce((a, x) => a + Number(x.quantity), 0))
    const m = new Map<string, number>()
    items.forEach(x => m.set(x.product_name, (m.get(x.product_name) ?? 0) + Number(x.quantity)))
    setTop([...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5))

    const prods = (pr.data ?? []) as { quantity: number; min_stock: number }[]
    setLow(prods.filter(p => p.quantity <= p.min_stock).length)
  }, [isOwner, from, to])

  useEffect(() => { load() }, [load])

  function preset(kind: 'today' | 'month') {
    const d = new Date()
    setTo(fmtDate(d))
    setFrom(kind === 'today' ? fmtDate(d) : fmtDate(new Date(d.getFullYear(), d.getMonth(), 1)))
  }

  const money = (n?: number) => (n ?? 0).toLocaleString('ar-EG', { maximumFractionDigits: 2 })

  return (
    <div>
      <h3>الرئيسية</h3>
      <div className="shortcuts">
        <button onClick={() => go('invoice')}>🧾 فاتورة جديدة</button>
        <button onClick={() => go('history')}>📜 سجل المبيعات</button>
        <button onClick={() => go('products')}>📦 المنتجات</button>
        {isOwner && <button onClick={() => go('expenses')}>💸 المصروفات</button>}
      </div>

      {!isOwner && <p className="mut">اختار من الاختصارات فوق للبدء.</p>}

      {isOwner && (
        <>
          <div className="filters" style={{ marginTop: 16 }}>
            <button className="ghost" onClick={() => preset('today')}>اليوم</button>
            <button className="ghost" onClick={() => preset('month')}>هذا الشهر</button>
            <input type="date" value={from} onChange={e => setFrom(e.target.value)} />
            <input type="date" value={to} onChange={e => setTo(e.target.value)} />
          </div>
          {err && <p className="err">{err}</p>}
          {low > 0 && <p className="warn">⚠️ فيه {low} منتج وصل للحد الأدنى للمخزون أو أقل.</p>}

          <div className="cards">
            <div className="stat"><span>المبيعات</span><b>{money(rep?.sales)} ج</b></div>
            <div className="stat"><span>عدد الفواتير</span><b>{rep?.invoices_count ?? 0}</b></div>
            <div className="stat"><span>القطع المباعة</span><b>{pieces}</b></div>
            <div className="stat"><span>الربح الإجمالي</span><b>{money(rep?.gross_profit)} ج</b></div>
            <div className="stat"><span>المصروفات</span><b>{money(rep?.expenses)} ج</b></div>
            <div className="stat net"><span>صافي الربح</span><b>{money(rep?.net_profit)} ج</b></div>
          </div>

          <h4>الأكثر مبيعًا في الفترة</h4>
          {top.length === 0 ? <p className="mut">لا توجد مبيعات في الفترة دي.</p> : (
            <table>
              <thead><tr><th>المنتج</th><th>القطع</th></tr></thead>
              <tbody>{top.map(([n, q]) => <tr key={n}><td>{n}</td><td>{q}</td></tr>)}</tbody>
            </table>
          )}
        </>
      )}
    </div>
  )
}