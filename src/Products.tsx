import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAuth } from './auth'
import { supabase } from './lib/supabase'

type P = {
  id: number; code: string; name: string
  size: string | null; color: string | null; material: string | null
  sale_price: number; quantity: number; min_stock: number
  cost_price?: number; active?: boolean
}

type Form = {
  id?: number; code: string; name: string; size: string; color: string
  material: string; cost_price: string; sale_price: string
  min_stock: string; quantity: string
}

const empty: Form = {
  code: '', name: '', size: '', color: '', material: '',
  cost_price: '', sale_price: '', min_stock: '1', quantity: '0',
}

export default function Products() {
  const { profile } = useAuth()
  const isOwner = profile?.role === 'owner'
  const [rows, setRows] = useState<P[]>([])
  const [q, setQ] = useState('')
  const [lowOnly, setLowOnly] = useState(false)
  const [form, setForm] = useState<Form | null>(null)
  const [err, setErr] = useState('')
  const [msg, setMsg] = useState('')

  const load = useCallback(async () => {
    const table = isOwner ? 'products' : 'products_public'
    const { data, error } = await supabase.from(table).select('*').order('name')
    if (error) setErr(error.message)
    else setRows((data ?? []) as P[])
  }, [isOwner])

  useEffect(() => { load() }, [load])

  const shown = useMemo(() => {
    const s = q.trim().toLowerCase()
    return rows.filter(p =>
      (!s || p.name.toLowerCase().includes(s) || p.code.toLowerCase().includes(s)) &&
      (!lowOnly || (p.active !== false && p.quantity <= p.min_stock))
    )
  }, [rows, q, lowOnly])

  const lowCount = rows.filter(p => p.active !== false && p.quantity <= p.min_stock).length

  function flash(t: string) { setMsg(t); setTimeout(() => setMsg(''), 3000) }

  function edit(p: P) {
    setErr('')
    setForm({
      id: p.id, code: p.code, name: p.name,
      size: p.size ?? '', color: p.color ?? '', material: p.material ?? '',
      cost_price: String(p.cost_price ?? 0), sale_price: String(p.sale_price),
      min_stock: String(p.min_stock), quantity: String(p.quantity),
    })
  }

  async function save() {
    if (!form) return
    setErr('')
    const code = form.code.trim()
    const name = form.name.trim()
    const cost = Number(form.cost_price)
    const sale = Number(form.sale_price)
    const minStock = Number(form.min_stock)
    const qty = Number(form.quantity)
    if (!code || !name) return setErr('الكود والاسم مطلوبين')
    if (isNaN(cost) || cost < 0 || isNaN(sale) || sale < 0) return setErr('الأسعار غير صحيحة')
    if (isNaN(minStock) || minStock < 0) return setErr('الحد الأدنى غير صحيح')

    const body = {
      code, name,
      size: form.size.trim() || null,
      color: form.color.trim() || null,
      material: form.material.trim() || null,
      cost_price: cost, sale_price: sale, min_stock: minStock,
    }

    if (form.id) {
      const { error } = await supabase.from('products').update(body).eq('id', form.id)
      if (error) return setErr(error.message.includes('duplicate') ? 'الكود ده مستخدم قبل كده' : error.message)
    } else {
      if (isNaN(qty) || qty < 0) return setErr('الكمية غير صحيحة')
      const { data, error } = await supabase.from('products')
        .insert({ ...body, quantity: 0 }).select('id').single()
      if (error) return setErr(error.message.includes('duplicate') ? 'الكود ده مستخدم قبل كده' : error.message)
      if (qty > 0) {
        const r = await supabase.rpc('adjust_stock', {
          p_product: data.id, p_change: qty, p_reason: 'رصيد افتتاحي',
        })
        if (r.error) return setErr(r.error.message)
      }
    }
    setForm(null)
    flash('تم الحفظ ✔')
    load()
  }

  async function adjust(p: P) {
    const c = window.prompt(`تسوية مخزون "${p.name}"\nالرصيد الحالي: ${p.quantity}\nاكتب الكمية (موجب للزيادة، سالب للنقص):`)
    if (c === null) return
    const change = Number(c)
    if (!c.trim() || isNaN(change) || change === 0) return setErr('اكتب رقم صحيح غير الصفر')
    const reason = window.prompt('سبب التسوية (مثال: بضاعة جديدة / تلف / فرق جرد):')
    if (!reason || !reason.trim()) return setErr('السبب مطلوب')
    setErr('')
    const { error } = await supabase.rpc('adjust_stock', {
      p_product: p.id, p_change: change, p_reason: reason,
    })
    if (error) return setErr(error.message)
    flash('تمت التسوية ✔')
    load()
  }

  async function toggle(p: P) {
    const to = p.active === false
    if (!window.confirm(to ? `تفعيل "${p.name}"؟` : `إيقاف "${p.name}"؟ مش هيظهر في البيع.`)) return
    const { error } = await supabase.from('products').update({ active: to }).eq('id', p.id)
    if (error) return setErr(error.message)
    load()
  }

  const set = (k: keyof Form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => f ? { ...f, [k]: e.target.value } : f)

  if (form && isOwner) {
    return (
      <div className="box2">
        <h3>{form.id ? 'تعديل منتج' : 'إضافة منتج جديد'}</h3>
        <div className="formgrid">
          <div><label>الكود *</label><input value={form.code} onChange={set('code')} /></div>
          <div><label>الاسم *</label><input value={form.name} onChange={set('name')} /></div>
          <div><label>المقاس</label><input value={form.size} onChange={set('size')} placeholder="200x300" /></div>
          <div><label>اللون</label><input value={form.color} onChange={set('color')} /></div>
          <div><label>الخامة</label><input value={form.material} onChange={set('material')} /></div>
          <div><label>سعر الشراء *</label><input type="number" min="0" value={form.cost_price} onChange={set('cost_price')} /></div>
          <div><label>سعر البيع الافتراضي *</label><input type="number" min="0" value={form.sale_price} onChange={set('sale_price')} /></div>
          <div><label>حد التنبيه (الحد الأدنى)</label><input type="number" min="0" value={form.min_stock} onChange={set('min_stock')} /></div>
          {!form.id && (
            <div><label>الكمية الافتتاحية</label><input type="number" min="0" value={form.quantity} onChange={set('quantity')} /></div>
          )}
        </div>
        {form.id && <p className="mut">لتغيير الكمية استخدم زرار "تسوية" من القائمة عشان تتسجل بسبب.</p>}
        {err && <p className="err">{err}</p>}
        <button onClick={save}>حفظ</button>{' '}
        <button className="ghost" onClick={() => { setForm(null); setErr('') }}>إلغاء</button>
      </div>
    )
  }

  return (
    <div>
      <div className="top">
        <h3>المنتجات</h3>
        {isOwner && <button onClick={() => { setErr(''); setForm(empty) }}>➕ منتج جديد</button>}
      </div>

      {lowCount > 0 && (
        <p className="warn">⚠️ فيه {lowCount} منتج وصل للحد الأدنى للمخزون أو أقل.</p>
      )}
      {msg && <p style={{ color: 'green' }}>{msg}</p>}
      {err && <p className="err">{err}</p>}

      <div className="filters">
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="ابحث بالاسم أو الكود" />
        <label style={{ whiteSpace: 'nowrap' }}>
          <input type="checkbox" style={{ width: 'auto', margin: '0 6px' }}
                 checked={lowOnly} onChange={e => setLowOnly(e.target.checked)} />
          المخزون المنخفض فقط
        </label>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table>
          <thead>
            <tr>
              <th>الكود</th><th>الاسم</th><th>المقاس</th><th>اللون</th><th>الخامة</th>
              <th>سعر البيع</th>
              {isOwner && <th>سعر الشراء</th>}
              <th>الكمية</th>
              {isOwner && <th></th>}
            </tr>
          </thead>
          <tbody>
            {shown.map(p => {
              const low = p.active !== false && p.quantity <= p.min_stock
              return (
                <tr key={p.id} className={p.active === false ? 'muted' : low ? 'lowrow' : ''}>
                  <td>{p.code}</td><td>{p.name}{p.active === false && ' (موقوف)'}</td>
                  <td>{p.size ?? '-'}</td><td>{p.color ?? '-'}</td><td>{p.material ?? '-'}</td>
                  <td>{p.sale_price}</td>
                  {isOwner && <td>{p.cost_price}</td>}
                  <td><b>{p.quantity}</b></td>
                  {isOwner && (
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <button className="sm" onClick={() => edit(p)}>تعديل</button>{' '}
                      <button className="sm" onClick={() => adjust(p)}>تسوية</button>{' '}
                      <button className="sm ghost" onClick={() => toggle(p)}>
                        {p.active === false ? 'تفعيل' : 'إيقاف'}
                      </button>
                    </td>
                  )}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      {shown.length === 0 && <p>مفيش منتجات مطابقة.</p>}
    </div>
  )
}