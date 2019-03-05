'use strict';

const path = require('path');
const fs = require('fs');

// Make sure any symlinks in the project folder are resolved:
// https://github.com/facebook/create-react-app/issues/637
const appDirectory = fs.realpathSync(process.cwd());
const resolveApp = relativePath => path.resolve(appDirectory, relativePath);

const moduleFileExtensions = [
    'js',
    'ts',
    'tsx',
    'json',
];

// Resolve file paths in the same order as webpack
const resolveModule = (resolveFn, filePath) => {
    const extension = moduleFileExtensions.find(extension =>
        fs.existsSync(resolveFn(`${ filePath }.${ extension }`))
    );

    if (extension) {
        return resolveFn(`${ filePath }.${ extension }`);
    }

    return resolveFn(`${ filePath }.js`);
};

// config after eject: we're in ./config/
module.exports = {
    dotenv: resolveApp('.env'),
    appPath: resolveApp('.'),
    appIndexJs: resolveModule(resolveApp, 'server/src/index'),
    appPackageJson: resolveApp('package.json'),
    appSrc: resolveApp('server/src'),
    appTsConfig: resolveApp('tsconfig.json'),
    yarnLockFile: resolveApp('yarn.lock'),
    appNodeModules: resolveApp('node_modules'),
};

module.exports.moduleFileExtensions = moduleFileExtensions;
