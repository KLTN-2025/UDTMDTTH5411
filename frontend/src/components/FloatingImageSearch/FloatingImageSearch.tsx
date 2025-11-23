import React from 'react';
import ImageSearch from '../ImageSearch/ImageSearch';
import './FloatingImageSearch.css';

const FloatingImageSearch: React.FC = () => {
  return (
    <div className="floating-image-search">
      <ImageSearch className="floating-image-search-button" />
    </div>
  );
};

export default FloatingImageSearch;
