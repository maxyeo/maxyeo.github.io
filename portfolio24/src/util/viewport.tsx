import { useEffect, useState } from "react";

function isMobileWidth() {
  return window.innerWidth < 960;
}

export default function useMobile() {
  const [isUnder, setIsMobile] = useState(
    isMobileWidth()
  );

  useEffect(() => {
    function handleResize() {
      setIsMobile(isMobileWidth());
    }
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return isUnder;
}