const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const FIX_MARKER = '# [withIOSResourceBundleFix]';

const FIX_CODE = `
  ${FIX_MARKER}
  installer.pods_project.targets.each do |target|
    next unless target.respond_to?(:product_type)
    next unless target.product_type == 'com.apple.product-type.bundle'
    target.build_configurations.each do |cfg|
      cfg.build_settings['CODE_SIGNING_ALLOWED'] = 'NO'
      cfg.build_settings['CODE_SIGN_IDENTITY'] = ''
      cfg.build_settings['CODE_SIGN_IDENTITY[sdk=iphoneos*]'] = ''
      cfg.build_settings['DEVELOPMENT_TEAM'] = ''
    end
  end
`;

/** Finds the index of the matching closing ')' for the '(' at startIdx. */
function findMatchingParen(str, startIdx) {
  let depth = 0;
  for (let i = startIdx; i < str.length; i++) {
    if (str[i] === '(') depth++;
    else if (str[i] === ')') {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
}

module.exports = function withIOSResourceBundleFix(config) {
  return withDangerousMod(config, ['ios', (config) => {
    const podfilePath = path.join(config.modRequest.platformProjectRoot, 'Podfile');
    let contents = fs.readFileSync(podfilePath, 'utf8');

    if (contents.includes(FIX_MARKER)) {
      return config;
    }

    // Strategy 1: insert right after react_native_post_install(...) — count parens to
    // find the true closing ')' even when arguments contain nested parentheses.
    const rnFuncIdx = contents.indexOf('react_native_post_install(');
    if (rnFuncIdx !== -1) {
      const openParen = contents.indexOf('(', rnFuncIdx);
      const closeParen = findMatchingParen(contents, openParen);
      if (closeParen !== -1) {
        contents =
          contents.slice(0, closeParen + 1) +
          FIX_CODE +
          contents.slice(closeParen + 1);
        fs.writeFileSync(podfilePath, contents);
        return config;
      }
    }

    // Strategy 2: fallback – insert at the top of the existing post_install block.
    if (contents.includes('post_install do |installer|')) {
      contents = contents.replace(
        'post_install do |installer|',
        `post_install do |installer|\n${FIX_CODE}`
      );
      fs.writeFileSync(podfilePath, contents);
      return config;
    }

    console.warn('[withIOSResourceBundleFix] Could not find post_install block – skipping');
    return config;
  }]);
};
