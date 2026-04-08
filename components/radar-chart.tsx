"use client";

import { motion } from "framer-motion";
import { useMemo } from "react";

interface RadarChartProps {
  data: {
    shooting: number;
    defense: number;
    physical: number;
    dribbling: number;
    longevity: number;
  };
  size?: number;
  animate?: boolean;
}

export function RadarChart({
  data,
  size = 200,
  animate = true,
}: RadarChartProps) {
  const center = size / 2;
  const radius = (size / 2) * 0.8;
  const levels = 5;

  const attributes = useMemo(
    () => [
      { key: "shooting", label: "投射", value: data.shooting },
      { key: "defense", label: "防守", value: data.defense },
      { key: "physical", label: "身体", value: data.physical },
      { key: "dribbling", label: "控球", value: data.dribbling },
      { key: "longevity", label: "持久力", value: data.longevity },
    ],
    [data],
  );

  const angleStep = (2 * Math.PI) / attributes.length;
  const startAngle = -Math.PI / 2;

  // Calculate points for the data polygon
  const dataPoints = useMemo(() => {
    return attributes.map((attr, i) => {
      const angle = startAngle + i * angleStep;
      const r = (attr.value / 100) * radius;
      return {
        x: center + r * Math.cos(angle),
        y: center + r * Math.sin(angle),
      };
    });
  }, [attributes, center, radius, angleStep, startAngle]);

  const dataPath =
    dataPoints.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ") +
    " Z";

  // Calculate label positions
  const labelPositions = attributes.map((attr, i) => {
    const angle = startAngle + i * angleStep;
    const labelRadius = radius + 25;
    return {
      x: center + labelRadius * Math.cos(angle),
      y: center + labelRadius * Math.sin(angle),
      label: attr.label,
      value: attr.value,
    };
  });

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="overflow-visible">
        {/* Background levels */}
        {[...Array(levels)].map((_, level) => {
          const levelRadius = ((level + 1) / levels) * radius;
          const points = attributes.map((_, i) => {
            const angle = startAngle + i * angleStep;
            return `${center + levelRadius * Math.cos(angle)},${center + levelRadius * Math.sin(angle)}`;
          });
          return (
            <polygon
              key={level}
              points={points.join(" ")}
              fill="none"
              stroke="rgba(34, 211, 238, 0.15)"
              strokeWidth={1}
            />
          );
        })}

        {/* Axis lines */}
        {attributes.map((_, i) => {
          const angle = startAngle + i * angleStep;
          return (
            <line
              key={i}
              x1={center}
              y1={center}
              x2={center + radius * Math.cos(angle)}
              y2={center + radius * Math.sin(angle)}
              stroke="rgba(34, 211, 238, 0.2)"
              strokeWidth={1}
            />
          );
        })}

        {/* Data polygon with glow */}
        <defs>
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <linearGradient
            id="radarGradient"
            x1="0%"
            y1="0%"
            x2="100%"
            y2="100%"
          >
            <stop offset="0%" stopColor="rgba(34, 211, 238, 0.4)" />
            <stop offset="100%" stopColor="rgba(168, 85, 247, 0.4)" />
          </linearGradient>
        </defs>

        <motion.path
          d={dataPath}
          fill="url(#radarGradient)"
          stroke="#22d3ee"
          strokeWidth={2}
          filter="url(#glow)"
          initial={animate ? { scale: 0, opacity: 0 } : {}}
          animate={animate ? { scale: 1, opacity: 1 } : {}}
          transition={{ duration: 0.5, ease: "easeOut" }}
          style={{ transformOrigin: `${center}px ${center}px` }}
        />

        {/* Data points */}
        {dataPoints.map((point, i) => (
          <motion.circle
            key={i}
            cx={point.x}
            cy={point.y}
            r={4}
            fill="#22d3ee"
            filter="url(#glow)"
            initial={animate ? { scale: 0 } : {}}
            animate={animate ? { scale: 1 } : {}}
            transition={{ delay: 0.3 + i * 0.1, duration: 0.3 }}
          />
        ))}
      </svg>

      {/* Labels */}
      {labelPositions.map((pos, i) => (
        <motion.div
          key={i}
          className="absolute text-center"
          style={{
            left: pos.x,
            top: pos.y,
            transform: "translate(-50%, -50%)",
          }}
          initial={animate ? { opacity: 0 } : {}}
          animate={animate ? { opacity: 1 } : {}}
          transition={{ delay: 0.5 + i * 0.1 }}
        >
          <div className="text-xs font-mono text-muted-foreground">
            {pos.label}
          </div>
          <div className="text-sm font-bold text-primary">{pos.value}</div>
        </motion.div>
      ))}
    </div>
  );
}

// Mini sparkline version for the table
export function MiniRadarSparkline({
  data,
}: {
  data: RadarChartProps["data"];
}) {
  const values = [
    data.shooting,
    data.defense,
    data.physical,
    data.dribbling,
    data.longevity,
  ];
  const max = 100;
  const width = 60;
  const height = 24;
  const padding = 2;

  const points = values
    .map((v, i) => {
      const x = padding + (i / (values.length - 1)) * (width - 2 * padding);
      const y = height - padding - (v / max) * (height - 2 * padding);
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg width={width} height={height} className="overflow-visible">
      <defs>
        <linearGradient
          id="sparklineGradient"
          x1="0%"
          y1="0%"
          x2="100%"
          y2="0%"
        >
          <stop offset="0%" stopColor="#22d3ee" />
          <stop offset="100%" stopColor="#a855f7" />
        </linearGradient>
      </defs>
      <polyline
        points={points}
        fill="none"
        stroke="url(#sparklineGradient)"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {values.map((v, i) => {
        const x = padding + (i / (values.length - 1)) * (width - 2 * padding);
        const y = height - padding - (v / max) * (height - 2 * padding);
        return <circle key={i} cx={x} cy={y} r={2} fill="#22d3ee" />;
      })}
    </svg>
  );
}
