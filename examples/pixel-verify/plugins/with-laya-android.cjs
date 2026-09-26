const { withMainApplication, withProjectBuildGradle } = require('expo/config-plugins');

module.exports = function withLayaAndroid(config) {
  config = withMainApplication(config, (mod) => {
    const source = mod.modResults.contents;
    const registration = 'add(ai.onnxruntime.reactnative.OnnxruntimePackage())';
    if (!source.includes(registration)) {
      const anchor = 'PackageList(this).packages.apply {';
      if (mod.modResults.language !== 'kt' || !source.includes(anchor)) {
        throw new Error('Review Laya native registration for the generated MainApplication.');
      }
      // Expo's ORT plugin adds the Gradle project but does not register the React package.
      mod.modResults.contents = source.replace(anchor, `${anchor}\n          ${registration}`);
    }
    return mod;
  });
  return withProjectBuildGradle(config, (mod) => {
    const marker = '// Laya ONNX native build settings';
    if (!mod.modResults.contents.includes(marker)) {
      mod.modResults.contents += `\n${marker}
subprojects { subproject ->
    if (subproject.name == 'onnxruntime-react-native') {
        subproject.afterEvaluate {
            android.externalNativeBuild.cmake.buildStagingDirectory = new File(rootProject.projectDir, '.cxx-ort')
            android.defaultConfig.externalNativeBuild.cmake.arguments.addAll([
                '-DCMAKE_OBJECT_PATH_MAX=180', '-DANDROID_SUPPORT_FLEXIBLE_PAGE_SIZES=ON'
            ])
        }
    }
}
`;
    }
    return mod;
  });
};
