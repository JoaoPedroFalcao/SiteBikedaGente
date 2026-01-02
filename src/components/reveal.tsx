import { motion, useAnimation, useInView } from "framer-motion";
import { useEffect, useRef } from "react"

type TagTypes = "div" | "section" | "article" | "main" | "header" | "footer" | "ul" | "li";

interface RevealProps {
  children: React.ReactNode;
  delay?: number;
  as?: TagTypes;
  className?: string;
}

export const Reveal = ({ children, delay = 0, className = "", as = "div" }: RevealProps) => {
    const Component = motion[as] as any;
    const ref = useRef(null);
    const isInView = useInView(ref, { once: true, margin: "-50px 0px" });
    const mainControls = useAnimation();

    useEffect(() => {
      if (isInView) {
        mainControls.start("visible");
      }
    }, [isInView, mainControls]);

    return (
        <Component
            ref={ref}
            className={className}
            variants={{
              hidden: { opacity: 0, y: 30 },
              visible: { opacity: 1, y: 0 },
            }}
            initial="hidden"
            animate={mainControls}
            transition={{
              duration: 1.0,
              delay: delay,
              ease: "easeOut",
            }}
        >
        {children}
        </Component>
    );
};