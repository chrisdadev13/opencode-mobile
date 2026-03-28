import Svg, { Path, G, Mask, Rect, Defs, ClipPath } from 'react-native-svg';
import { useColorScheme } from '@/hooks/use-color-scheme';

type LogoProps = {
  width?: number;
};

export function Logo({ width = 320 }: LogoProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const inner = isDark ? '#4B4646' : '#CFCECD';
  const open = isDark ? '#B7B1B1' : '#656363';
  const code = isDark ? '#F1ECEC' : '#211E1E';

  const height = width * (115 / 640);

  return (
    <Svg width={width} height={height} viewBox="0 0 640 115" fill="none">
      <G clipPath="url(#clip0_logo)">
        <Mask
          id="mask0_logo"
          maskUnits="userSpaceOnUse"
          x={0}
          y={0}
          width={640}
          height={115}
        >
          <Path d="M640 0H0V115H640V0Z" fill="white" />
        </Mask>
        <G mask="url(#mask0_logo)">
          {/* Inner fills */}
          <Path d="M49.2346 82.1433H16.4141V49.2861H49.2346V82.1433Z" fill={inner} />
          <Path d="M131.281 82.1433H98.4609V49.2861H131.281V82.1433Z" fill={inner} />
          <Path d="M229.746 65.7139V82.1424H180.516V65.7139H229.746Z" fill={inner} />
          <Path d="M295.383 98.5718H262.562V49.2861H295.383V98.5718Z" fill={inner} />
          <Path d="M393.848 82.1433H344.617V49.2861H393.848V82.1433Z" fill={inner} />
          <Path d="M459.485 82.1433H426.664V49.2861H459.485V82.1433Z" fill={inner} />
          <Path d="M541.539 82.1433H508.719V49.2861H541.539V82.1433Z" fill={inner} />
          <Path d="M639.996 65.7139V82.1424H590.766V65.7139H639.996Z" fill={inner} />

          {/* "open" letter outlines */}
          <Path d="M49.2308 32.8573H16.4103V82.143H49.2308V32.8573ZM65.641 98.5716H0V16.4287H65.641V98.5716Z" fill={open} />
          <Path d="M98.4649 82.143H131.285V32.8573H98.4649V82.143ZM147.696 98.5716H98.4649V115H82.0547V16.4287H147.696V98.5716Z" fill={open} />
          <Path d="M229.743 65.7144H180.512V82.143H229.743V98.5716H164.102V16.4287H229.743V65.7144ZM180.512 49.2859H213.332V32.8573H180.512V49.2859Z" fill={open} />
          <Path d="M295.387 32.8573H262.567V98.5716H246.156V16.4287H295.387V32.8573ZM311.797 98.5716H295.387V32.8573H311.797V98.5716Z" fill={open} />

          {/* "code" letter outlines */}
          <Path d="M393.844 32.8573H344.613V82.143H393.844V98.5716H328.203V16.4287H393.844V32.8573Z" fill={code} />
          <Path d="M459.489 32.8573H426.668V82.143H459.489V32.8573ZM475.899 98.5716H410.258V16.4287H475.899V98.5716Z" fill={code} />
          <Path d="M541.535 32.8571H508.715V82.1428H541.535V32.8571ZM557.946 98.5714H492.305V16.4286H541.535V0H557.946V98.5714Z" fill={code} />
          <Path d="M590.77 32.8573V49.2859H623.59V32.8573H590.77ZM640 65.7144H590.77V82.143H640V98.5716H574.359V16.4287H640V65.7144Z" fill={code} />
        </G>
      </G>
      <Defs>
        <ClipPath id="clip0_logo">
          <Rect width={640} height={115} fill="white" />
        </ClipPath>
      </Defs>
    </Svg>
  );
}
