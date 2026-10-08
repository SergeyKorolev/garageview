interface Window {
  posthog?: {
    identify: (id: string, properties?: Record<string, any>) => void;
    capture: (event: string, properties?: Record<string, any>) => void;
    reset: () => void;
    [key: string]: any;
  };
}
