import fetch from './utils/fetch';
import xhr from './utils/xhr';
import observerEntries from './utils/observerEntries';
import observerFCP from './utils/observerFcp';
import observerLCP from './utils/observerLcp';
import observerLoad from './utils/observerLoad';
import observerFp from './utils/observerFp';
/**
 * 性能监控
 */
export default function performanceUtil() {
  fetch();
  xhr();
  observerEntries();
  observerFp();
  observerFCP();
  observerLCP();
  observerLoad();
}
