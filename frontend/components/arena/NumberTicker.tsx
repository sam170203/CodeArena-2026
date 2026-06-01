"use client";
import { motion, useSpring, useTransform } from "framer-motion";
import { useEffect } from "react";

export function NumberTicker({
  from,
  to,
  prefix = "",
}: {
  from: number;
  to: number;
  prefix?: string;
}) {
  const spring = useSpring(from, { mass: 0.6, stiffness: 90, damping: 18 });
  const display = useTransform(spring, (latest) => `${prefix}${Math.round(latest)}`);
  useEffect(() => {
    spring.set(to);
  }, [to, spring]);
  return <motion.span>{display}</motion.span>;
}
