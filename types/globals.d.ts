interface Window {
  dataLayer: Record<string, any>[];
  gtag: (...args: any[]) => void;
}