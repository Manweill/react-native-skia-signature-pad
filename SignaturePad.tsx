import React, {useState} from 'react';
import {PanResponder, View} from 'react-native';
import Svg, {Path} from 'react-native-svg';

const SignaturePad = props => {
  const [paths, setPaths] = useState([]);
  const [currentPath, setCurrentPath] = useState('');
  const [lastPoint, setLastPoint] = useState(null);

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: (e, gestureState) => {
      setCurrentPath(`M${gestureState.x0},${gestureState.y0}`);
      setLastPoint({x: gestureState.x0, y: gestureState.y0});
    },
    onPanResponderMove: (e, gestureState) => {
      if (lastPoint) {
        const midX = (lastPoint.x + gestureState.moveX) / 2;
        const midY = (lastPoint.y + gestureState.moveY) / 2;
        setCurrentPath(
          prevPath =>
            `${prevPath} Q${lastPoint.x},${lastPoint.y} ${midX},${midY}`,
        );
        setLastPoint({x: gestureState.moveX, y: gestureState.moveY});
      }
    },
    onPanResponderRelease: () => {
      setPaths(prevPaths => [...prevPaths, currentPath]);
      setCurrentPath('');
      setLastPoint(null);
    },
  });

  return (
    <View style={[{flex: 1}, props.style]} {...panResponder.panHandlers}>
      <Svg style={{flex: 1}}>
        {paths.map((path, index) => (
          <Path
            key={index}
            d={path}
            stroke={props.strokeColor || 'black'}
            strokeWidth={props.strokeWidth || 3}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        ))}
        <Path
          d={currentPath}
          stroke={props.strokeColor || 'black'}
          strokeWidth={props.strokeWidth || 3}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </Svg>
    </View>
  );
};

export default SignaturePad;
