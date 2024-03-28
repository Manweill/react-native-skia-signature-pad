import {
  Canvas,
  Circle,
  PaintStyle,
  SkPaint,
  Skia,
  StrokeCap,
  StrokeJoin,
  TouchInfo,
  useTouchHandler,
} from '@shopify/react-native-skia';
import React, {useCallback, useRef, useState} from 'react';
import {Button, StyleSheet} from 'react-native';

let mVelocityFilterWeight = 0.4;
let mLastVelocity: number = 0;
let mLastWidth: number = 0;
const mMinWidth = 1;
const mMaxWidth = 5;

export default () => {
  const pathPoints = useRef<TimedPoint[][]>([[]]);
  const [strokePoints, setStrokePoints] = useState<
    Array<{
      point: TimedPoint;
      r: number;
      paint: SkPaint;
    }>
  >([]);

  const [currentPoints, setCurrentPoints] = useState<
    Array<{
      point: TimedPoint;
      r: number;
      paint: SkPaint;
    }>
  >([]);

  // function useSignaturePad() {}

  const onDrawingStart = useCallback((touchInfo: TouchInfo) => {
    const {x, y} = touchInfo;
    const [newPoints, bezierPoints] = addPoint(
      pathPoints.current[pathPoints.current.length - 1],
      new TimedPoint(x, y),
    );

    pathPoints.current[pathPoints.current.length - 1] =
      newPoints as TimedPoint[];

    if (bezierPoints) {
      setCurrentPoints(prev => [...prev, ...(bezierPoints as any)]);
    }
  }, []);

  const onDrawingEnd = useCallback(
    (touchInfo: TouchInfo) => {
      const {x, y} = touchInfo;

      if (pathPoints.current.length < 3) {
        pathPoints.current.push([]);
        return;
      }
      const [newPoints, bezierPoints] = addPoint(
        pathPoints.current[pathPoints.current.length - 1],
        new TimedPoint(x, y),
      );

      if (bezierPoints) {
        setStrokePoints(prev =>
          prev.concat(currentPoints, bezierPoints as any),
        );
      }

      pathPoints.current[pathPoints.current.length - 1] =
        newPoints as TimedPoint[];

      setCurrentPoints([]);
      pathPoints.current.push([]);
    },
    [currentPoints],
  );

  // move
  const onDrawingActive = useCallback((touchInfo: TouchInfo) => {
    const {x, y} = touchInfo;

    const [newPoints, bezierPoints] = addPoint(
      pathPoints.current[pathPoints.current.length - 1],
      new TimedPoint(x, y),
    );

    if (bezierPoints) {
      setCurrentPoints(prev => prev.concat(bezierPoints as any));
    }
    pathPoints.current[pathPoints.current.length - 1] =
      newPoints as TimedPoint[];
  }, []);

  const touchHandler = useTouchHandler(
    {
      onActive: onDrawingActive,
      onStart: onDrawingStart,
      onEnd: onDrawingEnd,
    },
    [onDrawingActive, onDrawingStart],
  );

  // console.log('bezierPoints', strokePoints.length);

  return (
    <>
      <Canvas style={style.container} onTouch={touchHandler}>
        {strokePoints.map(({point, r, paint}, index) => (
          <Circle cx={point.x} cy={point.y} r={r} paint={paint} key={index} />
        ))}
        {currentPoints.map(({point, r, paint}, index) => (
          <Circle cx={point.x} cy={point.y} r={r} paint={paint} key={index} />
        ))}
      </Canvas>
      <Button
        title="清除"
        onPress={() => {
          setStrokePoints([]);
        }}
      />
    </>
  );
};

const style = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
  },
});

function strokeWidth(velocity: number) {
  return Math.max(mMaxWidth / (velocity + 1), mMinWidth);
}

function addPoint(prevPoints: TimedPoint[], newPoint: TimedPoint) {
  prevPoints.push(newPoint);
  if (prevPoints.length > 2) {
    // To reduce the initial lag make it work with 3 mPoints
    // by copying the first point to the beginning.
    if (prevPoints.length === 3) {
      prevPoints.unshift(prevPoints[0]);
    }

    let tmp: ControlTimedPoints = calculateCurveControlPoints(
      prevPoints[0],
      prevPoints[1],
      prevPoints[2],
    );
    let c2: TimedPoint = tmp.c2;
    tmp = calculateCurveControlPoints(
      prevPoints[1],
      prevPoints[2],
      prevPoints[3],
    );
    let c3: TimedPoint = tmp.c1;
    let curve: Bezier = new Bezier(prevPoints[1], c2, c3, prevPoints[2]);

    let startPoint: TimedPoint = curve.startPoint;
    let endPoint: TimedPoint = curve.endPoint;

    let velocity: number = endPoint.velocityFrom(startPoint);
    velocity = Number.isNaN(velocity) ? 0 : velocity;

    velocity =
      mVelocityFilterWeight * velocity +
      (1 - mVelocityFilterWeight) * mLastVelocity;

    // The new width is a function of the velocity. Higher velocities
    // correspond to thinner strokes.
    let newWidth: number = strokeWidth(velocity);

    // The Bezier's width starts out as last curve's final width, and
    // gradually changes to the stroke width just calculated. The new
    // width calculation is based on the velocity between the Bezier's
    // start and end mPoints.
    const bezierPoints = addBezier(curve, mLastWidth, newWidth);

    mLastVelocity = velocity;
    mLastWidth = newWidth;

    // Remove the first element from the list,
    // so that we always have no more than 4 mPoints in mPoints array.
    prevPoints.shift();
    return [prevPoints, bezierPoints];
  }
  return [prevPoints, undefined];
}

function addBezier(curve: Bezier, startWidth: number, endWidth: number) {
  // ensureSignatureBitmap();
  let widthDelta = endWidth - startWidth;
  let drawSteps = Math.floor(curve.length());

  const drawPoints: Array<{
    point: TimedPoint;
    paint: SkPaint;
    r: number;
  }> = [];

  for (let i = 0; i < drawSteps; i++) {
    // Calculate the Bezier (x, y) coordinate for this step.
    let t = i / drawSteps;
    let tt = t * t;
    let ttt = tt * t;
    let u = 1 - t;
    let uu = u * u;
    let uuu = uu * u;

    let x = uuu * curve.startPoint.x;
    x += 3 * uu * t * curve.control1.x;
    x += 3 * u * tt * curve.control2.x;
    x += ttt * curve.endPoint.x;

    let y = uuu * curve.startPoint.y;
    y += 3 * uu * t * curve.control1.y;
    y += 3 * u * tt * curve.control2.y;
    y += ttt * curve.endPoint.y;

    // Set the incremental stroke width and draw.
    // mPaint.setStrokeWidth(startWidth + ttt * widthDelta);
    // {
    //   strokeWidth: startWidth + ttt * widthDelta,
    //   strokeJoin: 'round',
    //   strokeCap: 'round',
    //   antiAlias: true,
    //   style: 'stroke',
    //   color: '#000',
    // }

    const paint = Skia.Paint();
    paint.setColor(Skia.Color('#000'));
    paint.setStrokeWidth(startWidth + ttt * widthDelta);
    paint.setStrokeCap(StrokeCap.Round);
    paint.setStrokeJoin(StrokeJoin.Round);
    paint.setStyle(PaintStyle.Stroke);
    paint.setAntiAlias(true);

    drawPoints.push({
      point: new TimedPoint(x, y),
      r: paint.getStrokeWidth() / 2,
      paint: paint,
    });
  }
  return drawPoints;
}

// 计算曲线的所有点位
function calculateCurveControlPoints(
  s1: TimedPoint,
  s2: TimedPoint,
  s3: TimedPoint,
): ControlTimedPoints {
  let dx1: number = s1.x - s2.x;
  let dy1: number = s1.y - s2.y;
  let dx2: number = s2.x - s3.x;
  let dy2: number = s2.y - s3.y;

  let m1: TimedPoint = new TimedPoint((s1.x + s2.x) / 2.0, (s1.y + s2.y) / 2.0);
  let m2: TimedPoint = new TimedPoint((s2.x + s3.x) / 2.0, (s2.y + s3.y) / 2.0);

  let l1: number = Math.sqrt(dx1 * dx1 + dy1 * dy1);
  let l2: number = Math.sqrt(dx2 * dx2 + dy2 * dy2);

  let dxm: number = m1.x - m2.x;
  let dym: number = m1.y - m2.y;
  let k = l2 / (l1 + l2);

  let cm: TimedPoint = new TimedPoint(m2.x + dxm * k, m2.y + dym * k);

  let tx: number = s2.x - cm.x;
  let ty: number = s2.y - cm.y;

  return new ControlTimedPoints(
    new TimedPoint(m1.x + tx, m1.y + ty),
    new TimedPoint(m2.x + tx, m2.y + ty),
  );
}

interface Paint {
  strokeWidth: number;
  strokeJoin: string;
  strokeCap: string;
  antiAlias: boolean;
  style: string;
  color: string;
}

class Bezier {
  startPoint: TimedPoint;
  control1: TimedPoint;
  control2: TimedPoint;
  endPoint: TimedPoint;

  constructor(
    startPoint: TimedPoint,
    control1: TimedPoint,
    control2: TimedPoint,
    endPoint: TimedPoint,
  ) {
    this.startPoint = startPoint;
    this.control1 = control1;
    this.control2 = control2;
    this.endPoint = endPoint;
  }

  length(): number {
    let steps = 10,
      length = 0;
    let i: number;
    let t: number;
    let cx: number,
      cy: number,
      px = 0,
      py = 0,
      xdiff: number,
      ydiff: number;

    for (i = 0; i <= steps; i++) {
      t = i / steps;
      cx = this.point(
        t,
        this.startPoint.x,
        this.control1.x,
        this.control2.x,
        this.endPoint.x,
      );
      cy = this.point(
        t,
        this.startPoint.y,
        this.control1.y,
        this.control2.y,
        this.endPoint.y,
      );
      if (i > 0) {
        xdiff = cx - px;
        ydiff = cy - py;
        length += Math.sqrt(xdiff * xdiff + ydiff * ydiff);
      }
      px = cx;
      py = cy;
    }
    return length;
  }

  point(t: number, start: number, c1: number, c2: number, end: number): number {
    return (
      start * (1.0 - t) * (1.0 - t) * (1.0 - t) +
      3.0 * c1 * (1.0 - t) * (1.0 - t) * t +
      3.0 * c2 * (1.0 - t) * t * t +
      end * t * t * t
    );
  }
}
class ControlTimedPoints {
  c1: TimedPoint;
  c2: TimedPoint;
  /**
   *
   */
  constructor(c1: TimedPoint, c2: TimedPoint) {
    this.c1 = c1;
    this.c2 = c2;
  }
}
// 基础的点位
class TimedPoint {
  x: number;
  y: number;
  timestamp: number;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
    this.timestamp = Date.now();
  }

  velocityFrom(start: TimedPoint) {
    const velocity =
      this.distanceTo(start) / (this.timestamp - start.timestamp);
    return velocity;
  }

  distanceTo(point: TimedPoint) {
    return Math.sqrt(
      Math.pow(point.x - this.x, 2) + Math.pow(point.y - this.y, 2),
    );
  }
}
