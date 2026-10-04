import { useState } from 'react'
import { AuthProvider, useAuth } from './auth'
import Login from './Login'
import Dashboard from './Dashboard'
import NewInvoice from './NewInvoice'
import Products from './Products'
import SalesHistory from './SalesHistory'
import Expenses from './Expenses'
import ImportProducts from './ImportProducts'

type Tab = 'home' | 'invoice' | 'history' | 'products' | 'expenses' | 'import'

function Home() {
  const { profile, signOut } = useAuth()
  const [tab, setTab] = useState<Tab>('home')
  const isOwner = profile?.role === 'owner'

  const btn = (t: Tab, label: string) => (
    <button className={tab === t ? 'on' : ''} onClick={() => setTab(t)}>{label}</button>
  )

  return (
    <div className="page">
      <div className="top no-print">
        <h2>أهلاً {profile?.full_name} ({isOwner ? 'مالك' : 'كاشير'})</h2>
        <button onClick={signOut}>خروج</button>
      </div>
      <div className="nav no-print">
        {btn('home', '🏠 الرئيسية')}
        {btn('invoice', '🧾 فاتورة جديدة')}
        {btn('history', '📜 سجل المبيعات')}
        {btn('products', '📦 المنتجات')}
        {isOwner && btn('expenses', '💸 المصروفات')}
        {isOwner && btn('import', '📥 استيراد')}
      </div>
      {tab === 'home' && <Dashboard go={t => setTab(t as Tab)} />}
      {tab === 'invoice' && <NewInvoice />}
      {tab === 'history' && <SalesHistory />}
      {tab === 'products' && <Products />}
      {tab === 'expenses' && isOwner && <Expenses />}
      {tab === 'import' && isOwner && <ImportProducts />}
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