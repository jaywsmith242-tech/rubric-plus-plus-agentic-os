import { useEffect, useState } from "react";
import { registerDraw } from "@/lib/loop";
import { reducedMotion } from "@/lib/gl";

/** Numerals tick up from 0 on first mount — 400ms expo-out, tabular.
 *  Runs on the shared rAF loop and unregisters as soon as it lands. */
export function CountUp({ value, className = "" }: { value: number; className?: string }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    if (reducedMotion()) {
      setDisplay(value);
      return;
    }
    const t0 = performance.now();
    let done = false;
    const un = registerDraw((t) => {
      if (done) return;
      const k = Math.min(1, (t - t0) / 400);
      const e = k === 1 ? 1 : 1 - Math.pow(2, -10 * k); // expo-out
      setDisplay(Math.round(value * e));
      if (k >= 1) {
        done = true;
        un();
      }
    });
    return un;
  }, [value]);
  return <span className={`tnum ${className}`}>{display}</span>;
}
