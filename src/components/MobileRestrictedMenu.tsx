import React from 'react';
import { motion } from 'motion/react';
import { UserPlus, ArrowDownToLine, ArrowUpFromLine, PackagePlus, ClipboardList } from 'lucide-react';

interface MobileRestrictedMenuProps {
  activeTab: string;
  setActiveTab: (tab: any) => void;
  setIsPersonModalOpen?: (isOpen: boolean) => void;
  setIsProductModalOpen?: (isOpen: boolean) => void;
}

export default function MobileRestrictedMenu({ 
  activeTab, 
  setActiveTab, 
  setIsPersonModalOpen, 
  setIsProductModalOpen 
}: MobileRestrictedMenuProps) {
  
  const tabs = [
    {
      id: 'add_person',
      label: 'افزودن شخص',
      icon: UserPlus,
      action: () => {
        if (setIsPersonModalOpen) setIsPersonModalOpen(true);
      }
    },
    {
      id: 'receive',
      label: 'رسید دریافت',
      icon: ArrowDownToLine,
      action: () => {
        setActiveTab('create_receive_receipt');
      }
    },
    {
      id: 'pay',
      label: 'رسید پرداخت',
      icon: ArrowUpFromLine,
      action: () => {
        setActiveTab('create_pay_receipt');
      }
    },
    {
      id: 'add_product',
      label: 'تعریف کالا',
      icon: PackagePlus,
      action: () => {
        if (setIsProductModalOpen) setIsProductModalOpen(true);
      }
    },
    {
      id: 'stocktaking',
      label: 'انبارگردانی',
      icon: ClipboardList,
      action: () => setActiveTab('stocktaking')
    }
  ];

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-[0_-4px_15px_rgba(0,0,0,0.05)] z-[100] pb-safe">
      <div className="flex justify-around items-center h-16 px-1">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id || 
                           (tab.id === 'receive' && activeTab === 'create_receive_receipt') ||
                           (tab.id === 'pay' && activeTab === 'create_pay_receipt') ||
                           (tab.id === 'stocktaking' && activeTab === 'stocktaking');
          
          return (
            <button
              key={`mobile-tab-${tab.id}`}
              onClick={tab.action}
              className={`flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors ${
                isActive ? 'text-indigo-600' : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              <div className="relative">
                <tab.icon className={`w-6 h-6 ${isActive ? 'stroke-[2.5px]' : 'stroke-2'}`} />
                {isActive && (
                  <motion.div
                    layoutId="mobile-nav-indicator"
                    className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-1 h-1 bg-indigo-600 rounded-full"
                  />
                )}
              </div>
              <span className={`text-[10px] ${isActive ? 'font-bold' : 'font-medium'}`}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
