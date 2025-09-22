import React from 'react';

interface FooterProps {
  setShowManageForm: (show: boolean) => void;
  setShowTransactions: (show: boolean) => void;
}

function Footer({ setShowManageForm, setShowTransactions }: FooterProps) {
  const handleUpdateStore = () => {
    const pw = prompt('Enter password to update store:');
    if (pw === 'b3tr2025') {
      console.log('Update Store clicked', { password: pw });
      setShowManageForm(true);
    } else {
      alert('Incorrect password.');
    }
  };

  const handleViewTransactions = () => {
    const pw = prompt('Enter password to view transactions:');
    if (pw === 'b3tr2025') {
      console.log('View Transactions clicked', { password: pw });
      setShowTransactions(true);
    } else {
      alert('Incorrect password.');
    }
  };

  return (
    <footer className="bg-custom-blue py-6 text-white text-center">
      <p className="text-xl font-bold">© 2025 B3TR BEACH. All Rights Reserved.</p>
      <div className="flex justify-center mt-4 space-x-6">
        <a href="#home" className="footer-link">Home</a>
        <a href="#about" className="footer-link">About</a>
        <a href="#store" className="footer-link">Store</a>
        <a href="#contact" className="footer-link">Contact</a>
        <button onClick={handleUpdateStore} className="footer-link">Manage Store</button>
        <button onClick={handleViewTransactions} className="footer-link">View Transactions</button>
      </div>
    </footer>
  );
}

export default Footer;