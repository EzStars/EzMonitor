import { setConfig } from './common/config';
import { ConfigType } from './types';
import Behavior, { getBehaviour } from './plugins/behavior';
import Performance from './plugins/performance';

import { unzipRecordscreen } from './common/utils';

function init(options?: ConfigType) {
  setConfig(options);
  window.$SDK = {};
}

export default {
  init,
  Performance,
  Error,
  Behavior,
  unzipRecordscreen,
  getBehaviour,
};
