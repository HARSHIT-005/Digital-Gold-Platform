import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { FaCoins, FaBars, FaTimes, FaUser, FaSignOutAlt, FaShoppingCart } from 'react-icons/fa'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import api from '../lib/axios'

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false)
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const { showSuccess } = useToast()
  const [cart, setCart] = useState(null)

  useEffect(() => {
    if (user && user.role !== 'admin') {
      fetchCart()
      // Poll cart every 30 seconds
      const interval = setInterval(fetchCart, 30000)
      return () => clearInterval(interval)
    }
  }, [user])

  const fetchCart = async () => {
    try {
      const response = await api.get('/api/cart/me')
      if (response.data.cart) {
        setCart(response.data.cart)
      } else {
        setCart(null)
      }
    } catch (error) {
      if (error.response?.status !== 404) {
        console.error('Error fetching cart:', error)
      }
      setCart(null)
    }
  }

  const handleLogout = () => {
    logout()
    showSuccess('Logged out successfully.')
    navigate('/')
    setIsOpen(false)
  }

  return (
    <nav className="bg-white shadow-lg border-b-2 border-gold-primary">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link to="/" className="flex items-center space-x-2">
              <FaCoins className="text-2xl text-gold-primary" />
              <span className="font-playfair text-xl font-bold text-bronze-primary">
                Digital Gold
              </span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            <Link to="/" className="text-gray-700 hover:text-gold-primary transition-colors">
              Home
            </Link>
            {user ? (
              <>
                {user.role === 'admin' ? (
                  // Admin Navigation
                  <>
                    <Link to="/admin" className="text-gray-700 hover:text-gold-primary transition-colors">
                      Admin Dashboard
                    </Link>
                    <div className="flex items-center space-x-4">
                      <span className="text-gray-700">Admin: {user.name}</span>
                      <button
                        onClick={handleLogout}
                        className="gold-button text-white px-4 py-2 rounded-lg flex items-center space-x-2"
                      >
                        <FaSignOutAlt />
                        <span>Logout</span>
                      </button>
                    </div>
                  </>
                ) : (
                  // Regular User Navigation
                  <>
                    <Link to="/dashboard" className="text-gray-700 hover:text-gold-primary transition-colors">
                      Dashboard
                    </Link>
                    <Link to="/transactions" className="text-gray-700 hover:text-gold-primary transition-colors">
                      Transactions
                    </Link>
                    <Link to="/profile" className="text-gray-700 hover:text-gold-primary transition-colors">
                      Profile
                    </Link>
                    <Link 
                      to="/cart" 
                      className="relative text-gray-700 hover:text-gold-primary transition-colors flex items-center"
                    >
                      <FaShoppingCart className="text-xl" />
                      {cart && (
                        <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                          1
                        </span>
                      )}
                    </Link>
                    <div className="flex items-center space-x-4">
                      <span className="text-gray-700">Welcome, {user.name}</span>
                      <button
                        onClick={handleLogout}
                        className="gold-button text-white px-4 py-2 rounded-lg flex items-center space-x-2"
                      >
                        <FaSignOutAlt />
                        <span>Logout</span>
                      </button>
                    </div>
                  </>
                )}
              </>
            ) : (
              <>
                <Link to="/login" className="text-gray-700 hover:text-gold-primary transition-colors">
                  Login
                </Link>
                <Link to="/register" className="gold-button text-white px-4 py-2 rounded-lg">
                  Register
                </Link>
              </>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="text-gray-700 hover:text-gold-primary"
              aria-label={isOpen ? 'Close menu' : 'Open menu'}
            >
              {isOpen ? <FaTimes size={24} /> : <FaBars size={24} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="md:hidden bg-white border-t border-gray-200"
        >
          <div className="px-2 pt-2 pb-3 space-y-1">
            <Link
              to="/"
              className="block px-3 py-2 text-gray-700 hover:text-gold-primary"
              onClick={() => setIsOpen(false)}
            >
              Home
            </Link>
            {user ? (
              <>
                {user.role === 'admin' ? (
                  // Admin Mobile Navigation
                  <>
                    <Link
                      to="/admin"
                      className="block px-3 py-2 text-gray-700 hover:text-gold-primary"
                      onClick={() => setIsOpen(false)}
                    >
                      Admin Dashboard
                    </Link>
                    <div className="px-3 py-2 border-t border-gray-200 mt-2">
                      <span className="text-gray-700">Admin: {user.name}</span>
                    </div>
                    <button
                      onClick={handleLogout}
                      className="w-full text-left px-3 py-2 gold-button text-white rounded-lg flex items-center space-x-2"
                    >
                      <FaSignOutAlt />
                      <span>Logout</span>
                    </button>
                  </>
                ) : (
                  // Regular User Mobile Navigation
                  <>
                    <Link
                      to="/dashboard"
                      className="block px-3 py-2 text-gray-700 hover:text-gold-primary"
                      onClick={() => setIsOpen(false)}
                    >
                      Dashboard
                    </Link>
                    <Link
                      to="/transactions"
                      className="block px-3 py-2 text-gray-700 hover:text-gold-primary"
                      onClick={() => setIsOpen(false)}
                    >
                      Transactions
                    </Link>
                    <Link
                      to="/profile"
                      className="block px-3 py-2 text-gray-700 hover:text-gold-primary"
                      onClick={() => setIsOpen(false)}
                    >
                      Profile
                    </Link>
                    <Link
                      to="/cart"
                      className="block px-3 py-2 text-gray-700 hover:text-gold-primary relative"
                      onClick={() => setIsOpen(false)}
                    >
                      <span className="flex items-center space-x-2">
                        <FaShoppingCart />
                        <span>Cart</span>
                        {cart && (
                          <span className="bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                            1
                          </span>
                        )}
                      </span>
                    </Link>
                    <div className="px-3 py-2">
                      <span className="text-gray-700">Welcome, {user.name}</span>
                    </div>
                    <button
                      onClick={handleLogout}
                      className="w-full text-left px-3 py-2 gold-button text-white rounded-lg flex items-center space-x-2"
                    >
                      <FaSignOutAlt />
                      <span>Logout</span>
                    </button>
                  </>
                )}
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="block px-3 py-2 text-gray-700 hover:text-gold-primary"
                  onClick={() => setIsOpen(false)}
                >
                  Login
                </Link>
                <Link
                  to="/register"
                  className="block px-3 py-2 gold-button text-white rounded-lg"
                  onClick={() => setIsOpen(false)}
                >
                  Register
                </Link>
              </>
            )}
          </div>
        </motion.div>
      )}
    </nav>
  )
}

export default Navbar 