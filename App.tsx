/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */

import {Canvas, Circle, Fill} from '@shopify/react-native-skia';
import React from 'react';
import {
  SafeAreaView,
  StatusBar,
  StyleSheet,
  useColorScheme,
  useWindowDimensions,
} from 'react-native';
import {Gesture, GestureDetector} from 'react-native-gesture-handler';
import {useSharedValue, withDecay} from 'react-native-reanimated';

import {Colors} from 'react-native/Libraries/NewAppScreen';

function App(): React.JSX.Element {
  const isDarkMode = useColorScheme() === 'dark';

  const backgroundStyle = {
    backgroundColor: isDarkMode ? Colors.darker : Colors.lighter,
  };

  const {width} = useWindowDimensions();
  const leftBoundary = 0;
  const rightBoundary = width;
  const translateX = useSharedValue(width / 2);

  const gesture = Gesture.Pan()
    .onChange(e => {
      translateX.value += e.changeX;
    })
    .onEnd(e => {
      translateX.value = withDecay({
        velocity: e.velocityX,
        clamp: [leftBoundary, rightBoundary],
      });
    });

  return (
    <SafeAreaView style={backgroundStyle}>
      <StatusBar
        barStyle={isDarkMode ? 'light-content' : 'dark-content'}
        backgroundColor={backgroundStyle.backgroundColor}
      />
      <GestureDetector gesture={gesture}>
        <Canvas style={{flex: 1}}>
          <Fill color="white" />
          <Circle cx={translateX} cy={40} r={20} color="#3E3E" />
        </Canvas>
      </GestureDetector>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  sectionContainer: {
    marginTop: 32,
    paddingHorizontal: 24,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '600',
  },
  sectionDescription: {
    marginTop: 8,
    fontSize: 18,
    fontWeight: '400',
  },
  highlight: {
    fontWeight: '700',
  },
});

export default App;
