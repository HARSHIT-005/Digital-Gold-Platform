import { Link } from 'react-router-dom'
import { FaCoins, FaMapMarkerAlt, FaPhone, FaEnvelope } from 'react-icons/fa'

const Footer = () => {
  return (
    <footer className="bg-bronze-primary text-white mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Company Info */}
          <div>
            <div className="flex items-center space-x-2 mb-4">
              <FaCoins className="text-2xl text-gold-primary" />
              <span className="font-playfair text-xl font-bold">
                Digital Gold
              </span>
            </div>
            <p className="text-gray-300 text-sm mb-4">
              Your trusted platform for digital gold investments. Buy, sell, and manage your gold holdings with ease and security.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="font-playfair text-lg font-semibold mb-4">Quick Links</h3>
            <ul className="space-y-2">
              <li>
                <Link to="/" className="text-gray-300 hover:text-gold-primary transition-colors text-sm">
                  Home
                </Link>
              </li>
              <li>
                <Link to="/dashboard" className="text-gray-300 hover:text-gold-primary transition-colors text-sm">
                  Dashboard
                </Link>
              </li>
              <li>
                <Link to="/transactions" className="text-gray-300 hover:text-gold-primary transition-colors text-sm">
                  Transactions
                </Link>
              </li>
              <li>
                <Link to="/profile" className="text-gray-300 hover:text-gold-primary transition-colors text-sm">
                  Profile
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h3 className="font-playfair text-lg font-semibold mb-4">Contact Us</h3>
            <div className="space-y-3 text-sm">
              <div className="flex items-start space-x-3">
                <FaMapMarkerAlt className="text-gold-primary mt-1 flex-shrink-0" />
                <div className="text-gray-300">
                  <p>Shop No. 15, Krishna Nagar</p>
                  <p>Mathura, Uttar Pradesh 281001</p>
                  <p>India</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <FaPhone className="text-gold-primary flex-shrink-0" />
                <a href="tel:+919876543210" className="text-gray-300 hover:text-gold-primary transition-colors">
                  +91 98765 43210
                </a>
              </div>
              <div className="flex items-center space-x-3">
                <FaEnvelope className="text-gold-primary flex-shrink-0" />
                <a href="mailto:info@digitalgold.com" className="text-gray-300 hover:text-gold-primary transition-colors">
                  info@digitalgold.com
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Copyright */}
        <div className="border-t border-gold-primary border-opacity-30 mt-8 pt-8 text-center">
          <p className="text-gray-300 text-sm">
            © {new Date().getFullYear()} Digital Gold Platform. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  )
}

export default Footer

