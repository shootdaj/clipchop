import '@testing-library/jest-dom'

// Mock URL.createObjectURL and URL.revokeObjectURL for blob handling
if (typeof URL.createObjectURL === 'undefined') {
  Object.defineProperty(URL, 'createObjectURL', {
    value: (blob: Blob) => `blob:mock-${blob.size}`,
  })
}

if (typeof URL.revokeObjectURL === 'undefined') {
  Object.defineProperty(URL, 'revokeObjectURL', {
    value: () => {},
  })
}
