import React from 'react';

interface FooterProps {
  isDarkMode?: boolean;
}

export default function Footer({ isDarkMode }: FooterProps) {
  return (
    <footer className={`p-4 text-sm flex justify-between items-center shrink-0 border-t transition-colors duration-300
      ${isDarkMode ? 'bg-[#343a40] border-[#4b545c] text-gray-400' : 'bg-white border-[#dee2e6] text-[#869099]'}`}>
      <div>
        <strong>Copyright &copy; 2024 <a href="#" className="text-[#007bff] hover:underline">Taraz System</a>.</strong>
        {' '}کلیه حقوق محفوظ است.
      </div>
      <div className="hidden sm:block">
        <b>نسخه</b> 1.0.0
      </div>
    </footer>
  );
}
