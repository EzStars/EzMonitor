const config = {
  url: 'http://127.0.0.1:8080/api',
  project: 'webEyesSDK',
  version: '0.0.1',
  appID: '1234567890',
  userID: '1234567890',
  isImageUpload: false,
  batchSize: 5,
};

export function setConfig(options) {
  for (const key in config) {
    if (options[key] !== undefined) {
      config[key] = options[key];
    }
  }
}

export default config;
