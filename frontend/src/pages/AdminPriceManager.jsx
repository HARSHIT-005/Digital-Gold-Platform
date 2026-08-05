import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { FaCoins, FaClock, FaArrowUp, FaArrowDown, FaEdit } from 'react-icons/fa'
import { formatINR } from '../utils/currency.jsx'
import api from '../lib/axios'
import { useToast } from '../context/ToastContext'

const AdminPriceManager = () => {
  const [currentPrice, setCurrentPrice] = useState(0)
  const [priceChange, setPriceChange] = useState({ amount: 0, direction: 'No change' })
  const [lastUpdated, setLastUpdated] = useState(null)
  const [priceHistory, setPriceHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [manualPrice, setManualPrice] = useState('')
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [priceSetForToday, setPriceSetForToday] = useState(false)
  const [todayPrice, setTodayPrice] = useState(null)
  const { showSuccess, showError } = useToast();

  useEffect(() => {
    fetchPriceData()
  }, [])

  const fetchPriceData = async () => {
    try {
      const response = await api.get('/api/gold/price')
      setCurrentPrice(response.data.price || 0)
      setPriceChange({
        amount: response.data.changeAmount || 0,
        direction: response.data.direction || 'No change'
      })
      setLastUpdated(response.data.lastUpdated || null)
      setPriceSetForToday(response.data.priceSetForToday || false)
      setTodayPrice(response.data.todayPrice || null)
      
      // Fetch price history
      const historyResponse = await api.get('/api/gold/price-history')
      setPriceHistory(historyResponse.data.history || [])
    } catch (error) {
      console.error('Error fetching price data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSetPriceClick = () => {
    if (!manualPrice || isNaN(manualPrice) || parseFloat(manualPrice) <= 0) {
      showError('Please enter a valid price')
      return
    }
    setShowConfirmDialog(true)
  }

  const setPriceForToday = async () => {
    if (!manualPrice || isNaN(manualPrice) || parseFloat(manualPrice) <= 0) {
      showError('Please enter a valid price')
      return
    }
    
    setUpdating(true)
    setShowConfirmDialog(false)
    try {
      const response = await api.post('/api/gold/update-price', { price: parseFloat(manualPrice) })
      setCurrentPrice(response.data.price)
      setPriceChange({
        amount: response.data.changeAmount || 0,
        direction: response.data.direction || 'No change'
      })
      setLastUpdated(response.data.lastUpdated)
      setManualPrice('')
      // Mark price as set for today
      setPriceSetForToday(true)
      setTodayPrice(response.data.price)
      showSuccess('Price set successfully for today!')
      fetchPriceData() // Refresh all data
    } catch (error) {
      console.error('Error setting price:', error)
      const errorMessage = error.response?.data?.message || 'Failed to set price'
      showError(errorMessage)
      // If price already set today, update state and show the existing price
      if (error.response?.data?.existingPrice) {
        setPriceSetForToday(true)
        setTodayPrice(error.response.data.existingPrice)
        showError(`Price already set for today: Rs ${error.response.data.existingPrice.toLocaleString()}`)
      }
    } finally {
      setUpdating(false)
    }
  }

  const getPriceChange = () => {
    if (priceHistory.length < 2) return { change: 0, percentage: 0 }
    
    const current = priceHistory[0]?.price || currentPrice
    const previous = priceHistory[1]?.price || currentPrice
    const change = current - previous
    const percentage = previous > 0 ? (change / previous) * 100 : 0
    
    return { change, percentage }
  }

  const { change, percentage } = getPriceChange()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gold-primary text-xl">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-beige-light py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8"
        >
          <h1 className="font-playfair text-4xl font-bold text-bronze-primary mb-2">
            Price Manager
          </h1>
          <p className="text-gray-600">Manage gold prices manually and view price history</p>
        </motion.div>

        {/* Current Price Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="gold-card p-8 rounded-xl mb-8"
        >
          <div className="text-center">
            <div className="flex items-center justify-center mb-4">
              <FaCoins className="text-5xl text-gold-primary mr-4" />
              <div>
                <h2 className="font-playfair text-4xl font-bold text-bronze-primary">
                  {formatINR(currentPrice)}
                </h2>
                <p className="text-sm text-gray-600 mt-1">Per Gram (24K Gold)</p>
                <div className="flex items-center justify-center space-x-2 mt-2">
                  {priceChange.amount > 0 && (
                    <>
                      {priceChange.direction === 'Increase' ? (
                        <FaArrowUp className="text-green-600" />
                      ) : priceChange.direction === 'Decrease' ? (
                        <FaArrowDown className="text-red-600" />
                      ) : null}
                      <span className={`text-sm font-semibold ${
                        priceChange.direction === 'Increase' ? 'text-green-600' : 
                        priceChange.direction === 'Decrease' ? 'text-red-600' : 'text-gray-600'
                      }`}>
                        {formatINR(priceChange.amount)} ({priceChange.direction})
                      </span>
                    </>
                  )}
                  {priceChange.amount === 0 && change !== 0 && (
                    <>
                      {change > 0 ? (
                        <FaArrowUp className="text-green-600" />
                      ) : change < 0 ? (
                        <FaArrowDown className="text-red-600" />
                      ) : null}
                      <span className={`text-sm font-semibold ${change > 0 ? 'text-green-600' : change < 0 ? 'text-red-600' : 'text-gray-600'}`}>
                        {change > 0 ? '+' : ''}{change.toFixed(2)} ({percentage > 0 ? '+' : ''}{percentage.toFixed(2)}%)
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>
            
            <div className="flex items-center justify-center space-x-2 text-gray-600 mb-6">
              <FaClock />
              <span>Last updated: {lastUpdated ? new Date(lastUpdated).toLocaleString() : 'Never'}</span>
            </div>
          </div>
        </motion.div>

        {/* Set Price for Today */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="gold-card p-6 rounded-xl mb-8"
        >
          <h2 className="font-playfair text-2xl font-bold text-bronze-primary mb-4 flex items-center">
            <FaEdit className="mr-2" />
            Set Price for Today
          </h2>
          
          {priceSetForToday ? (
            <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
              <div className="flex items-center justify-center mb-3">
                <FaCoins className="text-3xl text-green-600 mr-3" />
                <div>
                  <p className="text-lg font-semibold text-green-800">Price Already Set for Today</p>
                  <p className="text-2xl font-bold text-green-700 mt-1">
                    {formatINR(todayPrice || currentPrice)}
                  </p>
                </div>
              </div>
              <p className="text-sm text-gray-600 mt-2">
                The gold price for today has already been set. You can only set the price once per day.
              </p>
              <p className="text-xs text-gray-500 mt-2">
                Last updated: {lastUpdated ? new Date(lastUpdated).toLocaleString() : 'N/A'}
              </p>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row gap-4 items-end">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Price per Gram (₹)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={manualPrice}
                  onChange={e => setManualPrice(e.target.value)}
                  placeholder="Enter price per gram..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-primary"
                />
                {currentPrice > 0 && (
                  <p className="text-xs text-gray-500 mt-1">
                    Current price: {formatINR(currentPrice)}
                  </p>
                )}
              </div>
              <button
                onClick={handleSetPriceClick}
                disabled={updating || !manualPrice}
                className="gold-button text-white px-6 py-2 rounded-lg flex items-center space-x-2 disabled:opacity-50"
              >
                <FaCoins />
                <span>{updating ? 'Setting...' : 'Set Price'}</span>
              </button>
            </div>
          )}
        </motion.div>

        {/* Confirmation Dialog */}
        {showConfirmDialog && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white rounded-xl shadow-lg p-6 w-full max-w-md"
            >
              <h3 className="font-playfair text-2xl font-bold text-bronze-primary mb-4">
                Confirm Price Setting
              </h3>
              <div className="mb-6">
                <p className="text-gray-700 mb-2">You are about to set the gold price for today:</p>
                <div className="bg-gold-primary bg-opacity-10 p-4 rounded-lg">
                  <p className="text-3xl font-bold text-gold-primary text-center">
                    Rs {parseFloat(manualPrice).toLocaleString()}
                  </p>
                  <p className="text-sm text-gray-600 text-center mt-1">per gram (24K Gold)</p>
                </div>
                <p className="text-sm text-red-600 mt-4 font-semibold">
                  ⚠️ Note: Price can only be set once per day. This action cannot be undone.
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowConfirmDialog(false)}
                  disabled={updating}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={setPriceForToday}
                  disabled={updating}
                  className="flex-1 gold-button text-white px-4 py-2 rounded-lg disabled:opacity-50"
                >
                  {updating ? 'Setting...' : 'Confirm & Set Price'}
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* Price History */}
        {priceHistory.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="gold-card p-6 rounded-xl"
          >
            <h2 className="font-playfair text-2xl font-bold text-bronze-primary mb-4">
              Price History
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-300">
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Date</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Price</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Change</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Source</th>
                  </tr>
                </thead>
                <tbody>
                  {priceHistory.slice(0, 10).map((entry, index) => (
                    <tr key={entry._id || index} className="border-b border-gray-200 hover:bg-gray-50">
                      <td className="py-3 px-4">
                        {new Date(entry.date || entry.timestamp).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4 font-semibold text-bronze-primary">
                        {formatINR(entry.price)}
                      </td>
                      <td className="py-3 px-4">
                        {entry.changeAmount > 0 && (
                          <span className={`flex items-center space-x-1 ${
                            entry.direction === 'Increase' ? 'text-green-600' : 
                            entry.direction === 'Decrease' ? 'text-red-600' : 'text-gray-600'
                          }`}>
                            {entry.direction === 'Increase' ? (
                              <FaArrowUp />
                            ) : entry.direction === 'Decrease' ? (
                              <FaArrowDown />
                            ) : null}
                            <span>{formatINR(entry.changeAmount)} ({entry.direction})</span>
                          </span>
                        )}
                        {entry.changeAmount === 0 && (
                          <span className="text-gray-500">No change</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-1 bg-gray-100 rounded text-sm">
                          {entry.source || 'Manual'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  )
}

export default AdminPriceManager
