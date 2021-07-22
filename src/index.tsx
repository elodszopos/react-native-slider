/* eslint-disable react-native/no-unused-styles */
import React, { useEffect, useRef, useState } from 'react';

import {
  Animated,
  Image,
  StyleSheet,
  PanResponder,
  View,
  Easing,
  StyleProp,
  ViewStyle,
  ImageSourcePropType,
  LayoutChangeEvent,
  PanResponderGestureState,
  GestureResponderEvent,
} from 'react-native';
import useAnimatedLatestValueRef from '@/hooks/useAnimatedLatestValueRef';
import noop from 'utils/noop';

const TRACK_SIZE = 4;
const THUMB_SIZE = 25;

type RectProps = {
  x: number;
  y: number;
  width: number;
  height: number;
};

class Rect {
  private readonly _x: number;

  private readonly _y: number;

  private readonly _width: number;

  private readonly _height: number;

  get width() {
    return this._width;
  }

  get height() {
    return this._height;
  }

  get x() {
    return this._x;
  }

  get y() {
    return this._y;
  }

  constructor(rectProps: RectProps) {
    const { x, y, width, height } = rectProps;

    this._x = x;
    this._y = y;
    this._width = width;
    this._height = height;
  }

  public containsPoint(x: number, y: number) {
    return x >= this._x && y >= this._y && x <= this._x + this.width && y <= this._y + this._height;
  }
}

const DEFAULT_ANIMATION_CONFIGS = {
  spring: {
    friction: 7,
    tension: 100,
  },
  timing: {
    duration: 150,
    easing: Easing.inOut(Easing.ease),
    delay: 0,
  },
  // decay : { // This has a serious bug
  //   velocity     : 1,
  //   deceleration : 0.997
  // }
};

type ContainerType = { width: number; height: number };

type MeasuredDimensions = 'containerSize' | 'trackSize';

type SliderProps = {
  /**
   * Initial value of the slider. The value should be between minimumValue
   * and maximumValue, which default to 0 and 1 respectively.
   * Default value is 0.
   *
   * *This is not a controlled component*, e.g. if you don't update
   * the value, the component won't be reset to its inital value.
   */
  value: number;

  /**
   * If true the user won't be able to move the slider.
   * Default value is false.
   */
  disabled?: boolean;

  /**
   * Initial minimum value of the slider. Default value is 0.
   */
  minimumValue?: number;

  /**
   * Initial maximum value of the slider. Default value is 1.
   */
  maximumValue?: number;

  /**
   * Step value of the slider. The value should be between 0 and
   * (maximumValue - minimumValue). Default value is 0.
   */
  step?: number;

  /**
   * The color used for the track to the left of the button. Overrides the
   * default blue gradient image.
   */
  minimumTrackTintColor?: string;

  /**
   * The color used for the track to the right of the button. Overrides the
   * default blue gradient image.
   */
  maximumTrackTintColor?: string;

  /**
   * The color used for the thumb.
   */
  thumbTintColor?: string;

  /**
   * The size of the touch area that allows moving the thumb.
   * The touch area has the same center has the visible thumb.
   * This allows to have a visually small thumb while still allowing the user
   * to move it easily.
   * The default is {width: 40, height: 40}.
   */
  thumbTouchSize?: ContainerType;

  /**
   * Callback continuously called while the user is dragging the slider.
   */
  onValueChange: (value: number) => void;

  /**
   * Callback called when the user starts changing the value (e.g. when
   * the slider is pressed).
   */
  onSlidingStart?: (value: number) => void;

  /**
   * Callback called when the user finishes changing the value (e.g. when
   * the slider is released).
   */
  onSlidingComplete?: (value: number) => void;

  /**
   * The style applied to the slider container.
   */
  style?: StyleProp<any>;

  /**
   * The style applied to the slider itself, override different parts.
   */
  styles?: StyleProp<any>;

  /**
   * The style applied to the track.
   */
  trackStyle?: StyleProp<any>;

  /**
   * The style applied to the thumb.
   */
  thumbStyle?: StyleProp<ViewStyle>;

  /**
   * Sets an image for the thumb.
   */
  thumbImage?: ImageSourcePropType;

  /**
   * Set this to true to visually see the thumb touch rect in green.
   */
  debugTouchArea?: boolean;

  /**
   * Set to true to animate values with default 'timing' animation type
   */
  animateTransitions?: boolean;

  /**
   * Custom Animation type. 'spring' or 'timing'.
   */
  animationType?: 'spring' | 'timing';

  /**
   * Used to configure the animation parameters.  These are the same parameters in the Animated library.
   */
  animationConfig?: Animated.AnimationConfig;
};

const emptyDimension = { width: 0, height: 0 };

const Slider: React.FC<SliderProps> = ({
  animationConfig = {},
  animateTransitions = true,
  value = 0,
  minimumValue = 0,
  maximumValue = 1,
  step = 0,
  onSlidingStart = noop,
  onSlidingComplete = noop,
  onValueChange,
  minimumTrackTintColor = '#3f3f3f',
  maximumTrackTintColor = '#b3b3b3',
  thumbTintColor = '#343434',
  thumbTouchSize = { width: 40, height: 40 },
  animationType = 'timing',
  thumbImage = null,
  disabled = false,
  styles = {},
  style = {},
  trackStyle = {},
  thumbStyle = {},
  debugTouchArea = false,
  ...rest
}) => {
  const sizes = useRef<Record<MeasuredDimensions, ContainerType>>({
    containerSize: { ...emptyDimension },
    trackSize: { ...emptyDimension },
  });
  const previousLeft = useRef<number>(0);
  const [allMeasured, setAllMeasured] = useState<boolean>(false);
  const animationValue = useRef(new Animated.Value(value)).current;
  const [animatedLatestValueRef] = useAnimatedLatestValueRef(animationValue, value);

  const measureContainer = (e: LayoutChangeEvent) => {
    handleMeasure('containerSize', e);
  };

  const measureTrack = (e: LayoutChangeEvent) => {
    handleMeasure('trackSize', e);
  };

  const handleMeasure = (name: MeasuredDimensions, x: LayoutChangeEvent) => {
    if (!allMeasured) {
      const { width, height } = x.nativeEvent.layout;
      const size = { width, height };

      const currentSize = sizes.current[name];

      if ((width === currentSize.width && height === currentSize.height) || width === 0 || height === 0) {
        return;
      }

      const newSizes: Record<MeasuredDimensions, ContainerType> = { ...sizes.current, [name]: size };
      sizes.current = newSizes;

      if (
        !Object.keys(newSizes).find(
          sizeKey =>
            newSizes[sizeKey as keyof typeof newSizes].width === 0 &&
            newSizes[sizeKey as keyof typeof newSizes].height === 0
        )
      ) {
        setAllMeasured(true);
      }
    }
  };

  const getTouchOverflowSize = (): ContainerType => {
    if (allMeasured) {
      return {
        width: Math.max(0, thumbTouchSize.width - THUMB_SIZE),
        height: Math.max(0, thumbTouchSize.height - sizes.current.containerSize.height) + THUMB_SIZE,
      };
    }

    return {
      width: 0,
      height: 0,
    };
  };

  const getThumbTouchRect = () => {
    const touchOverflowSize = getTouchOverflowSize();
    const x =
      touchOverflowSize.width / 2 +
      getThumbLeft(animatedLatestValueRef.current) +
      (THUMB_SIZE - thumbTouchSize.width) / 2;
    const y =
      touchOverflowSize.height / 2 + (sizes.current.containerSize.height - thumbTouchSize.height) / 2 - THUMB_SIZE;

    return new Rect({
      x,
      y,
      width: thumbTouchSize.width * 1.2,
      height: thumbTouchSize.height * 1.2,
    });
  };

  const thumbHitTest = (e: GestureResponderEvent) => {
    const { locationX, locationY } = e.nativeEvent;

    return getThumbTouchRect().containsPoint(locationX, locationY);
  };

  // Should we become active when the user presses down on the thumb?
  const handleStartShouldSetPanResponder = (e: GestureResponderEvent): boolean => {
    return thumbHitTest(e);
  };

  // Should we become active when the user moves a touch over the thumb?
  const handleMoveShouldSetPanResponder = (): boolean => false;

  const handlePanResponderGrant = () => {
    previousLeft.current = getThumbLeft(animatedLatestValueRef.current);
    onSlidingStart(animatedLatestValueRef.current);
  };

  const handlePanResponderMove = (e: GestureResponderEvent, gestureState: PanResponderGestureState) => {
    if (disabled) {
      return;
    }

    const newValue = getValue(gestureState);

    setCurrentValue(newValue);

    onValueChange(newValue);
  };

  // Should we allow another component to take over this pan?
  const handlePanResponderRequestEnd = () => false;

  const handlePanResponderEnd = (e: GestureResponderEvent, gestureState: PanResponderGestureState) => {
    if (disabled) {
      return;
    }

    const newValue = getValue(gestureState);
    setCurrentValue(newValue);
    onSlidingComplete(newValue);
  };

  const getRatio = (forValue: number) => {
    return (forValue - minimumValue) / (maximumValue - minimumValue);
  };

  const getThumbLeft = (forValue: number) => {
    return getRatio(forValue) * sizes.current.containerSize.width;
  };

  const getValue = (gestureState: PanResponderGestureState) => {
    const length = sizes.current.containerSize.width - THUMB_SIZE;
    const thumbLeft = previousLeft.current + gestureState.dx;

    const ratio = thumbLeft / length;

    if (step) {
      return Math.max(
        minimumValue,
        Math.min(maximumValue, minimumValue + Math.round((ratio * (maximumValue - minimumValue)) / step) * step)
      );
    }

    return Math.max(minimumValue, Math.min(maximumValue, ratio * (maximumValue - minimumValue) + minimumValue));
  };

  const setCurrentValue = (valueToSet: number) => {
    animationValue.setValue(valueToSet);
    animatedLatestValueRef.current = valueToSet;
  };

  const setCurrentValueAnimated = (valueToSet: number) => {
    const config = {
      ...DEFAULT_ANIMATION_CONFIGS[animationType],
      ...animationConfig,
      toValue: valueToSet,
      useNativeDriver: false,
    };

    Animated[animationType](animationValue, config).start();
  };

  const getTouchOverflowStyle = () => {
    const { width, height } = getTouchOverflowSize();

    const touchOverflowStyle: StyleProp<ViewStyle> = {};
    const verticalMargin = -height / 2;
    touchOverflowStyle.marginTop = verticalMargin;
    touchOverflowStyle.marginBottom = verticalMargin;

    const horizontalMargin = -width / 2;
    touchOverflowStyle.marginLeft = horizontalMargin;
    touchOverflowStyle.marginRight = horizontalMargin;

    if (debugTouchArea) {
      touchOverflowStyle.backgroundColor = 'orange';
      touchOverflowStyle.opacity = 0.5;
    }

    return touchOverflowStyle;
  };

  const renderDebugThumbTouchRect = () => {
    const thumbTouchRect = getThumbTouchRect();

    const positionStyle = {
      left: getThumbLeft(animatedLatestValueRef.current) - 25,
      top: thumbTouchRect.y,
      width: thumbTouchRect.width * 1.2,
      height: thumbTouchRect.height * 1.2,
    };

    return <Animated.View style={[defaultStyles.debugThumbTouchArea, positionStyle]} pointerEvents="none" />;
  };

  const renderThumbImage = () => {
    if (!thumbImage) {
      return null;
    }

    return <Image source={thumbImage} />;
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: handleStartShouldSetPanResponder,
      onMoveShouldSetPanResponder: handleMoveShouldSetPanResponder,
      onPanResponderGrant: handlePanResponderGrant,
      onPanResponderMove: handlePanResponderMove,
      onPanResponderRelease: handlePanResponderEnd,
      onPanResponderTerminationRequest: handlePanResponderRequestEnd,
      onPanResponderTerminate: handlePanResponderEnd,
    })
  ).current;

  useEffect(() => {
    if (animateTransitions) {
      setCurrentValueAnimated(value);
    } else {
      setCurrentValue(value);
    }
  }, [setCurrentValue, setCurrentValueAnimated, animateTransitions, value]);

  const mainStyles = styles || defaultStyles;

  const thumbLeft = animationValue.interpolate({
    inputRange: [minimumValue, maximumValue],
    outputRange: [0, sizes.current.containerSize.width - THUMB_SIZE],
    // extrapolate: 'clamp',
  });

  const valueVisibleStyle: StyleProp<ViewStyle> = {};

  if (!allMeasured) {
    valueVisibleStyle.opacity = 0;
  }

  const minimumTrackStyle = {
    position: 'absolute',
    width: Animated.add(thumbLeft, THUMB_SIZE / 2),
    backgroundColor: minimumTrackTintColor,
    ...valueVisibleStyle,
  };

  const touchOverflowStyle = getTouchOverflowStyle();

  return (
    <View {...rest} style={[mainStyles.container, style]} onLayout={measureContainer}>
      <View
        style={[{ backgroundColor: maximumTrackTintColor }, mainStyles.track, trackStyle]}
        renderToHardwareTextureAndroid
        onLayout={measureTrack}
      />
      <Animated.View renderToHardwareTextureAndroid style={[mainStyles.track, trackStyle, minimumTrackStyle]} />
      <Animated.View
        renderToHardwareTextureAndroid
        style={[
          { backgroundColor: thumbTintColor },
          mainStyles.thumb,
          thumbStyle,
          {
            transform: [
              {
                translateX: getThumbLeft(animatedLatestValueRef.current) - (sizes.current.containerSize.width || 0) / 2,
              },
              { translateY: -thumbTouchSize.height / 2 - THUMB_SIZE / 2 },
            ],
            ...valueVisibleStyle,
          },
        ]}
      >
        {renderThumbImage()}
      </Animated.View>
      <View
        renderToHardwareTextureAndroid
        style={[defaultStyles.touchArea, touchOverflowStyle]}
        {...panResponder.panHandlers}
      >
        {debugTouchArea === true && renderDebugThumbTouchRect()}
      </View>
    </View>
  );
};

const defaultStyles = StyleSheet.create({
  container: {
    height: 40,
    justifyContent: 'center',
  },
  debugThumbTouchArea: {
    backgroundColor: 'green',
    opacity: 0.5,
    position: 'absolute',
  },
  thumb: {
    borderRadius: THUMB_SIZE / 4,
    height: THUMB_SIZE * 2,
    position: 'absolute',
    width: THUMB_SIZE * 2,
  },
  touchArea: {
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  track: {
    borderRadius: TRACK_SIZE / 2,
    height: TRACK_SIZE,
  },
});

export default Slider;

