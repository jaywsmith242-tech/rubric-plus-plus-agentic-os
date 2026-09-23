import { motion } from "framer-motion";
import { reducedMotion } from "@/lib/gl";
import type { ReactNode } from "react";

/** Per-panel staggered content reveal — children rise 8px + fade + unblur,
 *  60ms stagger, panel-enter token (320ms, cubic-bezier(.16,1,.3,1)).
 *  Flattened under prefers-reduced-motion. */

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
};

const item = {
  hidden: { opacity: 0, y: 8, filter: "blur(8px)" },
  show: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 0.32, ease: [0.16, 1, 0.3, 1] as const },
  },
};

export function Reveal({ children, className = "" }: { children: ReactNode; className?: string }) {
  if (reducedMotion()) return <div className={className}>{children}</div>;
  return (
    <motion.div className={className} variants={container} initial="hidden" animate="show">
      {children}
    </motion.div>
  );
}

export function RevealItem({ children, className = "" }: { children: ReactNode; className?: string }) {
  if (reducedMotion()) return <div className={className}>{children}</div>;
  return (
    <motion.div className={className} variants={item}>
      {children}
    </motion.div>
  );
}
