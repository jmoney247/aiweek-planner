/** Visible size is independent of the accessible 44px minimum hit area. */
export function markerStyle(count: number) {
  if (count <= 1) return { size: 16, color: '#FF8A3D', hitSize: 44 };
  const size = count <= 5 ? 28 + (count - 2) * 2
    : count <= 19 ? 38 + Math.round((count - 6) * 0.7)
    : Math.min(64, 50 + Math.round(Math.log2(count / 20) * 6));
  return { size, color: count <= 5 ? '#4CB7D0' : count <= 19 ? '#F2EF70' : '#EC87B5', hitSize: Math.max(44, size) };
}
