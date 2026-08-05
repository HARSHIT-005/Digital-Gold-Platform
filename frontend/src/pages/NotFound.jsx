import { Link } from 'react-router-dom'

const NotFound = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-beige-light px-4">
      <div className="gold-card p-8 rounded-xl text-center max-w-md w-full">
        <h1 className="text-3xl font-playfair font-bold text-bronze-primary mb-2">Page Not Found</h1>
        <p className="text-gray-600 mb-6">The page you are looking for does not exist.</p>
        <Link to="/" className="gold-button text-white px-6 py-3 rounded-lg inline-block">Go Home</Link>
      </div>
    </div>
  )
}

export default NotFound


