import React from 'react';
import { css, cx } from '@emotion/css';
import { GrafanaTheme2, PanelProps } from '@grafana/data';
import { PanelDataErrorView } from '@grafana/runtime';
import { useStyles2, useTheme2 } from '@grafana/ui';
import { buildCompassModel } from 'compassModel';
import { pointOnDial } from 'compassMath';
import { CompassOptions } from 'types';
import { useAnimatedAngle } from 'useAnimatedAngle';
import { useShortestAngle } from 'useShortestAngle';

interface Props extends PanelProps<CompassOptions> {}

const LABELS: Array<{ text: string; degrees: number; cardinal: boolean }> = [
  { text: 'N', degrees: 0, cardinal: true },
  { text: 'NE', degrees: 45, cardinal: false },
  { text: 'E', degrees: 90, cardinal: true },
  { text: 'SE', degrees: 135, cardinal: false },
  { text: 'S', degrees: 180, cardinal: true },
  { text: 'SW', degrees: 225, cardinal: false },
  { text: 'W', degrees: 270, cardinal: true },
  { text: 'NW', degrees: 315, cardinal: false },
];

const TICKS = Array.from({ length: 36 }, (_, index) => index * 10);

const getStyles = (theme: GrafanaTheme2) => ({
  wrapper: css({
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    color: theme.colors.text.primary,
    fontFamily: theme.typography.fontFamily,
  }),
  dialSlot: css({
    flex: '1 1 auto',
    minHeight: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  }),
  readout: css({
    flex: '0 0 auto',
    textAlign: 'center',
    lineHeight: 1.2,
    paddingBottom: theme.spacing(0.5),
  }),
  bearing: css({
    fontSize: theme.typography.h5.fontSize,
    fontWeight: theme.typography.fontWeightMedium,
  }),
  detail: css({
    fontSize: theme.typography.bodySmall.fontSize,
    color: theme.colors.text.secondary,
  }),
});

export function CompassPanel({ options, data, width, height, fieldConfig, id }: Props) {
  const theme = useTheme2();
  const styles = useStyles2(getStyles);
  const model = buildCompassModel(options, data);
  // CSS transform on this <g> is clipped away: transform-box:view-box rotates
  // around the wrong origin when the viewBox is centered at (0, 0). The SVG
  // attribute rotates around the user-space origin, which is the dial center.
  const destination = useShortestAngle(model.target);
  const angle = useAnimatedAngle(destination);

  if (model.emptySeries) {
    return <PanelDataErrorView fieldConfig={fieldConfig} panelId={id} data={data} needsNumberField />;
  }

  const readoutBlock = 48;
  const size = Math.max(0, Math.min(width, height - readoutBlock));
  const speedFont = speedFontSize(model.speed?.value ?? '');

  return (
    <div
      className={cx(
        styles.wrapper,
        css({
          width,
          height,
        })
      )}
      data-testid="compass-panel"
    >
      <div className={styles.dialSlot}>
        <svg
          data-testid="compass-dial"
          role="img"
          aria-label={model.ariaLabel}
          width={size}
          height={size}
          viewBox="-100 -100 200 200"
        >
          <circle r={96} fill={theme.colors.background.secondary} />
          <circle r={90} fill={theme.colors.background.primary} stroke={theme.colors.border.weak} strokeWidth={1} />

          {TICKS.map((degrees) => {
            const major = degrees % 30 === 0;
            const outer = pointOnDial(degrees, 90);
            const inner = pointOnDial(degrees, major ? 79 : 84.5);
            return (
              <line
                key={degrees}
                x1={inner.x}
                y1={inner.y}
                x2={outer.x}
                y2={outer.y}
                stroke={major ? theme.colors.text.primary : theme.colors.text.disabled}
                strokeWidth={major ? 1.6 : 0.8}
                strokeLinecap="round"
              />
            );
          })}

          {LABELS.map((label) => {
            const point = pointOnDial(label.degrees, 64);
            const north = label.text === 'N';
            return (
              <text
                key={label.text}
                x={point.x}
                y={point.y}
                textAnchor="middle"
                dominantBaseline="central"
                fill={north ? theme.colors.error.main : theme.colors.text.primary}
                opacity={label.cardinal ? 1 : 0.75}
                fontSize={label.cardinal ? 12 : 8}
                fontWeight={label.cardinal ? 700 : 500}
                fontFamily={theme.typography.fontFamily}
              >
                {label.text}
              </text>
            );
          })}

          {(model.trail.dots.length > 0 || model.trail.arcs.length > 0) && (
            <g data-testid="compass-trail">
              {model.trail.arcs.map((path) => (
                <path
                  key={path}
                  d={path}
                  fill="none"
                  stroke={theme.colors.primary.main}
                  strokeOpacity={0.35}
                  strokeWidth={1.4}
                  strokeLinecap="round"
                />
              ))}
              {model.trail.dots.map((dot) => (
                <circle
                  key={`${dot.x.toFixed(2)}-${dot.y.toFixed(2)}`}
                  cx={dot.x}
                  cy={dot.y}
                  r={1.7}
                  fill={theme.colors.primary.main}
                  fillOpacity={dot.opacity}
                />
              ))}
            </g>
          )}

          {angle != null && (
            <g data-testid="compass-needle" transform={`rotate(${angle})`}>
              <polygon points="-3.2,8 0,30 3.2,8" fill={theme.colors.text.secondary} />
              <polygon points="0,-82 -5.4,10 0,3 5.4,10" fill={theme.colors.primary.main} />
              <circle
                r={3}
                fill={theme.colors.background.primary}
                stroke={theme.colors.primary.main}
                strokeWidth={1.2}
              />
            </g>
          )}

          {model.speed && (
            <g data-testid="compass-speed">
              <circle
                r={22}
                fill={theme.colors.background.primary}
                stroke={theme.colors.border.medium}
                strokeWidth={1}
              />
              <text
                x={0}
                y={model.speed.unit ? -2 : 1}
                textAnchor="middle"
                dominantBaseline="central"
                fill={theme.colors.text.primary}
                fontSize={speedFont}
                fontWeight={600}
                fontFamily={theme.typography.fontFamily}
              >
                {model.speed.value}
              </text>
              {model.speed.unit && (
                <text
                  x={0}
                  y={9}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fill={theme.colors.text.secondary}
                  fontSize={6}
                  fontFamily={theme.typography.fontFamily}
                >
                  {model.speed.unit}
                </text>
              )}
            </g>
          )}
        </svg>
      </div>
      <div className={styles.readout} data-testid="compass-readout">
        <div className={styles.bearing}>{model.readout}</div>
        {model.detail && <div className={styles.detail}>{model.detail}</div>}
      </div>
    </div>
  );
}

function speedFontSize(value: string): number {
  if (value.length <= 4) {
    return 10;
  }
  if (value.length <= 8) {
    return 8;
  }
  return 6;
}
