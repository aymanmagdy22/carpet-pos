import { useState } from 'react'
import { AuthProvider, useAuth } from './auth'
import Login from './Login'
import NewInvoice from './NewInvoice'
import Products from './Products'
import SalesHistory from './SalesHistory'

type Tab = 'invoice' | 'history' | 'products'

function Home() {
  const { profile, signOut } = useAuth()
  const [tab, setTab] = useState<Tab>('invoice')
  const isOwner = profile?.role === 'owner'

  return (
    <div className="page">
      <div className="top no-print">
        <h2>أهلاً {profile?.full_name} ({isOwner ? 'مالك' : 'كاشير'})</h2>
        <button onClick={signOut}>خروج</button>
      </div>
      <div className="nav no-print">
        <button className={tab === 'invoice' ? 'on' : ''} onClick={() => setTab('invoice')}>🧾 فاتورة جديدة</button>
        <button className={tab === 'history' ? 'on' : ''} onClick={() => setTab('history')}>📜 سجل المبيعات</button>
        <button className={tab === 'products' ? 'on' : ''} onClick={() => setTab('products')}>📦 المنتجات</button>
      </div>
      {tab === 'invoice' && <NewInvoice />}
      {tab === 'history' && <SalesHistory />}
      {tab === 'products' && <Products />}
    </div>
  )
}

function Gate() {
  const { session, profile, loading } = useAuth()
  if (loading) return <p className="page">جاري التحميل...</p>
  if (!session) return <Login />
  if (!profile || !profile.active) {
    return <p className="page err">الحساب غير مفعّل. كلّم المالك.</p>
  }
  return <Home />
}

export default function App() {
  return <AuthProvider><Gate /></AuthProvider>
}