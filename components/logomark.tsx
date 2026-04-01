import Svg, { Path, G, Mask, Rect, Defs, ClipPath } from 'react-native-svg';

type LogomarkProps = {
  size?: number;
};

export function Logomark({ size = 40 }: LogomarkProps) {
  const innerFill = '#4B4646';
  const outerFill = '#F1ECEC';

  const width = size;
  const height = size * (300 / 240);

  return (
    <Svg width={width} height={height} viewBox="0 0 240 300" fill="none">
      <G clipPath="url(#clip0)">
        <Mask id="mask0" maskUnits="userSpaceOnUse" x={0} y={0} width={240} height={300}>
          <Path d="M240 0H0V300H240V0Z" fill="white" />
        </Mask>
        <G mask="url(#mask0)">
          <Path d="M180 240H60V120H180V240Z" fill={innerFill} />
          <Path d="M180 60H60V240H180V60ZM240 300H0V0H240V300Z" fill={outerFill} />
        </G>
      </G>
      <Defs>
        <ClipPath id="clip0">
          <Rect width={240} height={300} fill="white" />
        </ClipPath>
      </Defs>
    </Svg>
  );
}
