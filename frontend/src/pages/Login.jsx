import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { FaCoins, FaEye, FaEyeSlash, FaFingerprint } from 'react-icons/fa'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { checkWebAuthnStatus, authenticateWebAuthn, isWebAuthnSupported } from '../utils/webauthn'

const Login = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  })
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [webauthnEnabled, setWebauthnEnabled] = useState(false)
  const [webauthnLoading, setWebauthnLoading] = useState(false)
  const [checkingWebAuthn, setCheckingWebAuthn] = useState(false)
  const { login } = useAuth()
  const { showSuccess, showError } = useToast()
  const navigate = useNavigate()

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
    setError('')
  }

  // Check WebAuthn status when email changes
  useEffect(() => {
    const checkStatus = async () => {
      if (formData.email && formData.email.includes('@')) {
        setCheckingWebAuthn(true)
        try {
          const status = await checkWebAuthnStatus(formData.email)
          setWebauthnEnabled(status.webauthnEnabled || false)
        } catch (error) {
          setWebauthnEnabled(false)
        } finally {
          setCheckingWebAuthn(false)
        }
      } else {
        setWebauthnEnabled(false)
      }
    }

    const timeoutId = setTimeout(checkStatus, 500) // Debounce
    return () => clearTimeout(timeoutId)
  }, [formData.email])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    const result = await login(formData.email, formData.password)
    
    if (result.success) {
      showSuccess('Login successful! Welcome back.')
      // Redirect based on user role
      if (result.user?.role === 'admin') {
        navigate('/admin')
      } else {
        navigate('/dashboard')
      }
    } else {
      // Check if WebAuthn is required
      if (result.error?.includes('WebAuthn') || result.requiresWebAuthn) {
        setError('WebAuthn authentication required. Please use fingerprint authentication.')
        setWebauthnEnabled(true)
      } else {
        setError(result.error)
        showError(result.error)
      }
    }
    
    setLoading(false)
  }

  const handleWebAuthnLogin = async () => {
    if (!formData.email) {
      setError('Please enter your email first')
      return
    }

    if (!isWebAuthnSupported()) {
      setError('WebAuthn is not supported in your browser. Please use password login.')
      showError('WebAuthn is not supported in your browser')
      return
    }

    setError('')
    setWebauthnLoading(true)

    try {
      const result = await authenticateWebAuthn(formData.email)
      
      if (result.success) {
        // Store token and user
        localStorage.setItem('token', result.token)
        showSuccess('WebAuthn authentication successful! Welcome back.')
        
        // Redirect based on user role
        if (result.user?.role === 'admin') {
          navigate('/admin')
        } else {
          navigate('/dashboard')
        }
        
        // Reload to update auth context
        window.location.reload()
      } else {
        if (result.requiresPassword) {
          setError('WebAuthn not registered. Please use password login.')
        } else {
          setError(result.error || 'WebAuthn authentication failed')
          showError(result.error || 'WebAuthn authentication failed')
        }
      }
    } catch (error) {
      setError('WebAuthn authentication failed. Please try again.')
      showError('WebAuthn authentication failed')
    } finally {
      setWebauthnLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-beige-light py-12 px-4 sm:px-6 lg:px-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-md w-full space-y-8"
      >
        <div className="text-center">
          <div className="flex justify-center">
            <FaCoins className="text-4xl text-gold-primary" />
          </div>
          <h2 className="mt-6 font-playfair text-3xl font-bold text-bronze-primary">
            Welcome Back
          </h2>
          <p className="mt-2 text-gray-600">
            Sign in to your Digital Gold account
          </p>
        </div>

        <div className="gold-card p-8 rounded-xl">
          <form className="space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                value={formData.email}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-primary focus:border-transparent"
                placeholder="Enter your email"
                autoComplete="username"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Password {webauthnEnabled && formData.email && <span className="text-xs text-gray-500">(Optional if using fingerprint)</span>}
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={formData.password}
                  onChange={handleChange}
                  className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-primary focus:border-transparent"
                  placeholder="Enter your password"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <FaEyeSlash /> : <FaEye />}
                </button>
              </div>
            </div>

            {/* WebAuthn Button - Show if enabled and email is entered */}
            {webauthnEnabled && formData.email && (
              <div>
                <button
                  type="button"
                  onClick={handleWebAuthnLogin}
                  disabled={webauthnLoading || loading}
                  className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white py-3 px-4 rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 hover:from-purple-700 hover:to-indigo-700 transition-all"
                >
                  <FaFingerprint />
                  <span>{webauthnLoading ? 'Authenticating...' : 'Login with Fingerprint'}</span>
                </button>
                <div className="text-center text-sm text-gray-500 mt-2">
                  or
                </div>
              </div>
            )}

            <div>
              <button
                type="submit"
                disabled={loading || webauthnLoading || (webauthnEnabled && !formData.password)}
                className="w-full gold-button text-white py-3 px-4 rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Signing In...' : 'Sign In with Password'}
              </button>
            </div>

            <div className="text-center">
              <p className="text-gray-600">
                Don't have an account?{' '}
                <Link to="/register" className="text-gold-primary hover:text-gold-dark font-semibold">
                  Sign up here
                </Link>
              </p>
            </div>
          </form>
        </div>
      </motion.div>
    </div>
  )
}

export default Login 