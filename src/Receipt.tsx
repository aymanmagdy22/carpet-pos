import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'

type Invoice = {
  id: number; customer_name: string | null; customer_phone: string | null
  total: number; paid: number; change_due: number; status: string; created_at: string
}
type Item = {
  id: number; product_name: string; quantity: number; unit_price: number; line_total: number
}
type Shop = { shop_name: string; address: string | null; phone: string | null; invoice_footer: string | null }

export default function Receipt({ invoiceId }: { invoiceId: number }) {
  const [inv, setInv] = useState<Invoice | null>(null)
  const [items, setItems] = useState<Item[]>([])
  const [shop, setShop] = useState<Shop | null>(null)

  useEffect(() => {
    supabase.from('invoices').select('*').eq('id', invoiceId).single()
      .then(({ data }) => setInv(data as Invoice))
    supabase.from('invoice_items_public').select('*').eq('invoice_id', invoiceId)
      .then(({ data }) => setItems((data ?? []) as Item[]))
    supabase.from('settings').select('*').single()
      .then(({ data }) => setShop(data as Shop))
  }, [invoiceId])

  if (!inv) return <p>جاري تحميل الفاتورة...</p>

  return (
    <div>
      <div className="receipt">
        <h3 style={{ textAlign: 'center', margin: 0 }}>{shop?.shop_name}</h3>
        {shop?.address && <div style={{ textAlign: 'center' }}>{shop.address}</div>}
        {shop?.phone && <div style={{ textAlign: 'center' }}>{shop.phone}</div>}
        <hr />
        <div>فاتورة رقم: {inv.id}</div>
        <div>{new Date(inv.created_at).toLocaleString('ar-EG')}</div>
        {inv.customer_name && <div>العميل: {inv.customer_name}</div>}
        {inv.customer_phone && <div>الهاتف: {inv.customer_phone}</div>}
        {inv.status === 'cancelled' && <div><b>*** ملغاة ***</b></div>}
        <hr />
        <table>
          <tbody>
            {items.map(i => (
              <tr key={i.id}>
                <td>{i.product_name}<br /><small>{i.quantity} × {i.unit_price}</small></td>
                <td>{i.line_total}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <hr />
        <div><b>الإجمالي: {inv.total} ج</b></div>
        <div>المدفوع: {inv.paid} ج</div>
        <div>الباقي: {inv.change_due} ج</div>
        <hr />
        <div style={{ textAlign: 'center' }}>{shop?.invoice_footer}</div>
      </div>
      <button className="no-print" onClick={() => window.print()}>🖨️ طباعة الفاتورة</button>
    </div>
  )
}