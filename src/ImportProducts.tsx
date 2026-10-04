import { useState } from 'react'
import readXlsxFile from 'read-excel-file'
import { supabase } from './lib/supabase'

type Item = {
  row: number; code: string; name: string; size: string; color: string; material: string
  cost_price: number; sale_price: number; quantity: number; min_stock: number
  errors: string[]
}

const H: Record<string, string[]> = {
  code: ['الكود', 'كود', 'code'],
  name: ['الاسم', 'اسم السجادة', 'name'],
  size: ['المقاس', 'size'],
  color: ['اللون', 'color'],
  material: ['الخامة', 'material'],
  cost_price: ['سعر الشراء', 'cost_price', 'cost'],
  sale_price: ['سعر البيع', 'sale_price', 'price'],
  quantity: ['الكمية', 'quantity', 'qty'],
  min_stock: ['حد التنبيه', 'min_stock'],
}
const REQUIRED = ['code', 'name', 'cost_price', 'sale_price', 'quantity']

const str = (v: unknown) => (v === null || v === undefined ? '' : String(v).trim())
const num = (v: unknown, def: number) => {
  const s = str(v).replace(/,/g, '')
  return s === '' ? def : Number(s)
}

export default function ImportProducts() {
  const [items, setItems] = useState<Item[]>([])
  const [fileErr, setFileErr] = useState('')
  const [err, setErr] = useState('')
  const [done, setDone] = useState('')
  const [busy, setBusy] = useState(false)
  const [fileName, setFileName] = useState('')

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    setItems([]); setFileErr(''); setErr(''); setDone('')
    if (!file) return
    setFileName(file.name)
    try {
      const rows = await readXlsxFile(file)
      if (rows.length < 2) return setFileErr('الملف فاضي أو فيه الصف الأول بس')

      const header = rows[0].map(c => str(c).toLowerCase())
      const idx: Record<string, number> = {}
      for (const f of Object.keys(H)) idx[f] = header.findIndex(h => H[f].includes(h))
      const missing = REQUIRED.filter(f => idx[f] === -1)
      if (missing.length) {
        return setFileErr('أعمدة ناقصة في الصف الأول: ' + missing.map(f => H[f][0]).join('، '))
      }

      const ex = await supabase.from('products').select('code')
      if (ex.error) return setFileErr(ex.error.message)
      const existing = new Set((ex.data ?? []).map((x: { code: string }) => x.code))
      const seen = new Set<string>()
      const out: Item[] = []

      rows.slice(1).forEach((r, i) => {
        const get = (f: string) => (idx[f] === -1 ? '' : r[idx[f]])
        if (r.every(c => str(c) === '')) return
        const it: Item = {
          row: i + 2,
          code: str(get('code')), name: str(get('name')),
          size: str(get('size')), color: str(get('color')), material: str(get('material')),
          cost_price: num(get('cost_price'), NaN), sale_price: num(get('sale_price'), NaN),
          quantity: num(get('quantity'), NaN), min_stock: num(get('min_stock'), 1),
          errors: [],
        }
        if (!it.code) it.errors.push('الكود فاضي')
        if (!it.name) it.errors.push('الاسم فاضي')
        if (isNaN(it.cost_price) || it.cost_price < 0) it.errors.push('سعر الشراء غير صحيح')
        if (isNaN(it.sale_price) || it.sale_price < 0) it.errors.push('سعر البيع غير صحيح')
        if (isNaN(it.quantity) || it.quantity < 0) it.errors.push('الكمية غير صحيحة')
        if (isNaN(it.min_stock) || it.min_stock < 0) it.errors.push('حد التنبيه غير صحيح')
        if (it.code) {
          if (seen.has(it.code)) it.errors.push('الكود مكرر في الملف')
          if (existing.has(it.code)) it.errors.push('الكود موجود بالفعل في النظام')
          seen.add(it.code)
        }
        out.push(it)
      })
      setItems(out)
    } catch {
      setFileErr('مش قادر أقرأ الملف. لازم يكون Excel بامتداد .xlsx')
    }
  }

  const bad = items.filter(i => i.errors.length > 0).length
  const good = items.length - bad

  async function doImport() {
    setErr('')
    if (items.length === 0 || bad > 0) return
    if (!window.confirm(`هيتم استيراد ${items.length} منتج. تأكيد؟`)) return
    setBusy(true)
    const { data, error } = await supabase.rpc('import_products', {
      p_rows: items.map(i => ({
        code: i.code, name: i.name, size: i.size, color: i.color, material: i.material,
        cost_price: i.cost_price, sale_price: i.sale_price,
        quantity: i.quantity, min_stock: i.min_stock,
      })),
    })
    setBusy(false)
    if (error) return setErr('فشل الاستيراد ولم يتم حفظ أي شيء: ' + error.message)
    setDone(`تم استيراد ${data} منتج ✔`)
    setItems([]); setFileName('')
  }

  return (
    <div>
      <h3>استيراد المنتجات من Excel</h3>
      <div className="box2">
        <p>الصف الأول في الملف لازم يكون فيه أسماء الأعمدة دي:</p>
        <p><b>الكود | الاسم | المقاس | اللون | الخامة | سعر الشراء | سعر البيع | الكمية | حد التنبيه</b></p>
        <p className="mut">
          المطلوب: الكود، الاسم، سعر الشراء، سعر البيع، الكمية. الباقي اختياري.
          الكود لازم يكون فريد، والأرقام من غير كلمة "جنيه". الملف بامتداد .xlsx.
        </p>
        <input type="file" accept=".xlsx" onChange={onFile} />
        {fileName && <p className="mut">الملف: {fileName}</p>}
        {fileErr && <p className="err">{fileErr}</p>}
        {done && <p style={{ color: 'green' }}>{done}</p>}
      </div>

      {items.length > 0 && (
        <>
          <p style={{ marginTop: 12 }}>
            إجمالي الصفوف: <b>{items.length}</b> — سليمة: <b>{good}</b> — فيها أخطاء:{' '}
            <b className={bad ? 'err' : ''}>{bad}</b>
          </p>
          {bad > 0
            ? <p className="err">صلّح الأخطاء في ملف Excel وارفعه تاني. مش هيتم استيراد أي حاجة قبل ما كله يبقى سليم.</p>
            : <p style={{ color: 'green' }}>كله سليم. راجع الجدول وبعدين اضغط استيراد.</p>}
          {err && <p className="err">{err}</p>}
          <button onClick={doImport} disabled={busy || bad > 0}>
            {busy ? 'جاري الاستيراد...' : `استيراد ${items.length} منتج`}
          </button>
          <div style={{ overflowX: 'auto', marginTop: 12 }}>
            <table>
              <thead>
                <tr>
                  <th>صف</th><th>الكود</th><th>الاسم</th><th>المقاس</th><th>اللون</th><th>الخامة</th>
                  <th>شراء</th><th>بيع</th><th>الكمية</th><th>الحالة</th>
                </tr>
              </thead>
              <tbody>
                {items.map(i => (
                  <tr key={i.row} className={i.errors.length ? 'lowrow' : ''}>
                    <td>{i.row}</td><td>{i.code}</td><td>{i.name}</td>
                    <td>{i.size}</td><td>{i.color}</td><td>{i.material}</td>
                    <td>{i.cost_price}</td><td>{i.sale_price}</td><td>{i.quantity}</td>
                    <td>{i.errors.length ? i.errors.join('، ') : '✔'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}