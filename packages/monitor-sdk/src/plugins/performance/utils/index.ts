import fetch from './fetch';
import { observerEntries } from './observerEntries';
import observerFCP from './observerFcp';
import observerLCP from './observerLcp';
import observerLoad from './observerLoad';

export default function performanceUtil() {
  fetch();
  observerEntries();
  observerFCP();
  observerLCP();
  observerLoad();
}
