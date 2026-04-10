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

        <defs>
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <linearGradient id="radarGradient" x1="0%" y1="0%" x2="100%" y2="100%">
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

      {labelPositions.map((pos, i) => (
        <motion.div
          key={i}
          className="absolute text-center"
          style={{ left: pos.x, top: pos.y, transform: "translate(-50%, -50%)" }}
          initial={animate ? { opacity: 0 } : {}}
          animate={animate ? { opacity: 1 } : {}}
          transition={{ delay: 0.5 + i * 0.1 }}
        >
          <div className="text-xs font-mono text-muted-foreground">{pos.label}</div>
          <div className="text-sm font-bold text-primary">{pos.value}</div>
        </motion.div>
      ))}
    </div>
  );
}

// ── 迷你属性条：替换原来看不懂的折线 ──
const ATTR_CONFIG = [
  { key: "shooting" as const, label: "投", color: "#22d3ee" },
  { key: "defense" as const, label: "守", color: "#a855f7" },
  { key: "physical" as const, label: "身", color: "#f59e0b" },
  { key: "dribbling" as const, label: "控", color: "#10b981" },
  { key: "longevity" as const, label: "持", color: "#f43f5e" },
];

export function MiniRadarSparkline({
  data,
}: {
  data: RadarChartProps["data"];
}) {
  const barWidth = 28;
  const gap = 4;
  const totalWidth = ATTR_CONFIG.length * barWidth + (ATTR_CONFIG.length - 1) * gap;
  const maxBarHeight = 32;
  const labelHeight = 12;
  const svgHeight = maxBarHeight + labelHeight + 4;

  return (
    <div className="flex flex-col items-end gap-0.5">
      <svg
        width={totalWidth}
        height={svgHeight}
        className="overflow-visible"
      >
        <defs>
          {ATTR_CONFIG.map((attr) => (
            <linearGradient
              key={attr.key}
              id={`bar-grad-${attr.key}`}
              x1="0%"
              y1="0%"
              x2="0%"
              y2="100%"
            >
              <stop offset="0%" stopColor={attr.color} stopOpacity={0.9} />
              <stop offset="100%" stopColor={attr.color} stopOpacity={0.3} />
            </linearGradient>
          ))}
        </defs>

        {ATTR_CONFIG.map((attr, i) => {
          const value = data[attr.key];
          const barH = Math.max(2, (value / 100) * maxBarHeight);
          const x = i * (barWidth + gap);
          const y = maxBarHeight - barH;

          return (
            <g key={attr.key}>
              {/* 背景轨道 */}
              <rect
                x={x}
                y={0}
                width={barWidth}
                height={maxBarHeight}
                rx={3}
                fill="rgba(255,255,255,0.05)"
              />
              {/* 实际数值柱 */}
              <rect
                x={x}
                y={y}
                width={barWidth}
                height={barH}
                rx={3}
                fill={`url(#bar-grad-${attr.key})`}
              />
              {/* 数值文字 */}
              <text
                x={x + barWidth / 2}
                y={y - 2}
                textAnchor="middle"
                fontSize={8}
                fontFamily="monospace"
                fill={attr.color}
                opacity={0.9}
              >
                {value}
              </text>
              {/* 属性标签 */}
              <text
                x={x + barWidth / 2}
                y={maxBarHeight + labelHeight}
                textAnchor="middle"
                fontSize={9}
                fontFamily="monospace"
                fill="rgba(148,163,184,0.8)"
              >
                {attr.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
