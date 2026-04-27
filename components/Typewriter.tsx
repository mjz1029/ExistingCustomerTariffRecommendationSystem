import React, { useState, useEffect } from 'react';

interface TypewriterProps {
  fixedText: string;
  rotatingTexts: string[];
  typingSpeed?: number;
  deletingSpeed?: number;
  pauseDuration?: number;
}

const Typewriter: React.FC<TypewriterProps> = ({ 
  fixedText, 
  rotatingTexts, 
  typingSpeed = 150, 
  deletingSpeed = 100,
  pauseDuration = 2000 
}) => {
  const [displayText, setDisplayText] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const [speed, setSpeed] = useState(typingSpeed);

  useEffect(() => {
    let timer: number;

    const handleTyping = () => {
      const fullText = rotatingTexts[currentIndex];
      
      if (isDeleting) {
        setDisplayText(fullText.substring(0, displayText.length - 1));
        setSpeed(deletingSpeed);
      } else {
        setDisplayText(fullText.substring(0, displayText.length + 1));
        setSpeed(typingSpeed);
      }

      // Check if finished typing
      if (!isDeleting && displayText === fullText) {
        setTimeout(() => setIsDeleting(true), pauseDuration);
        return;
      }

      // Check if finished deleting
      if (isDeleting && displayText === '') {
        setIsDeleting(false);
        setCurrentIndex((prev) => (prev + 1) % rotatingTexts.length);
      }
    };

    timer = window.setTimeout(handleTyping, speed);

    return () => clearTimeout(timer);
  }, [displayText, isDeleting, currentIndex, rotatingTexts, typingSpeed, deletingSpeed, pauseDuration, speed]);

  return (
    <div className="font-mono text-4xl md:text-6xl font-bold text-slate-800 tracking-tight">
      <span>{fixedText}</span>
      <span className="text-brand-600 border-b-4 border-brand-400 pb-1 ml-2">{displayText}</span>
      <span className="cursor-blink text-brand-600">|</span>
    </div>
  );
};

export default Typewriter;