import React, { useState, useEffect, useMemo } from 'react';

// --- Utility Functions ---

// Interpolate color from Cold (Blue) to Hot (Red)
const getTemperatureColor = (temp: number) => {
  // temp is 0 to 100
  const ratio = temp / 100;
  const r = Math.round(ratio * 255);
  const b = Math.round((1 - ratio) * 255);
  const g = Math.round(40 + 40 * ratio); // slight curve for better visual
  return `rgb(${r}, ${g}, ${b})`;
};

// Specific heat capacity of water in J/(kg*C)
const SPECIFIC_HEAT_WATER = 4186; 

// --- SVG Icons (Zero-dependency) ---

const ThermometerIcon = ({ className = "w-6 h-6" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 4v10.54a4 4 0 1 1-4 0V4a2 2 0 0 1 4 0Z" />
  </svg>
);

const DropletIcon = ({ className = "w-6 h-6" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C6 11.1 5 13 5 15a7 7