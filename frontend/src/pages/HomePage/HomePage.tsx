import React from 'react';
import HeroSection from '../../components/HeroSection/HeroSection';
import CategorySection from '../../components/CategorySection/CategorySection';
import FeaturedProducts from '../../components/FeaturedProducts/FeaturedProducts';
import NewsletterSection from '../../components/NewsletterSection/NewsletterSection';
import './HomePage.css';

const HomePage: React.FC = () => {
  return (
    <div className="home-page">
      <HeroSection />
      <CategorySection />
      <FeaturedProducts />
      <NewsletterSection />
    </div>
  );
};

export default HomePage;

