import { useState, useEffect } from 'react'
import { supabase } from './lib/supabaseClient'
import './App.css'

const categories = [
  { name: 'All', icon: '✨' },
  { name: 'Electronics', icon: '💻' },
  { name: 'Fashion', icon: '👕' },
  { name: 'Accessories', icon: '🎧' },
  { name: 'Home & Living', icon: '🏠' },
]

function App() {
  const [products, setProducts] = useState([])
  const [loadingProducts, setLoadingProducts] = useState(true)

  const [cartItems, setCartItems] = useState(() => {
  const saved = localStorage.getItem('producthub-cart')
    return saved ? JSON.parse(saved) : []
  })

  const [page, setPage] = useState('home')
  // Admin authentication states
  const [session, setSession] = useState(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [authLoading, setAuthLoading] = useState(true)

  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [authMessage, setAuthMessage] = useState('')
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [searchTerm, setSearchTerm] = useState('')
  const [sortOrder, setSortOrder] = useState('default')
  const [message, setMessage] = useState('')

useEffect(() => {
  async function fetchProducts() {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('id', { ascending: true })

    if (error) {
      console.error('Error fetching products:', error.message)
    } else {
      setProducts(data)
      console.log('Products loaded from database:', data)
    }

    setLoadingProducts(false)
  }

  fetchProducts()
}, [])



  useEffect(() => {
    let mounted = true
    async function loadSession() {
      const { data, error } = await supabase.auth.getSession()
      if (!mounted) return
      if (error) console.error('Session error:', error.message)
      setSession(data.session)
    }
    loadSession()
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, newSession) => setSession(newSession)
    )
    return () => { mounted = false; subscription.unsubscribe() }
  }, [])

  useEffect(() => {
    let mounted = true
    async function checkAdmin() {
      setAuthLoading(true)
      if (!session?.user) {
        if (mounted) { setIsAdmin(false); setAuthLoading(false) }
        return
      }
      const { data, error } = await supabase
        .from('user_roles').select('role').eq('user_id', session.user.id).maybeSingle()
      if (mounted) {
        if (error) console.error('Admin role check failed:', error.message)
        setIsAdmin(!error && data?.role === 'admin')
        setAuthLoading(false)
      }
    }
    checkAdmin()
    return () => { mounted = false }
  }, [session])

  const handleLogin = async (event) => {
    event.preventDefault()
    setAuthMessage('')
    const { error } = await supabase.auth.signInWithPassword({
      email: loginEmail.trim(), password: loginPassword,
    })
    if (error) setAuthMessage(error.message)
    else { setLoginPassword(''); setAuthMessage('Login successful.'); setPage('admin') }
  }
  const handlePasswordReset = async () => {
  if (!loginEmail) {
    setAuthMessage('Please enter your email first.')
    return
  }

  const { error } = await supabase.auth.resetPasswordForEmail(
    loginEmail,
    {
      redirectTo: 'http://localhost:5173'
    }
  )

  if (error) {
    setAuthMessage(error.message)
  } else {
    setAuthMessage('Password reset link sent! Check your email.')
  }
}

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) setAuthMessage(error.message)
    else { setIsAdmin(false); setAuthMessage(''); setPage('home') }
  }

  const cartCount = cartItems.reduce(
    (total, item) => total + item.quantity, 0
  )

  const cartTotal = cartItems.reduce(
    (total, item) => total + item.price * item.quantity, 0
  )

  const formatPrice = (price) =>
    `₹${price.toLocaleString('en-IN')}`

  const addToCart = (product) => {
    setCartItems((previousItems) => {
      const existing = previousItems.find(
        (item) => item.id === product.id
      )

      if (existing) {
        return previousItems.map((item) =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      }

      return [...previousItems, { ...product, quantity: 1 }]
    })

    setMessage(`${product.name} added to cart`)
  }

  const updateQuantity = (id, amount) => {
    setCartItems((previousItems) =>
      previousItems
        .map((item) =>
          item.id === id
            ? { ...item, quantity: item.quantity + amount }
            : item
        )
        .filter((item) => item.quantity > 0)
    )
  }

  const removeFromCart = (id) => {
    setCartItems((previousItems) =>
      previousItems.filter((item) => item.id !== id)
    )
  }

  const openProduct = (product) => {
    setSelectedProduct(product)
    setPage('details')
  }

  const filteredProducts = products
    .filter((product) =>
      selectedCategory === 'All' ||
      product.category === selectedCategory
    )
    .filter((product) =>
      product.name.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      if (sortOrder === 'low') return a.price - b.price
      if (sortOrder === 'high') return b.price - a.price
      return 0
    })

  const addProduct = () => {
    const name = window.prompt('Enter product name:')
    if (!name?.trim()) return

    const price = Number(window.prompt('Enter product price:'))
    if (!Number.isFinite(price) || price <= 0) {
      window.alert('Please enter a valid price.')
      return
    }

    const category = window.prompt(
      'Enter category: Electronics, Fashion, Accessories, Home & Living'
    )

    if (!categories.some((item) => item.name === category)) {
      window.alert('Please enter a valid category.')
      return
    }

    const newProduct = {
      id: Date.now(),
      name: name.trim(),
      category,
      price,
      icon: '📦',
      description: 'Discover this product at ProductHub.',
      stock: 10,
    }

    setProducts((previous) => [...previous, newProduct])
    setMessage('Product added successfully')
  }

  const deleteProduct = (id) => {
    setProducts((previous) =>
      previous.filter((product) => product.id !== id)
    )
  }

  const ProductCard = ({ product }) => (
    <article className="product-card">
      <button
        className="product-image"
        onClick={() => openProduct(product)}
      >
        {product.icon}
      </button>

      <div className="product-info">
        <p className="product-category">{product.category}</p>
        <h3>{product.name}</h3>

        <div className="product-bottom">
          <strong>{formatPrice(product.price)}</strong>
          <button onClick={() => addToCart(product)}>
            Add to Cart
          </button>
        </div>

        <button
          className="details-btn"
          onClick={() => openProduct(product)}
        >
          View Details →
        </button>
      </div>
    </article>
  )
  return (
    <div className="app">

      <nav className="navbar">
        <button className="logo" onClick={() => setPage('home')}>
          Product<span>Hub</span>
        </button>

        <div className="nav-links">
          <button onClick={() => setPage('home')}>Home</button>
          <button onClick={() => setPage('products')}>Products</button>
          <button onClick={() => setPage('home')}>Categories</button>
          <button onClick={() => setPage('about')}>About</button>
        </div>

        <div className="nav-actions">
          {isAdmin ? (
            <>
              <button onClick={() => setPage('admin')}>Admin Dashboard</button>
              <button onClick={handleLogout}>Logout</button>
            </>
          ) : (
            <button onClick={() => setPage('login')}>Admin Login</button>
          )}
          <button className="cart-btn" onClick={() => setPage('cart')}>
            Cart ({cartCount})
          </button>
        </div>
      </nav>

      {message && (
        <div className="toast">
          {message}
          <button onClick={() => setMessage('')}>×</button>
        </div>
      )}

      {page === 'home' && (
        <main>
          <section className="hero">
            <p className="hero-tag">DISCOVER SOMETHING NEW</p>
            <h1>Everything you need.<br />All in one place.</h1>
            <p className="hero-description">
              Discover products that make everyday life better.
            </p>
            <button
              className="shop-btn"
              onClick={() => setPage('products')}
            >
              Explore Products →
            </button>
          </section>

          <section className="categories-section">
            <p className="section-tag">EXPLORE COLLECTIONS</p>
            <h2>Shop by Category</h2>

            <div className="category-grid">
              {categories.slice(1).map((category) => (
                <button
                  className="category-card"
                  key={category.name}
                  onClick={() => {
                    setSelectedCategory(category.name)
                    setPage('products')
                  }}
                >
                  <span className="category-icon">{category.icon}</span>
                  <h3>{category.name}</h3>
                  <p>Explore collection</p>
                </button>
              ))}
            </div>
          </section>

          <section className="products-section">
            <p className="section-tag">HANDPICKED FOR YOU</p>
            <h2>Featured Products</h2>

           {loadingProducts ? (
           <p>Loading products...</p>
           ) : (
          <div className="product-grid">
             {filteredProducts.map((product) => (
             <ProductCard key={product.id} product={product} />
                     ))}
           </div>
             )}

            <button
              className="shop-btn"
              onClick={() => setPage('products')}
            >
              View All Products →
            </button>
          </section>
        </main>
      )}

      {page === 'products' && (
        <main className="page-container">
          <p className="section-tag">OUR COLLECTION</p>
          <h1>All Products</h1>

          <div className="filter-bar">
            <input
              type="search"
              placeholder="Search products..."
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
            />

            <select
              value={selectedCategory}
              onChange={(event) => setSelectedCategory(event.target.value)}
            >
              {categories.map((category) => (
                <option key={category.name} value={category.name}>
                  {category.name}
                </option>
              ))}
            </select>

            <select
              value={sortOrder}
              onChange={(event) => setSortOrder(event.target.value)}
            >
              <option value="default">Sort by</option>
              <option value="low">Price: Low to High</option>
              <option value="high">Price: High to Low</option>
            </select>
          </div>

          <div className="product-grid">
            {filteredProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>

          {filteredProducts.length === 0 && (
            <p>No products found. Try another search.</p>
          )}
        </main>
      )}

      {page === 'details' && selectedProduct && (
        <main className="page-container">
          <button className="back-btn" onClick={() => setPage('products')}>
            ← Back to Products
          </button>

          <section className="details-content">
            <div className="details-image">{selectedProduct.icon}</div>

            <div className="details-info">
              <p className="section-tag">{selectedProduct.category}</p>
              <h1>{selectedProduct.name}</h1>
              <h2>{formatPrice(selectedProduct.price)}</h2>
              <p>{selectedProduct.description}</p>
              <p>Available stock: {selectedProduct.stock}</p>

              <button
                className="shop-btn"
                onClick={() => addToCart(selectedProduct)}
              >
                Add to Cart
              </button>
            </div>
          </section>
        </main>
      )}

      {page === 'cart' && (
        <main className="page-container">
          <h1>Your Shopping Cart</h1>

          {cartItems.length === 0 ? (
            <div className="empty-cart">
              <h2>Your cart is empty 🛒</h2>
              <button className="shop-btn" onClick={() => setPage('products')}>
                Start Shopping
              </button>
            </div>
          ) : (
            <div className="cart-layout">
              <div className="cart-list">
                {cartItems.map((item) => (
                  <div className="cart-item" key={item.id}>
                    <span className="cart-icon">{item.icon}</span>

                    <div className="cart-details">
                      <h3>{item.name}</h3>
                      <p>{formatPrice(item.price)}</p>

                      <div className="quantity-controls">
                        <button onClick={() => updateQuantity(item.id, -1)}>
                          −
                        </button>
                        <span>{item.quantity}</span>
                        <button onClick={() => updateQuantity(item.id, 1)}>
                          +
                        </button>
                      </div>

                      <button
                        className="remove-btn"
                        onClick={() => removeFromCart(item.id)}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <aside className="cart-summary">
                <h2>Order Summary</h2>
                <p>Items: {cartCount}</p>
                <h3>Total: {formatPrice(cartTotal)}</h3>
                <button
                  className="shop-btn"
                  onClick={() => setPage('checkout')}
                >
                  Proceed to Checkout
                </button>
              </aside>
            </div>
          )}
        </main>
      )}

      {page === 'checkout' && (
        <main className="page-container">
          <h1>Checkout</h1>
          <div className="checkout-box">
            <h2>Order Summary</h2>
            <p>Total items: {cartCount}</p>
            <h2>{formatPrice(cartTotal)}</h2>
            <p>Checkout is currently a demo. No payment will be processed.</p>
            <button
              className="shop-btn"
              onClick={() => window.alert('Payment integration will be added later.')}
            >
              Continue (Demo Only)
            </button>
          </div>
        </main>
      )}

      {page === 'login' && (
        <main className="page-container">
          <div className="account-box">
            <h1>Admin Login</h1>
            <p>Sign in with your ProductHub administrator account.</p>

            <form onSubmit={handleLogin}>
              <input type="email" placeholder="Admin email" value={loginEmail}
                onChange={(event) => setLoginEmail(event.target.value)} autoComplete="username" required />
              <input type="password" placeholder="Password" value={loginPassword}
                onChange={(event) => setLoginPassword(event.target.value)} autoComplete="current-password" required />
              <button className="shop-btn" type="submit">Login</button>
              Login
              <button
              type="button"
              onClick={handlePasswordReset}
              className="back-btn">
              Forgot Password?
              </button>
            </form>

            {authMessage && <p role="status">{authMessage}</p>}
            <button className="back-btn" onClick={() => setPage('home')}>Back to Store</button>
          </div>
        </main>
      )}

      {page === 'account' && (
        <main className="page-container">
          <h1>My Account</h1>
          <div className="account-box">
            <p>Welcome to ProductHub.</p>
            <p>Login and signup will be connected to a secure authentication system later.</p>
            <button className="shop-btn" onClick={() => setPage('home')}>
              Back to Home
            </button>
          </div>
        </main>
      )}

      {page === 'about' && (
        <main className="page-container">
          <h1>About ProductHub</h1>
          <p>
            ProductHub is your destination for discovering everyday products
            across electronics, fashion, accessories and home essentials.
          </p>
        </main>
      )}

      {page === 'admin' && (
        <main className="page-container">
          {authLoading ? (
            <p>Checking administrator access...</p>
          ) : !session ? (
            <div className="account-box">
              <h1>Admin Login Required</h1>
              <p>Please sign in to open the dashboard.</p>
              <button className="shop-btn" onClick={() => setPage('login')}>Go to Admin Login</button>
            </div>
          ) : !isAdmin ? (
            <div className="account-box">
              <h1>Access Denied</h1>
              <p>This account does not have administrator permission.</p>
              <button className="shop-btn" onClick={handleLogout}>Logout</button>
            </div>
          ) : (
            <>
          <p className="section-tag">MANAGEMENT</p>
          <h1>Admin Dashboard</h1>
          <p>Administrator access is restricted to approved accounts. Product changes will be connected to the database next.</p>

          <div className="admin-stats">
            <div><h2>{products.length}</h2><p>Total Products</p></div>
            <div><h2>{cartCount}</h2><p>Cart Items</p></div>
            <div><h2>{formatPrice(products.reduce((sum, p) => sum + p.price, 0))}</h2><p>Catalogue Value</p></div>
          </div>

          <button className="shop-btn" onClick={addProduct}>
            + Add Product
          </button>

          <div className="admin-list">
            {products.map((product) => (
              <div className="admin-row" key={product.id}>
                <span>{product.icon} {product.name}</span>
                <strong>{formatPrice(product.price)}</strong>
                <button
                  className="remove-btn"
                  onClick={() => deleteProduct(product.id)}
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
            </>
          )}
        </main>
      )}

      <footer className="footer">
        <h2>Product<span>Hub</span></h2>
        <p>Discover more. Live better.</p>
        <p>© 2026 ProductHub. All rights reserved.</p>
      </footer>

    </div>
  )
}

export default App
