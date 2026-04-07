import { useRef } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Image, StyleSheet, Text, View, type ImageSourcePropType } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import type { BranchMapEdge, BranchMapNode } from './storyBranchBuilder';

const NODE_W = 76;
const NODE_H = 50;
const START_W = 94;
const PILL_H = 30;
const COL_GAP = 58;
const ROW_GAP = 18;
const PAD_H = 20;
const PAD_V = 20;
const MAP_H = NODE_H * 3 + ROW_GAP * 2 + PAD_V * 2;
const TAP_MOVE_THRESHOLD = 8;

type Point = { x: number; y: number };

type StoryBranchMapProps = {
  columns: BranchMapNode[][];
  edges: BranchMapEdge[];
  onNodeTap?: (node: BranchMapNode) => void;
  resolveImageSource: (imageUrl: string | null | undefined) => ImageSourcePropType | null;
};

function nodeWidth(node: BranchMapNode): number {
  return node.isStart ? START_W : NODE_W;
}

function buildCenters(columns: BranchMapNode[][]): Record<string, Point> {
  const centers: Record<string, Point> = {};
  let x = PAD_H;
  for (const col of columns) {
    if (col.length === 0) continue;
    const colW = nodeWidth(col[0]);
    const cx = x + colW / 2;
    if (col.length === 1) {
      centers[col[0].id] = { x: cx, y: MAP_H / 2 };
    } else {
      const totalH = col.length * NODE_H + (col.length - 1) * ROW_GAP;
      const startY = (MAP_H - totalH) / 2 + NODE_H / 2;
      for (let i = 0; i < col.length; i += 1) {
        centers[col[i].id] = { x: cx, y: startY + i * (NODE_H + ROW_GAP) };
      }
    }
    x += colW + COL_GAP;
  }
  return centers;
}

function calcTotalWidth(columns: BranchMapNode[][]): number {
  let width = PAD_H;
  for (let i = 0; i < columns.length; i += 1) {
    if (columns[i].length === 0) continue;
    width += nodeWidth(columns[i][0]);
    if (i < columns.length - 1) width += COL_GAP;
  }
  return width + PAD_H;
}

function findNodeById(columns: BranchMapNode[][], nodeId: string): BranchMapNode | null {
  for (const col of columns) {
    for (const node of col) {
      if (node.id === nodeId) return node;
    }
  }
  return null;
}

function rgbaFromHex(hex: string, alpha: number): string {
  const clean = hex.replace('#', '');
  const normalized = clean.length === 3 ? clean.split('').map((c) => `${c}${c}`).join('') : clean;
  const r = parseInt(normalized.slice(0, 2), 16);
  const g = parseInt(normalized.slice(2, 4), 16);
  const b = parseInt(normalized.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function buildRoundedPath(
  sx: number,
  sy: number,
  mx: number,
  ex: number,
  ey: number,
  radius = 6
): string {
  if (Math.abs(sy - ey) < 1) {
    return `M ${sx} ${sy} L ${ex} ${ey}`;
  }
  const down = ey > sy;
  const r = radius;
  const enterY = sy + (down ? r : -r);
  const leaveY = ey - (down ? r : -r);
  return [
    `M ${sx} ${sy}`,
    `L ${mx - r} ${sy}`,
    `Q ${mx} ${sy} ${mx} ${enterY}`,
    `L ${mx} ${leaveY}`,
    `Q ${mx} ${ey} ${mx + r} ${ey}`,
    `L ${ex} ${ey}`,
  ].join(' ');
}

export function getApproxBranchColumnWidth(): number {
  return 116;
}

export default function StoryBranchMap(props: StoryBranchMapProps) {
  const { columns, edges, onNodeTap, resolveImageSource } = props;
  const touchStateRef = useRef<{
    nodeId: string | null;
    startX: number;
    startY: number;
    moved: boolean;
  }>({
    nodeId: null,
    startX: 0,
    startY: 0,
    moved: false,
  });
  const centers = buildCenters(columns);
  const totalWidth = calcTotalWidth(columns);
  const nodeWidthMap: Record<string, number> = {};
  for (const col of columns) {
    for (const node of col) {
      nodeWidthMap[node.id] = nodeWidth(node);
    }
  }

  return (
    <View style={styles.mapContainer}>
      <View style={[styles.mapInner, { width: totalWidth, height: MAP_H }]}>
        <Svg width={totalWidth} height={MAP_H} style={StyleSheet.absoluteFillObject}>
          {edges.map((edge, index) => {
            const from = centers[edge.fromId];
            const to = centers[edge.toId];
            if (!from || !to) return null;
            const startX = from.x + (nodeWidthMap[edge.fromId] ?? NODE_W) / 2;
            const endX = to.x - (nodeWidthMap[edge.toId] ?? NODE_W) / 2;
            const midX = (startX + endX) / 2;
            const d = buildRoundedPath(startX, from.y, midX, endX, to.y);
            return (
              <Path
                key={`${edge.fromId}_${edge.toId}_${index}`}
                d={d}
                stroke={rgbaFromHex('#D4AF37', edge.isDashed ? 0.45 : 0.75)}
                strokeWidth={1}
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeDasharray={edge.isDashed ? '5 4' : undefined}
              />
            );
          })}
        </Svg>

        {columns.map((col) =>
          col.map((node) => {
            const center = centers[node.id];
            if (!center) return null;
            const width = nodeWidth(node);
            const height = node.isStart ? PILL_H : NODE_H;
            const imageSource = resolveImageSource(node.imageUrl);
            return (
              <View
                key={node.id}
                style={[
                  styles.nodeWrap,
                  { left: center.x - width / 2, top: center.y - height / 2, width, height },
                ]}
              >
                <View
                  style={[
                    node.isStart ? styles.startNode : styles.normalNode,
                    node.isStart
                      ? null
                      : {
                          opacity: node.isLocked ? 0.5 : node.isVisited ? 1 : 0.75,
                          borderColor: node.isVisited ? '#E9D5A1' : '#D4AF37',
                          borderWidth: node.isVisited ? 1.1 : node.isEnd ? 1 : 0.7,
                          shadowColor: node.isEnd ? '#D4AF37' : '#000000',
                          shadowOpacity: node.isEnd ? 0.4 : 0.15,
                          shadowRadius: node.isEnd ? 5 : 3,
                          shadowOffset: node.isEnd ? { width: 0, height: 0 } : { width: 0, height: 1 },
                        },
                  ]}
                >
                  {!node.isStart && imageSource && !node.isLocked ? (
                    <View style={styles.nodeImageLayer}>
                      <Image source={imageSource} style={styles.nodeImage} resizeMode="contain" />
                    </View>
                  ) : null}
                  {!node.isStart && node.isLocked ? (
                    <View style={styles.nodeLockWrap}>
                      <Ionicons name="lock-closed-outline" size={16} color="#D4AF37" />
                    </View>
                  ) : null}
                  {node.isStart ? (
                    <Text style={styles.startNodeText} numberOfLines={1}>
                      {node.title}
                    </Text>
                  ) : (
                    <View style={styles.nodeTitleBar}>
                      <Text style={styles.nodeTitleText} numberOfLines={1}>
                        {node.title}
                      </Text>
                    </View>
                  )}
                </View>
                <View
                  style={styles.nodePressMask}
                  onTouchStart={(event) => {
                    touchStateRef.current = {
                      nodeId: node.id,
                      startX: event.nativeEvent.pageX,
                      startY: event.nativeEvent.pageY,
                      moved: false,
                    };
                  }}
                  onTouchMove={(event) => {
                    const state = touchStateRef.current;
                    if (state.nodeId !== node.id || state.moved) return;
                    const dx = Math.abs(event.nativeEvent.pageX - state.startX);
                    const dy = Math.abs(event.nativeEvent.pageY - state.startY);
                    if (dx > TAP_MOVE_THRESHOLD || dy > TAP_MOVE_THRESHOLD) {
                      state.moved = true;
                    }
                  }}
                  onTouchCancel={() => {
                    if (touchStateRef.current.nodeId === node.id) {
                      touchStateRef.current.moved = true;
                    }
                  }}
                  onTouchEnd={() => {
                    const state = touchStateRef.current;
                    if (state.nodeId === node.id && !state.moved) {
                      onNodeTap?.(node);
                    }
                    if (state.nodeId === node.id) {
                      touchStateRef.current = {
                        nodeId: null,
                        startX: 0,
                        startY: 0,
                        moved: false,
                      };
                    }
                  }}
                />
              </View>
            );
          })
        )}

        {edges.map((edge, index) => {
          if (!edge.card) return null;
          const from = centers[edge.fromId];
          const to = centers[edge.toId];
          if (!from || !to) return null;
          const fromNode = findNodeById(columns, edge.fromId);
          const toNode = findNodeById(columns, edge.toId);
          if (!fromNode || !toNode) return null;
          const startX = from.x + nodeWidth(fromNode) / 2;
          const endX = to.x - nodeWidth(toNode) / 2;
          const midX = (startX + endX) / 2;
          const midY = (from.y + to.y) / 2;
          const thumbSource = resolveImageSource(edge.card.imageUrl);
          return (
            <View
              key={`card_${edge.fromId}_${edge.toId}_${index}`}
              style={[styles.cardWrap, { left: midX - 3, top: midY - 3 }]}
              pointerEvents="none"
            >
              <View style={styles.edgeDot} />
              <View style={styles.edgeCardThumbWrap}>
                <View style={styles.edgeCardThumb}>
                  {thumbSource ? (
                    <View style={styles.edgeCardImageLayer}>
                      <Image source={thumbSource} style={styles.edgeCardImage} resizeMode="contain" />
                    </View>
                  ) : (
                    <View style={styles.edgeCardFallback} />
                  )}
                  <View style={styles.edgeCardLabelBar}>
                    <Text style={styles.edgeCardLabel} numberOfLines={1}>
                      {edge.card.label}
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  mapContainer: {
    height: MAP_H,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    shadowColor: '#000000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 2 },
    overflow: 'hidden',
  },
  mapInner: {
    position: 'relative',
  },
  nodeWrap: {
    position: 'absolute',
  },
  startNode: {
    flex: 1,
    borderRadius: 999,
    borderWidth: 0.7,
    borderColor: '#8B6B23',
    backgroundColor: '#E9D5A1',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOpacity: 0.1,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    overflow: 'hidden',
  },
  startNodeText: {
    color: '#5C4017',
    fontSize: 10,
    fontWeight: '700',
    paddingHorizontal: 6,
  },
  normalNode: {
    flex: 1,
    borderRadius: 4,
    backgroundColor: '#3D2B1F',
    overflow: 'hidden',
  },
  nodeImage: {
    width: '100%',
    height: '100%',
    opacity: 0.82,
  },
  nodeImageLayer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 1,
    paddingVertical: 1,
  },
  nodeLockWrap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nodeTitleBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(61,43,31,0.85)',
  },
  nodeTitleText: {
    color: '#E9D5A1',
    fontSize: 8,
    textAlign: 'center',
  },
  nodePressMask: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
  },
  cardWrap: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
  },
  edgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    borderWidth: 0.5,
    borderColor: '#D4AF37',
    backgroundColor: '#3D2B1F',
  },
  edgeCardThumbWrap: {
    marginLeft: 4,
    transform: [{ translateY: -10 }],
  },
  edgeCardThumb: {
    width: 18,
    height: 26,
    borderRadius: 2,
    borderWidth: 0.4,
    borderColor: rgbaFromHex('#D4AF37', 0.6),
    shadowColor: '#000000',
    shadowOpacity: 0.25,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 0 },
    overflow: 'hidden',
  },
  edgeCardImage: {
    width: '100%',
    height: '100%',
  },
  edgeCardImageLayer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 1,
  },
  edgeCardFallback: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#3D2B1F',
  },
  edgeCardLabelBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 8,
    backgroundColor: 'rgba(0,0,0,0.65)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 1,
  },
  edgeCardLabel: {
    color: '#ffffff',
    fontSize: 4.5,
    lineHeight: 5,
  },
});
