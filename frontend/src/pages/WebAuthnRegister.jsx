import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { FaFingerprint, FaCheckCircle, FaTimesCircle } from 'react-icons/fa'
import { useToast } from '../context/ToastContext'
import { registerWebAuthn, isWebAuthnSupported } from '../utils/webauthn'
import LoadingSpinner from '../components/LoadingSpinner'

const WebAuthnRegister = () => {
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  const { showSuccess, showError } = useToast()
  const navigate = useNavigate()

  const handleRegister = async () => {
    if (!isWebAuthnSupported()) {
      const msg = 'WebAuthn is not supported in your browser. Please use a modern browser with biometric support.'
      setError(msg)
      showError(msg)
      return
    }

    setError('')
    setLoading(true)

    try {
      const result = await registerWebAuthn()
      
      if (result.success) {
        setSuccess(true)
        showSuccess('WebAuthn credential registered successfully! You can now use fingerprint authentication.')
        
        // Redirect after 2 seconds
        setTimeout(() => {
          navigate('/admin')
        }, 2000)
      } else {
        setError(result.error || 'Registration failed')
        showError(result.error || 'Registration failed')
      }
    } catch (error) {
      const msg = error.message || 'WebAuthn registration failed'
      setError(msg)
      showError(msg)
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-beige-light py-12 px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full gold-card p-8 rounded-xl text-center"
        >
          <FaCheckCircle className="text-6xl text-green-500 mx-auto mb-4" />
          <h2 className="font-playfair text-2xl font-bold text-bronze-primary mb-2">
            Registration Successful!
          </h2>
          <p className="text-gray-600 mb-4">
            Your fingerprint authentication has been registered. You can now use it to log in.
          </p>
          <p className="text-sm text-gray-500">
            Redirecting to admin dashboard...
          </p>
        </motion.div>
      </div>
    )
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
          <div className="flex justify-center mb-4">
            <FaFingerprint className="text-5xl text-purple-600" />
          </div>
          <h2 className="font-playfair text-3xl font-bold text-bronze-primary">
            Register Fingerprint Authentication
          </h2>
          <p className="mt-2 text-gray-600">
            Set up WebAuthn for secure admin login
          </p>
        </div>

        <div className="gold-card p-8 rounded-xl">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6 flex items-center space-x-2">
              <FaTimesCircle />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-semibold text-blue-900 mb-2">Instructions:</h3>
              <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
                <li>Click the button below to start registration</li>
                <li>Your browser will prompt you to use your fingerprint or device authentication</li>
                <li>Follow the on-screen instructions to complete registration</li>
                <li>Once registered, you can use fingerprint to log in</li>
              </ul>
            </div>

            {!isWebAuthnSupported() && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-sm text-yellow-800">
                  <strong>Note:</strong> WebAuthn requires a browser with biometric support (Chrome, Edge, Safari, Firefox).
                </p>
              </div>
            )}

            <button
              onClick={handleRegister}
              disabled={loading || !isWebAuthnSupported()}
              className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white py-3 px-4 rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 hover:from-purple-700 hover:to-indigo-700 transition-all"
            >
              {loading ? (
                <>
                  <LoadingSpinner size="sm" color="white" />
                  <span>Registering...</span>
                </>
              ) : (
                <>
                  <FaFingerprint />
                  <span>Register Fingerprint</span>
                </>
              )}
            </button>

            <button
              onClick={() => navigate('/admin')}
              className="w-full bg-gray-300 text-gray-700 py-3 px-4 rounded-lg font-semibold hover:bg-gray-400 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  )
}

export default WebAuthnRegister

