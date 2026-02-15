const AnimatedHeroBackground = () => {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Animated gradient orbs */}
      <div className="absolute -top-24 -left-24 w-96 h-96 bg-primary/20 rounded-full blur-3xl animate-pulse opacity-50" />
      <div className="absolute top-1/3 -right-32 w-80 h-80 bg-accent/20 rounded-full blur-3xl animate-pulse opacity-50" style={{ animationDelay: '1s' }} />
      <div className="absolute bottom-1/4 left-1/4 w-64 h-64 bg-primary/15 rounded-full blur-3xl animate-pulse opacity-40" style={{ animationDelay: '2s' }} />

      {/* SVG gradient mesh and floating elements */}
      <svg
        className="absolute inset-0 w-full h-full"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 1920 1080"
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          {/* Gradient definitions */}
          <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#2563eb" stopOpacity="0.1" />
            <stop offset="100%" stopColor="#7c3aed" stopOpacity="0.1" />
          </linearGradient>

          <linearGradient id="grad2" x1="100%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#7c3aed" stopOpacity="0.15" />
            <stop offset="100%" stopColor="#2563eb" stopOpacity="0.05" />
          </linearGradient>

          <radialGradient id="radial1">
            <stop offset="0%" stopColor="#2563eb" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#2563eb" stopOpacity="0" />
          </radialGradient>

          <filter id="glow">
            <feGaussianBlur stdDeviation="4" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Floating geometric shapes */}
        <g opacity="0.3">
          {/* Document icon 1 */}
          <rect x="200" y="150" width="60" height="80" rx="4" fill="url(#grad1)" stroke="#2563eb" strokeWidth="1" opacity="0.6">
            <animateTransform
              attributeName="transform"
              type="translate"
              values="0,0; 0,-20; 0,0"
              dur="6s"
              repeatCount="indefinite"
            />
            <animate attributeName="opacity" values="0.6;0.8;0.6" dur="6s" repeatCount="indefinite" />
          </rect>
          <line x1="210" y1="170" x2="250" y2="170" stroke="#2563eb" strokeWidth="2" opacity="0.4" />
          <line x1="210" y1="180" x2="245" y2="180" stroke="#2563eb" strokeWidth="2" opacity="0.4" />
          <line x1="210" y1="190" x2="240" y2="190" stroke="#2563eb" strokeWidth="2" opacity="0.4" />

          {/* Document icon 2 */}
          <rect x="1600" y="600" width="60" height="80" rx="4" fill="url(#grad2)" stroke="#7c3aed" strokeWidth="1" opacity="0.5">
            <animateTransform
              attributeName="transform"
              type="translate"
              values="0,0; 0,15; 0,0"
              dur="8s"
              repeatCount="indefinite"
            />
            <animate attributeName="opacity" values="0.5;0.7;0.5" dur="8s" repeatCount="indefinite" />
          </rect>
          <line x1="1610" y1="620" x2="1650" y2="620" stroke="#7c3aed" strokeWidth="2" opacity="0.4" />
          <line x1="1610" y1="630" x2="1645" y2="630" stroke="#7c3aed" strokeWidth="2" opacity="0.4" />

          {/* Stethoscope subtle outline */}
          <g opacity="0.15" transform="translate(1400, 200)">
            <circle cx="20" cy="20" r="15" fill="none" stroke="#2563eb" strokeWidth="2" />
            <circle cx="80" cy="20" r="15" fill="none" stroke="#2563eb" strokeWidth="2" />
            <path d="M 35 20 Q 50 10, 65 20" fill="none" stroke="#2563eb" strokeWidth="2" />
            <circle cx="50" cy="60" r="10" fill="none" stroke="#2563eb" strokeWidth="3" />
            <line x1="50" y1="20" x2="50" y2="50" stroke="#2563eb" strokeWidth="2" />
            <animateTransform
              attributeName="transform"
              type="translate"
              values="1400,200; 1400,180; 1400,200"
              dur="7s"
              repeatCount="indefinite"
            />
          </g>

          {/* Medical cross */}
          <g opacity="0.1" transform="translate(400, 700)">
            <rect x="15" y="0" width="10" height="40" fill="#2563eb" rx="2" />
            <rect x="0" y="15" width="40" height="10" fill="#2563eb" rx="2" />
            <animateTransform
              attributeName="transform"
              type="translate"
              values="400,700; 400,720; 400,700"
              dur="9s"
              repeatCount="indefinite"
            />
          </g>

          {/* Floating circles/orbs */}
          <circle cx="800" cy="400" r="60" fill="url(#radial1)" filter="url(#glow)">
            <animateTransform
              attributeName="transform"
              type="translate"
              values="0,0; 30,-30; 0,0"
              dur="10s"
              repeatCount="indefinite"
            />
          </circle>

          <circle cx="1200" cy="800" r="80" fill="url(#radial1)" filter="url(#glow)" opacity="0.5">
            <animateTransform
              attributeName="transform"
              type="translate"
              values="0,0; -40,20; 0,0"
              dur="12s"
              repeatCount="indefinite"
            />
          </circle>

          {/* Network connection lines */}
          <g opacity="0.2">
            <line x1="400" y1="300" x2="800" y2="400" stroke="#2563eb" strokeWidth="1" strokeDasharray="5,5">
              <animate attributeName="stroke-dashoffset" values="0;10" dur="2s" repeatCount="indefinite" />
            </line>
            <line x1="800" y1="400" x2="1200" y2="500" stroke="#7c3aed" strokeWidth="1" strokeDasharray="5,5">
              <animate attributeName="stroke-dashoffset" values="0;10" dur="2s" repeatCount="indefinite" />
            </line>
          </g>

          {/* Checkmark success indicators */}
          <g transform="translate(1500, 400)" opacity="0.2">
            <circle cx="0" cy="0" r="20" fill="#10b981" opacity="0.2" />
            <path d="M -8 0 L -2 6 L 8 -6" stroke="#10b981" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            <animateTransform
              attributeName="transform"
              type="translate"
              values="1500,400; 1500,420; 1500,400"
              dur="5s"
              repeatCount="indefinite"
            />
            <animate attributeName="opacity" values="0.2;0.4;0.2" dur="5s" repeatCount="indefinite" />
          </g>

          {/* Star/sparkle elements */}
          <g opacity="0.3">
            <circle cx="600" cy="200" r="3" fill="#60a5fa">
              <animate attributeName="opacity" values="0.3;1;0.3" dur="3s" repeatCount="indefinite" />
              <animate attributeName="r" values="3;5;3" dur="3s" repeatCount="indefinite" />
            </circle>
            <circle cx="1100" cy="300" r="3" fill="#a78bfa">
              <animate attributeName="opacity" values="0.3;1;0.3" dur="4s" begin="1s" repeatCount="indefinite" />
              <animate attributeName="r" values="3;5;3" dur="4s" begin="1s" repeatCount="indefinite" />
            </circle>
            <circle cx="1400" cy="700" r="3" fill="#60a5fa">
              <animate attributeName="opacity" values="0.3;1;0.3" dur="3.5s" begin="0.5s" repeatCount="indefinite" />
              <animate attributeName="r" values="3;5;3" dur="3.5s" begin="0.5s" repeatCount="indefinite" />
            </circle>
          </g>

          {/* Grid pattern overlay */}
          <g opacity="0.05">
            <defs>
              <pattern id="grid" width="100" height="100" patternUnits="userSpaceOnUse">
                <path d="M 100 0 L 0 0 0 100" fill="none" stroke="#2563eb" strokeWidth="0.5" />
              </pattern>
            </defs>
            <rect width="1920" height="1080" fill="url(#grid)" />
          </g>
        </g>
      </svg>
    </div>
  );
};

export default AnimatedHeroBackground;
