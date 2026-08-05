import { Routes, Route } from 'react-router-dom'
import { motion } from 'framer-motion'
import Navbar from './components/Navbar'
import Footer from './components/Footer'
import Home from './pages/Home'
import Dashboard from './pages/Dashboard'
import Login from './pages/Login'
import Register from './pages/Register'
import Transactions from './pages/Transactions'
import Profile from './pages/Profile'
import Cart from './pages/Cart'
import AdminDashboard from './pages/AdminDashboard'
import AdminUsers from './pages/AdminUsers'
import AdminKYC from './pages/AdminKYC'
import AdminPriceManager from './pages/AdminPriceManager'
import AdminInventory from './pages/AdminInventory'
import WebAuthnRegister from './pages/WebAuthnRegister'
import { AuthProvider } from './context/AuthContext'
import { ToastProvider } from './context/ToastContext'
import ErrorBoundary from './components/ErrorBoundary'
import NotFound from './pages/NotFound'

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <ToastProvider>
          <div className="min-h-screen bg-beige-light flex flex-col">
            <Navbar />
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5 }}
              className="flex-grow"
            >
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/transactions" element={<Transactions />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/cart" element={<Cart />} />
                {/* Admin Routes */}
                <Route path="/admin" element={<AdminDashboard />} />
                <Route path="/admin/users" element={<AdminUsers />} />
                <Route path="/admin/kyc" element={<AdminKYC />} />
                <Route path="/admin/price" element={<AdminPriceManager />} />
                <Route path="/admin/inventory" element={<AdminInventory />} />
                <Route path="/admin/webauthn/register" element={<WebAuthnRegister />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </motion.div>
            <Footer />
          </div>
        </ToastProvider>
      </AuthProvider>
    </ErrorBoundary>
  )
}

export default App 