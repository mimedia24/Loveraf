module.exports = {
  preset: '@react-native/jest-preset',
  testPathIgnorePatterns: ['/node_modules/', '/server/', '/admin/'],
  moduleNameMapper: {
    '^react-native-keychain$': '<rootDir>/__mocks__/react-native-keychain.ts',
    '^@react-native-async-storage/async-storage$': '<rootDir>/__mocks__/async-storage.ts',
    '^react-native-image-picker$': '<rootDir>/__mocks__/react-native-image-picker.ts',
  },
};
