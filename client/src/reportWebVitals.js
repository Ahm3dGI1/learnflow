/**
 * Web Vitals Performance Monitoring
 * 
 * Measures and reports Core Web Vitals metrics for the LearnFlow application.
 * Uses the web-vitals library to track key performance indicators that affect
 * user experience.
 * 
 * Metrics tracked:
 * - CLS (Cumulative Layout Shift): Visual stability
 * - FID (First Input Delay): Interactivity responsiveness
 * - FCP (First Contentful Paint): Initial render speed
 * - LCP (Largest Contentful Paint): Loading performance
 * - TTFB (Time to First Byte): Server response time
 * 
 * @module reportWebVitals
 */

/**
 * Report Web Vitals Metrics
 * 
 * Dynamically imports the web-vitals library and measures all five Core Web
 * Vitals metrics. Only executes if a valid callback function is provided.
 * 
 * The web-vitals library is lazy-loaded to avoid increasing initial bundle
 * size for users who don't enable performance monitoring.
 * 
 * @param {Function} [onPerfEntry] - Callback function to receive metric data
 *   Each metric object contains: { name, value, id, delta, entries }
 * 
 * @example
 * // Log metrics to console
 * reportWebVitals(console.log);
 * 
 * @example
 * // Send metrics to analytics endpoint
 * reportWebVitals((metric) => {
 *   fetch('/api/analytics', {
 *     method: 'POST',
 *     body: JSON.stringify(metric)
 *   });
 * });
 */
const reportWebVitals = onPerfEntry => {
  if (onPerfEntry && onPerfEntry instanceof Function) {
    import('web-vitals').then(({ getCLS, getFID, getFCP, getLCP, getTTFB }) => {
      getCLS(onPerfEntry);
      getFID(onPerfEntry);
      getFCP(onPerfEntry);
      getLCP(onPerfEntry);
      getTTFB(onPerfEntry);
    });
  }
};

export default reportWebVitals;
