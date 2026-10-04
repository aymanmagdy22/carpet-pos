import { useEffect, useState } from 'react'
import { useAuth } from './auth'
import { supabase } from './lib/supabase'

type Product = {
  id: number; code: string; name: string
  sale_price: number; quantity: number; cost_price?: number
}

export default function Products() {
  const { profile } = useAuth()
  const isOwner = profile?.role === 'owner'
  const [rows, setRows] = useState<Product[]>([])
  const [err, setErr] = useState('')

  useEffect(() => {
    const table = isOwner ? 'products' : 'products_public'
    supabase.from(table).select('*').order('name').then(({ data, error }) => {
      if (error) setErr(error.message)
      else setRows((data ?? []) as Product[])
    })
  }, [isOwner])

  return (
    <div>
      {err && <p className="err">{err}</p>}
      <table>
        <thead>
          <tr>
            <th>الكود</th><th>الاسم</th><th>سعر البيع</th>
            {isOwner && <th>سعر الشراء</th>}
            <th>الكمية</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(p => (
            <tr key={p.id}>
              <td>{p.code}</td><td>{p.name}</td><td>{p.sale_price}</td>
              {isOwner && <td>{p.cost_price}</td>}
              <td>{p.quantity}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}