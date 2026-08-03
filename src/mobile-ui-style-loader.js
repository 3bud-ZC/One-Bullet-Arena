const STYLESHEET_ID = 'mobile-ui-stabilization-styles';

if (typeof document !== 'undefined' && !document.getElementById(STYLESHEET_ID)) {
  const link = document.createElement('link');
  link.id = STYLESHEET_ID;
  link.rel = 'stylesheet';
  link.href = './mobile-ui-stabilization.css';
  document.head.append(link);
}
