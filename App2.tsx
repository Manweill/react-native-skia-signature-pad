import React from 'react';
import {SafeAreaView, StyleSheet} from 'react-native';
import SignaturePad from './SignaturePad';

const App = () => {
  return (
    <SafeAreaView style={styles.container}>
      <SignaturePad style={styles.signaturePad} />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  signaturePad: {
    flex: 1,
    backgroundColor: 'white',
  },
});

export default App;
