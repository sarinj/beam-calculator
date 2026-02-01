'use client';

import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';

export function LanguageToggle() {
  const { language, toggleLanguage } = useLanguage();

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={toggleLanguage}
      className="font-medium min-w-[80px]"
    >
      {language === 'en' ? '🇹🇭 ไทย' : '🇬🇧 EN'}
    </Button>
  );
}
