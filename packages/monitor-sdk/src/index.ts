import { setConfig } from './common/config';
import { ConfigType } from './types';
import Behavior, { getBehaviour } from './plugins/behavior';
import Exception from './plugins/exception';
import Performance from './plugins/performance';
import Error from './plugins/error';
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
  Exception,
  unzipRecordscreen,
  getBehaviour,
};
