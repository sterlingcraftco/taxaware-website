import { useState, useEffect } from "react";

type DeviceType = "mobile" | "tablet" | "desktop";

const TABLET_BREAKPOINT = 768;
const DESKTOP_BREAKPOINT = 1024;

export function useDeviceType(): DeviceType {
  const [deviceType, setDeviceType] = useState<DeviceType>("desktop");

  useEffect(() => {
    const checkDevice = () => {
      const width = window.innerWidth;
      if (width < TABLET_BREAKPOINT) {
        setDeviceType("mobile");
      } else if (width < DESKTOP_BREAKPOINT) {
        setDeviceType("tablet");
      } else {
        setDeviceType("desktop");
      }
    };

    checkDevice();
    window.addEventListener("resize", checkDevice);
    return () => window.removeEventListener("resize", checkDevice);
  }, []);

  return deviceType;
}

export function useCanUseCompleteCalculator(): boolean {
  const deviceType = useDeviceType();
  return deviceType === "tablet" || deviceType === "desktop";
}
