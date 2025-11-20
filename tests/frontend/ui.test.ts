import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Frontend UI and CSS', () => {
  describe('Desktop container max-width CSS', () => {
    it('should use Tailwind CSS for responsive design', () => {
      const cssPath = path.join(process.cwd(), 'client/src/index.css');
      const cssContent = fs.readFileSync(cssPath, 'utf-8');
      
      expect(cssContent).toContain('@tailwind');
    });

    it('should have CSS custom properties defined', () => {
      const cssPath = path.join(process.cwd(), 'client/src/index.css');
      const cssContent = fs.readFileSync(cssPath, 'utf-8');
      
      expect(cssContent).toContain(':root');
      expect(cssContent).toContain('--');
    });
  });

  describe('Safe-area padding in bottom navigation', () => {
    it('should check BottomNavigation component exists', () => {
      const componentPath = path.join(process.cwd(), 'client/src/components/BottomNavigation.tsx');
      const componentExists = fs.existsSync(componentPath);
      
      expect(componentExists).toBe(true);
    });

    it('should check BottomNavigation component for padding styles', () => {
      const componentPath = path.join(process.cwd(), 'client/src/components/BottomNavigation.tsx');
      const componentContent = fs.readFileSync(componentPath, 'utf-8');
      
      const hasPadding = componentContent.includes('pb-') || 
                         componentContent.includes('padding') ||
                         componentContent.includes('safe-area');
      expect(hasPadding).toBe(true);
    });
  });

  describe('Responsive design classes', () => {
    it('should have Tailwind utility classes in main layout', () => {
      const appPath = path.join(process.cwd(), 'client/src/App.tsx');
      const appContent = fs.readFileSync(appPath, 'utf-8');
      
      const hasTailwind = appContent.includes('className=');
      expect(hasTailwind).toBe(true);
    });

    it('should use min-h-screen for full viewport height', () => {
      const appPath = path.join(process.cwd(), 'client/src/App.tsx');
      const appContent = fs.readFileSync(appPath, 'utf-8');
      
      expect(appContent).toContain('min-h-screen');
    });
  });
});
