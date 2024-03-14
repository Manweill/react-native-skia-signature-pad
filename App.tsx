import {
  Canvas,
  Path,
  SkCanvas,
  SkPath,
  Skia,
  TouchInfo,
  useTouchHandler,
} from '@shopify/react-native-skia';
import React, {useCallback, useRef, useState} from 'react';
import {StyleSheet} from 'react-native';

export default () => {
  const [paths, setPaths] = useState<SkPath[]>([]);

  const onDrawingStart = useCallback((touchInfo: TouchInfo) => {
    setPaths(old => {
      const {x, y} = touchInfo;
      const newPath = Skia.Path.Make();
      newPath.moveTo(x, y);
      return [...old, newPath];
    });
  }, []);

  const onDrawingActive = useCallback((touchInfo: TouchInfo) => {
    setPaths(currentPaths => {
      const {x, y} = touchInfo;
      const currentPath = currentPaths[currentPaths.length - 1];
      const lastPoint = currentPath.getLastPt();
      const xMid = (lastPoint.x + x) / 2;
      const yMid = (lastPoint.y + y) / 2;

      currentPath.quadTo(lastPoint.x, lastPoint.y, xMid, yMid);
      return [...currentPaths.slice(0, currentPaths.length - 1), currentPath];
    });
  }, []);

  const touchHandler = useTouchHandler(
    {
      onActive: onDrawingActive,
      onStart: onDrawingStart,
    },
    [onDrawingActive, onDrawingStart],
  );

  console.log('path', paths.length);

  const ctx = useRef<SkCanvas>();

  return (
    <Canvas style={style.container} onTouch={touchHandler} ref={ctx}>
      {paths.map((path, index) => (
        <Path
          key={index}
          path={path}
          color={'black'}
          style={'stroke'}
          strokeWidth={3.5}
        />
      ))}
    </Canvas>
  );
};

const style = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
  },
});
