// Diagrams scale down to fit narrow screens, but never blow up much past
// their natural size on a wide one: a 3-node tree should not fill a monitor.

export const fitStyle = (viewBoxWidth: number) => ({
  maxWidth: `${Math.round(viewBoxWidth * 1.15)}px`,
});
