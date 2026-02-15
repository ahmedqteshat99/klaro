// Step 1: Prepare - CV being optimized
export const PrepareIllustration = () => {
  return (
    <svg viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      <defs>
        <linearGradient id="cvGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#2563eb" />
          <stop offset="100%" stopColor="#7c3aed" />
        </linearGradient>

        <filter id="shadow">
          <feGaussianBlur in="SourceAlpha" stdDeviation="10" />
          <feOffset dx="0" dy="10" result="offsetblur" />
          <feComponentTransfer>
            <feFuncA type="linear" slope="0.2" />
          </feComponentTransfer>
          <feMerge>
            <feMergeNode />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        <filter id="glow">
          <feGaussianBlur stdDeviation="4" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Central floating CV document */}
      <g transform="translate(200, 200)">
        {/* Document shadow */}
        <rect x="-60" y="-80" width="120" height="160" rx="8" fill="#000" opacity="0.1" filter="url(#shadow)" />

        {/* Document */}
        <g>
          <rect x="-60" y="-80" width="120" height="160" rx="8" fill="white" stroke="#e2e8f0" strokeWidth="2">
            <animateTransform
              attributeName="transform"
              type="rotate"
              values="0 0 0; -5 0 0; 5 0 0; 0 0 0"
              dur="6s"
              repeatCount="indefinite"
            />
          </rect>

          {/* Document content lines */}
          <g opacity="0.6">
            <rect x="-45" y="-60" width="70" height="4" rx="2" fill="#cbd5e1" />
            <rect x="-45" y="-50" width="60" height="3" rx="1.5" fill="#cbd5e1" />
            <rect x="-45" y="-35" width="80" height="2" rx="1" fill="#e2e8f0" />
            <rect x="-45" y="-28" width="75" height="2" rx="1" fill="#e2e8f0" />
            <rect x="-45" y="-21" width="80" height="2" rx="1" fill="#e2e8f0" />
            <rect x="-45" y="-7" width="80" height="2" rx="1" fill="#e2e8f0" />
            <rect x="-45" y="0" width="70" height="2" rx="1" fill="#e2e8f0" />
            <rect x="-45" y="7" width="75" height="2" rx="1" fill="#e2e8f0" />
          </g>

          {/* Photo placeholder */}
          <rect x="15" y="-65" width="30" height="40" rx="3" fill="#e2e8f0" />

          <animateTransform
            attributeName="transform"
            type="rotate"
            values="0 0 0; -5 0 0; 5 0 0; 0 0 0"
            dur="6s"
            repeatCount="indefinite"
          />
        </g>

        {/* AI scanning beam */}
        <rect x="-80" y="-100" width="160" height="30" fill="url(#cvGradient)" opacity="0.3" filter="url(#glow)">
          <animate attributeName="y" values="-100;80;-100" dur="3s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0;0.5;0" dur="3s" repeatCount="indefinite" />
        </rect>

        {/* Sparkles around document */}
        <g>
          <circle cx="-70" cy="-60" r="4" fill="#60a5fa">
            <animate attributeName="opacity" values="0;1;0" dur="2s" repeatCount="indefinite" />
            <animate attributeName="cy" values="-60;-80;-60" dur="2s" repeatCount="indefinite" />
          </circle>
          <circle cx="75" cy="0" r="4" fill="#a78bfa">
            <animate attributeName="opacity" values="0;1;0" dur="2s" begin="0.5s" repeatCount="indefinite" />
            <animate attributeName="cx" values="75;95;75" dur="2s" begin="0.5s" repeatCount="indefinite" />
          </circle>
          <circle cx="-75" cy="40" r="4" fill="#60a5fa">
            <animate attributeName="opacity" values="0;1;0" dur="2s" begin="1s" repeatCount="indefinite" />
            <animate attributeName="cy" values="40;20;40" dur="2s" begin="1s" repeatCount="indefinite" />
          </circle>
          <circle cx="70" cy="-40" r="4" fill="#a78bfa">
            <animate attributeName="opacity" values="0;1;0" dur="2s" begin="1.5s" repeatCount="indefinite" />
            <animate attributeName="cx" values="70;90;70" dur="2s" begin="1.5s" repeatCount="indefinite" />
          </circle>
        </g>

        {/* Checkmarks appearing */}
        <g>
          <circle cx="80" cy="-70" r="12" fill="#10b981" opacity="0.9">
            <animate attributeName="r" values="0;12" dur="0.5s" begin="2s" fill="freeze" />
          </circle>
          <path d="M 74 -70 L 78 -66 L 86 -74" stroke="white" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round">
            <animate attributeName="opacity" values="0;1" dur="0.3s" begin="2.2s" fill="freeze" />
          </path>

          <circle cx="85" cy="20" r="12" fill="#10b981" opacity="0.9">
            <animate attributeName="r" values="0;12" dur="0.5s" begin="3s" fill="freeze" />
          </circle>
          <path d="M 79 20 L 83 24 L 91 16" stroke="white" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round">
            <animate attributeName="opacity" values="0;1" dur="0.3s" begin="3.2s" fill="freeze" />
          </path>
        </g>

        {/* Glow halo */}
        <circle cx="0" cy="0" r="120" fill="none" stroke="url(#cvGradient)" strokeWidth="2" opacity="0.2" filter="url(#glow)">
          <animate attributeName="opacity" values="0.2;0.4;0.2" dur="3s" repeatCount="indefinite" />
        </circle>
      </g>
    </svg>
  );
};

// Step 2: Apply - Email being sent
export const ApplyIllustration = () => {
  return (
    <svg viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      <defs>
        <linearGradient id="envelopeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#2563eb" />
          <stop offset="100%" stopColor="#7c3aed" />
        </linearGradient>

        <filter id="shadow2">
          <feGaussianBlur in="SourceAlpha" stdDeviation="8" />
          <feOffset dx="0" dy="8" result="offsetblur" />
          <feComponentTransfer>
            <feFuncA type="linear" slope="0.3" />
          </feComponentTransfer>
          <feMerge>
            <feMergeNode />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Hospital building (isometric) */}
      <g transform="translate(320, 280)">
        {/* Building base */}
        <g opacity="0.8">
          <path d="M 0,-40 L 30,-25 L 30,25 L 0,40 Z" fill="#cbd5e1" />
          <path d="M 0,-40 L -30,-25 L -30,25 L 0,40 Z" fill="#94a3b8" />
          <path d="M -30,-25 L 30,-25 L 0,-40 Z" fill="#e2e8f0" />

          {/* Windows */}
          <rect x="-20" y="-10" width="8" height="12" fill="#64748b" opacity="0.5" />
          <rect x="-8" y="-10" width="8" height="12" fill="#64748b" opacity="0.5" />
          <rect x="4" y="-10" width="8" height="12" fill="#64748b" opacity="0.5" />
          <rect x="16" y="-10" width="8" height="12" fill="#64748b" opacity="0.5" />

          {/* Medical cross */}
          <g transform="translate(0, -55)">
            <rect x="-3" y="-8" width="6" height="16" fill="#ef4444" rx="1" />
            <rect x="-8" y="-3" width="16" height="6" fill="#ef4444" rx="1" />
          </g>
        </g>
      </g>

      {/* Central flying envelope */}
      <g transform="translate(150, 200)">
        {/* Motion trail */}
        <g opacity="0.3">
          <path d="M -20,0 L -40,0" stroke="url(#envelopeGradient)" strokeWidth="4" strokeLinecap="round">
            <animate attributeName="opacity" values="0.3;0;0.3" dur="2s" repeatCount="indefinite" />
          </path>
          <path d="M -35,5 L -50,8" stroke="url(#envelopeGradient)" strokeWidth="3" strokeLinecap="round">
            <animate attributeName="opacity" values="0.3;0;0.3" dur="2s" begin="0.2s" repeatCount="indefinite" />
          </path>
          <path d="M -35,-5 L -50,-8" stroke="url(#envelopeGradient)" strokeWidth="3" strokeLinecap="round">
            <animate attributeName="opacity" values="0.3;0;0.3" dur="2s" begin="0.4s" repeatCount="indefinite" />
          </path>
        </g>

        {/* Envelope */}
        <g filter="url(#shadow2)">
          <rect x="-40" y="-25" width="80" height="50" rx="4" fill="white" stroke="#e2e8f0" strokeWidth="2" />
          <path d="M -40,-25 L 0,0 L 40,-25" fill="url(#envelopeGradient)" opacity="0.9" />
          <path d="M -40,-25 L 0,0 L 40,-25" stroke="#2563eb" strokeWidth="2" fill="none" />

          {/* Envelope animation */}
          <animateTransform
            attributeName="transform"
            type="translate"
            values="0,0; 10,-5; 0,0"
            dur="2s"
            repeatCount="indefinite"
          />
        </g>

        {/* Documents inside envelope (peeking out) */}
        <g opacity="0.6">
          <rect x="-25" y="-15" width="50" height="2" fill="#cbd5e1" rx="1" />
          <rect x="-25" y="-10" width="45" height="2" fill="#cbd5e1" rx="1" />
          <rect x="-25" y="-5" width="50" height="2" fill="#cbd5e1" rx="1" />
        </g>
      </g>

      {/* CV documents flowing */}
      <g transform="translate(60, 220)">
        <rect x="0" y="0" width="40" height="55" rx="3" fill="white" stroke="#cbd5e1" strokeWidth="1.5" opacity="0.8">
          <animateTransform
            attributeName="transform"
            type="translate"
            values="0,0; 30,-10; 0,0"
            dur="3s"
            repeatCount="indefinite"
          />
          <animate attributeName="opacity" values="0.8;0.4;0.8" dur="3s" repeatCount="indefinite" />
        </rect>
        <rect x="5" y="10" width="30" height="2" rx="1" fill="#cbd5e1" />
        <rect x="5" y="15" width="25" height="1.5" rx="0.75" fill="#cbd5e1" />
      </g>

      {/* Connection lines with pulse */}
      <g opacity="0.4">
        <path d="M 150,200 L 320,280" stroke="#7c3aed" strokeWidth="2" strokeDasharray="5,5">
          <animate attributeName="stroke-dashoffset" values="0;10" dur="1s" repeatCount="indefinite" />
        </path>
      </g>

      {/* Progress indicator */}
      <g transform="translate(200, 130)">
        <circle cx="0" cy="0" r="25" fill="none" stroke="#e2e8f0" strokeWidth="4" />
        <circle cx="0" cy="0" r="25" fill="none" stroke="url(#envelopeGradient)" strokeWidth="4" strokeLinecap="round" strokeDasharray="157" strokeDashoffset="157">
          <animate attributeName="stroke-dashoffset" values="157;0;157" dur="4s" repeatCount="indefinite" />
        </circle>
        <text x="0" y="5" textAnchor="middle" fontSize="12" fontWeight="bold" fill="#2563eb">
          80%
          <animate attributeName="opacity" values="0;1;1;0" dur="4s" repeatCount="indefinite" />
        </text>
      </g>
    </svg>
  );
};

// Step 3: Convince - Interview training
export const ConvinceIllustration = () => {
  return (
    <svg viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      <defs>
        <linearGradient id="aiGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#2563eb" />
          <stop offset="100%" stopColor="#7c3aed" />
        </linearGradient>

        <linearGradient id="successGradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#f59e0b" />
          <stop offset="100%" stopColor="#eab308" />
        </linearGradient>
      </defs>

      {/* AI Assistant (left) */}
      <g transform="translate(100, 220)">
        {/* AI icon with glow */}
        <circle cx="0" cy="0" r="35" fill="url(#aiGradient)" opacity="0.2" />
        <circle cx="0" cy="0" r="28" fill="url(#aiGradient)">
          <animate attributeName="r" values="28;30;28" dur="3s" repeatCount="indefinite" />
        </circle>

        {/* Sparkle icon */}
        <g stroke="white" strokeWidth="3" strokeLinecap="round" fill="none">
          <line x1="-12" y1="0" x2="12" y2="0" />
          <line x1="0" y1="-12" x2="0" y2="12" />
          <line x1="-8" y1="-8" x2="8" y2="8" />
          <line x1="-8" y1="8" x2="8" y2="-8" />
          <animateTransform
            attributeName="transform"
            type="rotate"
            values="0 0 0; 360 0 0"
            dur="20s"
            repeatCount="indefinite"
          />
        </g>
      </g>

      {/* Doctor/User (right) */}
      <g transform="translate(300, 220)">
        <circle cx="0" cy="0" r="28" fill="#e2e8f0" />
        {/* Simple avatar */}
        <circle cx="0" cy="-5" r="8" fill="#94a3b8" />
        <path d="M -15,15 Q 0,5 15,15" fill="#94a3b8" />
      </g>

      {/* Chat bubbles with questions/answers */}
      <g>
        {/* Question bubble from AI */}
        <g transform="translate(140, 170)">
          <rect x="0" y="0" width="80" height="35" rx="6" fill="#dbeafe" stroke="#60a5fa" strokeWidth="1.5" />
          <text x="10" y="15" fontSize="10" fill="#1e40af" fontWeight="600">Warum diese</text>
          <text x="10" y="27" fontSize="10" fill="#1e40af" fontWeight="600">Klinik?</text>
          <animate attributeName="opacity" values="0;1" dur="0.5s" begin="0s" fill="freeze" />
        </g>

        {/* Question mark transforming to checkmark */}
        <g transform="translate(200, 140)">
          <text x="0" y="0" fontSize="20" fill="#60a5fa" opacity="1">
            ?
            <animate attributeName="opacity" values="1;1;0" dur="3s" repeatCount="indefinite" />
          </text>
          <path d="M -5,0 L 0,5 L 8,-5" stroke="#10b981" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" opacity="0">
            <animate attributeName="opacity" values="0;0;1" dur="3s" repeatCount="indefinite" />
          </path>
        </g>

        {/* Answer bubble from user */}
        <g transform="translate(180, 260)">
          <rect x="0" y="0" width="90" height="40" rx="6" fill="#f0fdf4" stroke="#86efac" strokeWidth="1.5" />
          <rect x="8" y="10" width="74" height="3" rx="1.5" fill="#86efac" opacity="0.4" />
          <rect x="8" y="18" width="68" height="3" rx="1.5" fill="#86efac" opacity="0.4" />
          <rect x="8" y="26" width="72" height="3" rx="1.5" fill="#86efac" opacity="0.4" />
          <animate attributeName="opacity" values="0;1" dur="0.5s" begin="1.5s" fill="freeze" />
        </g>
      </g>

      {/* Connecting interaction lines */}
      <g opacity="0.3">
        <path d="M 135,220 Q 200,200 265,220" stroke="#7c3aed" strokeWidth="2" fill="none" strokeDasharray="5,5">
          <animate attributeName="stroke-dashoffset" values="0;10" dur="1s" repeatCount="indefinite" />
        </path>
      </g>

      {/* 5-star rating above */}
      <g transform="translate(200, 80)">
        {/* Background glow */}
        <rect x="-60" y="-20" width="120" height="35" rx="18" fill="#fef3c7" opacity="0.5" />

        {/* Stars */}
        <g fill="#eab308">
          {[...Array(5)].map((_, i) => (
            <g key={i} transform={`translate(${-40 + i * 20}, 0)`}>
              <path d="M 0,-8 L 2,-2 L 8,-2 L 3,2 L 5,8 L 0,4 L -5,8 L -3,2 L -8,-2 L -2,-2 Z">
                <animate
                  attributeName="opacity"
                  values="0;1"
                  dur="0.3s"
                  begin={`${i * 0.2}s`}
                  fill="freeze"
                />
                <animateTransform
                  attributeName="transform"
                  type="scale"
                  values="0;1.2;1"
                  dur="0.5s"
                  begin={`${i * 0.2}s`}
                  fill="freeze"
                />
              </path>
            </g>
          ))}
        </g>

        {/* Rating text */}
        <text x="0" y="25" textAnchor="middle" fontSize="10" fontWeight="bold" fill="#92400e">
          Exzellent vorbereitet!
          <animate attributeName="opacity" values="0;1" dur="0.5s" begin="1.2s" fill="freeze" />
        </text>
      </g>

      {/* Particle effects */}
      <g>
        {[...Array(6)].map((_, i) => (
          <circle
            key={i}
            cx={150 + Math.random() * 100}
            cy={180 + Math.random() * 80}
            r="2"
            fill={i % 2 === 0 ? "#60a5fa" : "#a78bfa"}
            opacity="0"
          >
            <animate
              attributeName="opacity"
              values="0;0.8;0"
              dur="2s"
              begin={`${i * 0.3}s`}
              repeatCount="indefinite"
            />
            <animate
              attributeName="cy"
              values={`${180 + Math.random() * 80};${160 + Math.random() * 60}`}
              dur="2s"
              begin={`${i * 0.3}s`}
              repeatCount="indefinite"
            />
          </circle>
        ))}
      </g>
    </svg>
  );
};
