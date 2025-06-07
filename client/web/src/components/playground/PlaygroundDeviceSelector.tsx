import { useMediaDeviceSelect } from "@livekit/components-react";
import { useEffect, useState } from "react";

type PlaygroundDeviceSelectorProps = {
  kind: MediaDeviceKind;
};

export const PlaygroundDeviceSelector = ({
  kind,
}: PlaygroundDeviceSelectorProps) => {
  const [showMenu, setShowMenu] = useState(false);
  const deviceSelect = useMediaDeviceSelect({ kind: kind });
  const [selectedDeviceName, setSelectedDeviceName] = useState("");

  useEffect(() => {
    deviceSelect.devices.forEach((device) => {
      if (device.deviceId === deviceSelect.activeDeviceId) {
        setSelectedDeviceName(device.label);
      }
    });
  }, [deviceSelect.activeDeviceId, deviceSelect.devices, selectedDeviceName]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showMenu) {
        setShowMenu(false);
      }
    };
    document.addEventListener("click", handleClickOutside);
    return () => {
      document.removeEventListener("click", handleClickOutside);
    };
  }, [showMenu]);

  const activeClassName = showMenu ? "rotate-180" : "rotate-0";

  return (
    <div className="relative">
      <button
        className={`flex hover:opacity-70 ${activeClassName} transition-all duration-200 p-1`}
        onClick={(e) => {
          setShowMenu(!showMenu);
          e.stopPropagation();
        }}
      >
        <ChevronSVG />
      </button>
      
      {/* Enhanced dropdown menu */}
      <div
        className={`
          absolute right-0 top-full mt-2 bg-white border border-groq-accent-border rounded-lg shadow-xl
          min-w-[220px] max-w-[260px] transition-all duration-200 transform origin-top-right
          ${showMenu 
            ? "opacity-100 scale-100 translate-y-0" 
            : "opacity-0 scale-95 -translate-y-2 pointer-events-none"
          }
        `}
        style={{ zIndex: 9999 }}
      >
        {/* Header */}
        <div className="px-3 py-2 border-b border-groq-accent-border bg-groq-neutral-bg rounded-t-lg">
          <h3 className="text-xs font-semibold text-groq-content-text">Select Audio Input</h3>
        </div>
        
        {/* Device list */}
        <div className="py-1 max-h-48 overflow-y-auto">
          {deviceSelect.devices.length === 0 ? (
            <div className="px-3 py-2 text-xs text-groq-accent-text">
              No audio input devices found
            </div>
          ) : (
            deviceSelect.devices.map((device, index) => {
              const isActive = device.deviceId === deviceSelect.activeDeviceId;
              
              return (
                <button
                  key={device.deviceId || index}
                  onClick={(e) => {
                    e.stopPropagation();
                    deviceSelect.setActiveMediaDevice(device.deviceId);
                    setShowMenu(false);
                  }}
                  className={`
                    w-full px-3 py-2 text-left text-xs transition-all duration-150 flex items-center gap-2
                    ${isActive 
                      ? "bg-groq-action-text text-white" 
                      : "text-groq-content-text hover:bg-groq-content-bg-darker"
                    }
                  `}
                >
                  {/* Microphone icon */}
                  <div className={`
                    w-3 h-3 flex-shrink-0
                    ${isActive ? "text-white" : "text-groq-action-text"}
                  `}>
                    <svg fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
                    </svg>
                  </div>
                  
                  {/* Device name */}
                  <span className="flex-1 truncate">
                    {device.label || `Device ${index + 1}`}
                  </span>
                  
                  {/* Active indicator */}
                  {isActive && (
                    <div className="w-1.5 h-1.5 bg-white rounded-full flex-shrink-0"></div>
                  )}
                </button>
              );
            })
          )}
        </div>
        
        {/* Footer with device count */}
        {deviceSelect.devices.length > 0 && (
          <div className="px-3 py-1.5 border-t border-groq-accent-border bg-groq-neutral-bg rounded-b-lg">
            <p className="text-xs text-groq-accent-text">
              {deviceSelect.devices.length} device{deviceSelect.devices.length !== 1 ? 's' : ''} available
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

const ChevronSVG = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="14"
    height="14"
    viewBox="0 0 16 16"
    fill="none"
  >
    <path
      d="M13.3334 6L8.00003 11.3333L2.66669 6"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);
