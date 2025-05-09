import fetch from './utils/fetch';
import observerEntries from './utils/observerEntries';
import observerFCP from './utils/observerFcp';
import observerLCP from './utils/observerLcp';
import observerLoad from './utils/observerLoad';
/**
 * 性能监控
 */
export default function performanceUtil() {
  fetch();
  observerEntries();
  observerFCP();
  observerLCP();
  observerLoad();
}
