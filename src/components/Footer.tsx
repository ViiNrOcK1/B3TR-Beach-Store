import React, { useEffect } from 'react';

function Footer({ setShowManageForm }: { setShowManageForm: (show: boolean) => void }) {
  useEffect(() => {
    // Trigger fade-in animation on mount
    const elements = document.querySelectorAll('.fade-content');
    elements.forEach((el) => el.classList.add('fade-in'));
  }, []);

  return (
    <footer className="bg-custom-blue py-6 wave-top">
      <div className="container mx-auto px-4 text-center">
        <div className="fade-content">
          <p className="text-xl text-amber-400 text-outline-blue mb-4">
            © 2025 <span className="text-black">B3TR</span> BEACH. All rights reserved.
          </p>
          <div className="flex justify-center space-x-6">
            <a href="#" className="text-white hover:text-amber-400 text-xl">Privacy Policy</a>
            <a href="#" className="text-white hover:text-amber-400 text-xl">Terms of Service</a>
            <a
              href="#"
              className="text-white hover:text-amber-400 text-xl"
              onClick={() => {
                console.log('Update Store clicked');
                const password = prompt('Enter password to manage store:');
                if (password === 'b3tr2025') {
                  console.log('Password correct, showing manage form');
                  setShowManageForm(true);
                } else {
                  console.log('Incorrect password');
                  alert('Incorrect password');
                }
              }}
            >
              Update Store
            </a>
            <a href="mailto:support@b3trbeach.com" className="text-white hover:text-amber-400 text-xl">Contact Us</a>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
