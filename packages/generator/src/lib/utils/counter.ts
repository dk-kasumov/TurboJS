export const counter = () => {
  const counts: Record<string, number> = {}

  return (label: string) => {
    if (label in counts) {
      return `_${label}${counts[label]++}`
    }

    counts[label] = 1
    return `_${label}`
  }
}
