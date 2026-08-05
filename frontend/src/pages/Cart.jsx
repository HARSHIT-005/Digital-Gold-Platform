import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { FaShoppingCart, FaTrash, FaCheckCircle, FaClock, FaExclamationTriangle } from 'react-icons/fa'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { formatINR } from '../utils/currency.jsx'
import LoadingSpinner from '../components/LoadingSpinner'
import api from '../lib/axios'

const Cart = () => {
  const { user } = useAuth()
  const { showSuccess, showError } = useToast()
  const navigate = useNavigate()
  const [cart, setCart] = useState(null)
  const [loading, setLoading] = useState(true)
  const [checkoutLoading, setCheckoutLoading] = useState(false)
  const [cancelLoading, setCancelLoading] = useState(false)
  const [timeRemaining, setTimeRemaining] = useState(null)
  const [isExpired, setIsExpired] = useState(false)

  useEffect(() => {
    fetchCart()
  }, [])

  // Timer effect - updates every second
  useEffect(() => {
    if (!cart || !cart.expiresAt) {
      setTimeRemaining(null)
      setIsExpired(false)
      return
    }

    const updateTimer = () => {
      const now = new Date()
      const expiry = new Date(cart.expiresAt)
      const diff = expiry - now

      if (diff <= 0) {
        setTimeRemaining('Expired')
        setIsExpired(true)
        return
      }

      setIsExpired(false)
      const minutes = Math.floor(diff / 60000)
      const seconds = Math.floor((diff % 60000) / 1000)
      setTimeRemaining(`${minutes}m ${seconds}s`)
    }

    // Update immediately
    updateTimer()

    // Update every second
    const interval = setInterval(updateTimer, 1000)

    return () => clearInterval(interval)
  }, [cart])

  const fetchCart = async () => {
    try {
      setLoading(true)
      const response = await api.get('/api/cart/me')
      if (response.data.cart) {
        setCart(response.data.cart)
      } else {
        setCart(null)
      }
    } catch (error) {
      console.error('Error fetching cart:', error)
      if (error.response?.status !== 404) {
        showError(error.response?.data?.message || 'Failed to fetch cart')
      }
      setCart(null)
    } finally {
      setLoading(false)
    }
  }

  const handleCheckout = async () => {
    if (!cart) return

    setCheckoutLoading(true)
    try {
      const response = await api.post('/api/cart/checkout')
      showSuccess(response.data.message || 'Purchase completed successfully!')
      setCart(null)
      // Redirect to dashboard after a short delay
      setTimeout(() => {
        navigate('/dashboard')
      }, 1500)
    } catch (error) {
      showError(error.response?.data?.message || 'Checkout failed')
    } finally {
      setCheckoutLoading(false)
    }
  }

  const handleCancel = async () => {
    if (!cart) return

    setCancelLoading(true)
    try {
      await api.post('/api/cart/cancel')
      showSuccess('Cart cancelled successfully')
      setCart(null)
    } catch (error) {
      showError(error.response?.data?.message || 'Failed to cancel cart')
    } finally {
      setCancelLoading(false)
    }
  }


  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" color="gold-primary" />
      </div>
    )
  }

  if (!cart) {
    return (
      <div className="min-h-screen bg-beige-light py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="gold-card p-12 rounded-xl text-center"
          >
            <FaShoppingCart className="text-6xl text-gray-300 mx-auto mb-4" />
            <h2 className="font-playfair text-3xl font-bold text-bronze-primary mb-4">
              Your cart is empty
            </h2>
            <p className="text-gray-600 mb-6">
              Add items to your cart to proceed with purchase
            </p>
            <button
              onClick={() => navigate('/dashboard')}
              className="gold-button text-white px-6 py-3 rounded-lg font-semibold hover:scale-105 transition-transform"
            >
              Go to Dashboard
            </button>
          </motion.div>
        </div>
      </div>
    )
  }


  return (
    <div className="min-h-screen bg-beige-light py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <h1 className="font-playfair text-4xl font-bold text-bronze-primary mb-2">
            Shopping Cart
          </h1>
          <p className="text-gray-600">Review your order before checkout</p>
        </motion.div>

        {/* Cart Item */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="gold-card p-6 rounded-xl mb-6"
        >
          {/* Expiry Warning */}
          {isExpired ? (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4 flex items-center space-x-2">
              <FaExclamationTriangle className="text-red-500" />
              <span className="text-red-700 font-semibold">This cart has expired. Please add items again.</span>
            </div>
          ) : timeRemaining && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4 flex items-center space-x-2">
              <FaClock className="text-yellow-600" />
              <span className="text-yellow-700 font-semibold">
                Cart expires in: {timeRemaining}
              </span>
            </div>
          )}

          <div className="flex items-start justify-between mb-6">
            <div className="flex-1">
              <h2 className="font-playfair text-2xl font-bold text-bronze-primary mb-4">
                Gold Purchase
              </h2>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Quantity:</span>
                  <span className="font-semibold text-gray-800">{cart.grams} grams</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Price per gram:</span>
                  <span className="font-semibold text-gray-800">{formatINR(cart.pricePerGram)}</span>
                </div>
                <div className="border-t border-gray-200 pt-3 mt-3">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-semibold text-gray-800">Total Amount:</span>
                    <span className="text-2xl font-bold text-gold-primary">{formatINR(cart.totalAmount)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4">
            <button
              onClick={handleCheckout}
              disabled={checkoutLoading || cancelLoading || isExpired}
              className="flex-1 gold-button text-white py-3 px-6 rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 transition-transform flex items-center justify-center space-x-2"
            >
              {checkoutLoading ? (
                <>
                  <LoadingSpinner size="sm" color="white" />
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <FaCheckCircle />
                  <span>Proceed to Checkout</span>
                </>
              )}
            </button>
            <button
              onClick={handleCancel}
              disabled={checkoutLoading || cancelLoading}
              className="flex-1 bg-gray-200 text-gray-700 py-3 px-6 rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-300 transition-colors flex items-center justify-center space-x-2"
            >
              {cancelLoading ? (
                <>
                  <LoadingSpinner size="sm" color="gray" />
                  <span>Cancelling...</span>
                </>
              ) : (
                <>
                  <FaTrash />
                  <span>Cancel Cart</span>
                </>
              )}
            </button>
          </div>
        </motion.div>

        {/* Order Summary */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="gold-card p-6 rounded-xl"
        >
          <h3 className="font-playfair text-xl font-bold text-bronze-primary mb-4">
            Order Summary
          </h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Gold Quantity:</span>
              <span className="font-semibold">{cart.grams} grams</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Unit Price:</span>
              <span className="font-semibold">{formatINR(cart.pricePerGram)}/gram</span>
            </div>
            <div className="border-t border-gray-200 pt-2 mt-2">
              <div className="flex justify-between">
                <span className="font-semibold text-gray-800">Total:</span>
                <span className="font-bold text-gold-primary text-lg">{formatINR(cart.totalAmount)}</span>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}

export default Cart

