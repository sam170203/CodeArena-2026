import React from 'react'

export default function Editor({ value = '', language = 'cpp' }) {
  return (
    <textarea
      style={{ width: '100%', height: '400px', fontFamily: 'monospace' }}
      defaultValue={value}
    />
  )
}
