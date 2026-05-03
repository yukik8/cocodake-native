const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');
const os = require('os');

const PROFILE_UUID = '9c761d1a-c8b9-440c-adcb-67eab659305b';
const PROFILE_SRC = path.join(__dirname, 'share-extension-profile.dat');

module.exports = (config) => {
  return withDangerousMod(config, [
    'ios',
    async (config) => {
      if (!fs.existsSync(PROFILE_SRC)) {
        return config;
      }
      const profileDir = path.join(
        os.homedir(),
        'Library',
        'MobileDevice',
        'Provisioning Profiles'
      );
      fs.mkdirSync(profileDir, { recursive: true });
      fs.copyFileSync(PROFILE_SRC, path.join(profileDir, `${PROFILE_UUID}.mobileprovision`));
      return config;
    },
  ]);
};
