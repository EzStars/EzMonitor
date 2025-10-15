import { setConfig } from './core/config/config';
import { ConfigType } from './types';
import Behavior, { getBehaviour } from './plugins/behavior';
import Exception from './plugins/exception';
import Performance from './plugins/performance';
import Error from './plugins/error';
import exceptionInit from './plugins/exception';
import { unzipRecordscreen } from './common/utils';

function init(options?: Partial<ConfigType>) {
  setConfig(options || {});
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
  exceptionInit,
};
