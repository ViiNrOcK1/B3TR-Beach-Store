import React, { useEffect } from 'react';

function Header() {
  useEffect(() => {
    // Trigger fade-in animation on mount
    const elements = document.querySelectorAll('.fade-content');
    elements.forEach((el) => el.classList.add('fade-in'));
  }, []);

  return (
    <header className="py-40 wave-top">
      <div className="container mx-auto px-4 text-center">
        <div className="fade-content">
          <h1 className="text-6xl font-bold text-amber-400">
            <span className="text-custom-blue text-outline-amber">B3TR </span>
            <span className="text-amber-400 text-outline-blue">BEACH</span> - <span className="text-amber-400">Store</span>
          </h1>
        </div>
      </div>
    </header>
  );
}

export default Header;
