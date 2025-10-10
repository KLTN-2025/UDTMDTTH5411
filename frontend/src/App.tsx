import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { CartProvider } from './contexts/CartContext';
import Header from './components/Header/Header';
import HomePage from './pages/HomePage/HomePage';
import LoginPage from './pages/LoginPage/LoginPage';
import RegisterPage from './pages/RegisterPage/RegisterPage';
import RegisterAdminPage from './pages/RegisterAdminPage/RegisterAdminPage';
import RegisterShopPage from './pages/RegisterShopPage/RegisterShopPage';
import RegisterCustomerPage from './pages/RegisterCustomerPage/RegisterCustomerPage';
import AdminPanel from './pages/AdminPanel/AdminPanel';
import CategoryPage from './pages/CategoryPage/CategoryPage';
import ProductPage from './pages/ProductPage/ProductPage';
import CreateProductPage from './pages/CreateProductPage/CreateProductPage';
import ShopProductManagement from './pages/ShopProductManagement/ShopProductManagement';
import ShopOrdersPage from './pages/ShopOrdersPage/ShopOrdersPage';
import AdminOrdersPage from './pages/AdminOrdersPage/AdminOrdersPage';
import CustomerOrdersPage from './pages/CustomerOrdersPage/CustomerOrdersPage';
import ReviewsPage from './pages/ReviewsPage/ReviewsPage';
import SearchPage from './pages/SearchPage/SearchPage';
import ShopProfilePage from './pages/ShopProfilePage/ShopProfilePage';
import ShopProfile from './pages/ShopProfile/ShopProfile';
import CustomerProfile from './pages/CustomerProfile/CustomerProfile';
import CartPage from './pages/CartPage/CartPage';
import CheckoutPage from './pages/CheckoutPage/CheckoutPage';
import Footer from './components/Footer/Footer';
import './App.css';
import AdminCategories from './pages/AdminCategories/AdminCategories';

function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <Router>
          <div className="App">
            <Header />
            <main className="main-content">
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
                <Route path="/register-admin" element={<RegisterAdminPage />} />
                <Route path="/register-shop" element={<RegisterShopPage />} />
                <Route path="/register-customer" element={<RegisterCustomerPage />} />
                <Route path="/admin" element={<AdminPanel />} />
                <Route path="/admin/categories" element={<AdminCategories />} />
                <Route path="/admin-orders" element={<AdminOrdersPage />} />
                <Route path="/create-product" element={<CreateProductPage />} />
                <Route path="/shop-products" element={<ShopProductManagement />} />
                <Route path="/shop-orders" element={<ShopOrdersPage />} />
                <Route path="/customer-orders" element={<CustomerOrdersPage />} />
                <Route path="/reviews" element={<ReviewsPage />} />
                <Route path="/search" element={<SearchPage />} />
                <Route path="/shop/:shopId" element={<ShopProfilePage />} />
                <Route path="/my-profile" element={<ShopProfile />} />
                <Route path="/customer-profile" element={<CustomerProfile />} />
                <Route path="/category/:categoryId" element={<CategoryPage />} />
                <Route path="/product/:productId" element={<ProductPage />} />
                <Route path="/cart" element={<CartPage />} />
                <Route path="/checkout" element={<CheckoutPage />} />
              </Routes>
            </main>
            <Footer />
          </div>
        </Router>
      </CartProvider>
    </AuthProvider>
  );
}

export default App;

