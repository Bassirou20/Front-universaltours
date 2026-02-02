
import React from 'react'
export const Row: React.FC<{label: string; children: React.ReactNode}> = ({ label, children }) => (<label className="block"><span className="label">{label}</span>{children}</label>)
