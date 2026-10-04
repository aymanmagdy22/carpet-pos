import { useEffect, useMemo, useState } from 'react'
import { supabase } from './lib/supabase'
import Receipt from './Receipt'

type Product = {
  id: number; code: string; name: string; size: string | null
  color: string | null; sale_price: number; quantity: number
}
type Line = {
  product_id: number; name: string; quantity: number
  unit_price: number; stock: number
}

export default function NewInvoice() {
  const [products, setProducts] = useState<Product[]>([])
  const [q, setQ] = useState('')
  const [cart, setCart] = useState<Line[]>([])
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [paid, setPaid] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const [doneId, setDoneId] = useState<number | null>(null)

  function load() {
    supabase.from('products_public').select('*').order('name')
      .then(({ data }) => setProducts((data ?? []) as Product[]))
  }
  useEffect(load, [])

  const found = useMemo(() => {
    const s = q.trim().toLowerCase()
    if (!s) return []
    return products
      .filter(p => p.name.toLowerCase().includes(s) || p.code.toLowerCase().includes(s))
      .slice(0, 8)
  }, [q, products])

  const total = cart.reduce((a, l) => a + l.quantity * l.unit_price, 0)
  const paidNum = Number(paid) || 0
  const change = paidNum - total

  function add(p: Product) {
    setQ('')
    setCart(c => {
      const ex = c.find(l => l.product_id === p.id)
      if (ex) return c.map(l => l.product_id === p.id ? { ...l, quantity: l.quantity + 1 } : l)
      return [...c, { product_id: p.id, name: p.name, quantity: 1, unit_price: p.sale_price, stock: p.quantity }]
    })
  }

  function update(id: number, patch: Partial<Line>) {
    setCart(c => c.map(l => l.product_id === id ? { ...l, ...patch } : l))
  }

  function onSearchKey(e: React.KeyboardEvent) {
    if (e.key !== 'Enter') return
    const s = q.trim().toLowerCase()
    const exact = products.find(p => p.code.toLowerCase() === s) ?? (found.length === 1 ? found[0] : undefined)
    if (exact) add(exact)
  }

  async function save() {
    setErr('')
    if (cart.length === 0) return setErr('الفاتورة فاضية')
    if (cart.some(l => l.quantity <= 0)) return setErr('الكمية لازم تكون أكبر من صفر')
    if (cart.some(l => l.quantity > l.stock)) return setErr('فيه كمية أكبر من المتاح في المخزون')
    if (paidNum < total) return setErr('المبلغ المدفوع أقل من الإجمالي')
    setBusy(true)
    const { data, error } = await supabase.rpc('create_invoice', {
      p_customer_name: name,
      p_customer_phone: phone,
      p_items: cart.map(l => ({ product_id: l.product_id, quantity: l.quantity, unit_price: l.unit_price })),
      p_paid: paidNum,
    })
    setBusy(false)
    if (error) return setErr(error.message)
    setDoneId(data as number)
  }

  function reset() {
    setDoneId(null); setCart([]); setName(''); setPhone(''); setPaid(''); setErr(''); load()
  }

  if (doneId) {
    return (
      <div>
        <p style={{ color: 'green' }}>✔ تم حفظ الفاتورة</p>
        <Receipt invoiceId={doneId} />
        <button className="no-print" style={{ marginTop: 12 }} onClick={reset}>➕ فاتورة جديدة</button>
      </div>
    )
  }

  return (
    <div>
      <h3>فاتورة جديدة</h3>

      <label>بحث بالاسم أو الكود</label>
      <input value={q} onChange={e => setQ(e.target.value)} onKeyDown={onSearchKey}
             placeholder="اكتب اسم السجادة أو كودها ثم Enter" autoFocus />
      {found.map(p => (
        <div key={p.id} className="result" onClick={() => add(p)}>
          <b>{p.name}</b> — {p.code} {p.size ?? ''} {p.color ?? ''}
          <span> | {p.sale_price} ج | متاح: {p.quantity}</span>
        </div>
      ))}

      <table style={{ marginTop: 12 }}>
        <thead><tr><th>الصنف</th><th>الكمية</th><th>السعر</th><th>الإجمالي</th><th></th></tr></thead>
        <tbody>
          {cart.map(l => (
            <tr key={l.product_id}>
              <td>{l.name}<br /><small>متاح: {l.stock}</small></td>
              <td><input type="number" min="0" value={l.quantity}
                         onChange={e => update(l.product_id, { quantity: Number(e.target.value) })} /></td>
              <td><input type="number" min="0" value={l.unit_price}
                         onChange={e => update(l.product_id, { unit_price: Number(e.target.value) })} /></td>
              <td>{(l.quantity * l.unit_price).toFixed(2)}</td>
              <td><button onClick={() => setCart(c => c.filter(x => x.product_id !== l.product_id))}>✕</button></td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="box2">
        <label>اسم العميل</label>
        <input value={name} onChange={e => setName(e.target.value)} />
        <label>رقم الهاتف</label>
        <input value={phone} onChange={e => setPhone(e.target.value)} inputMode="tel" />
        <h2>الإجمالي: {total.toFixed(2)} ج</h2>
        <label>المبلغ المدفوع (كاش)</label>
        <input type="number" min="0" value={paid} onChange={e => setPaid(e.target.value)} />
        {paid !== '' && <p>الباقي للعميل: <b>{change >= 0 ? change.toFixed(2) : 'المبلغ ناقص'}</b></p>}
        {err && <p className="err">{err}</p>}
        <button onClick={save} disabled={busy}>{busy ? 'جاري الحفظ...' : 'حفظ الفاتورة'}</button>
      </div>
    </div>
  )
}