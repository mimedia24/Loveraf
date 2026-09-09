import React from 'react';
import {
  Text as NativeText,
  TextInput as NativeTextInput,
} from 'react-native';

// Pass these props to native components explicitly. Function-component
// defaultProps are not applied by React 19.
export function Text(props: React.ComponentProps<typeof NativeText>) {
  return <NativeText {...props} allowFontScaling={false} maxFontSizeMultiplier={1} />;
}

export function TextInput(props: React.ComponentProps<typeof NativeTextInput>) {
  return (
    <NativeTextInput {...props} allowFontScaling={false} maxFontSizeMultiplier={1} />
  );
}
