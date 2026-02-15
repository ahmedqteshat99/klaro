const CoverLetterMockup = () => {
  return (
    <svg viewBox="0 0 210 297" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      {/* Document background */}
      <rect width="210" height="297" fill="#fafafa" />

      {/* Sender address (top left) */}
      <g id="sender">
        <text x="15" y="20" fontSize="2.5" fill="#64748b" fontFamily="sans-serif">
          Dr. med. Sarah Schmidt
        </text>
        <text x="15" y="24" fontSize="2.5" fill="#64748b" fontFamily="sans-serif">
          Musterstraße 12
        </text>
        <text x="15" y="28" fontSize="2.5" fill="#64748b" fontFamily="sans-serif">
          69120 Heidelberg
        </text>
      </g>

      {/* Date (top right) */}
      <text x="135" y="20" fontSize="2.5" fill="#64748b" fontFamily="sans-serif">
        Heidelberg, 15. Februar 2026
      </text>

      {/* Recipient address */}
      <g id="recipient">
        <text x="15" y="45" fontSize="3" fill="#334155" fontFamily="sans-serif">
          Universitätsklinikum Hamburg-Eppendorf
        </text>
        <text x="15" y="50" fontSize="3" fill="#334155" fontFamily="sans-serif">
          Personalabteilung Innere Medizin
        </text>
        <text x="15" y="55" fontSize="3" fill="#334155" fontFamily="sans-serif">
          Martinistraße 52
        </text>
        <text x="15" y="60" fontSize="3" fill="#334155" fontFamily="sans-serif">
          20246 Hamburg
        </text>
      </g>

      {/* Subject line */}
      <text x="15" y="75" fontSize="4.5" fontWeight="bold" fill="#0f172a" fontFamily="sans-serif">
        Bewerbung als Assistenzärztin in der Kardiologie
      </text>

      {/* Salutation */}
      <text x="15" y="90" fontSize="3" fill="#334155" fontFamily="sans-serif">
        Sehr geehrter Prof. Dr. Müller,
      </text>

      {/* Body paragraphs (represented as lines) */}
      <g id="paragraph1">
        <rect x="15" y="100" width="170" height="1.5" rx="0.5" fill="#cbd5e1" />
        <rect x="15" y="104" width="175" height="1.5" rx="0.5" fill="#cbd5e1" />
        <rect x="15" y="108" width="165" height="1.5" rx="0.5" fill="#cbd5e1" />
        <rect x="15" y="112" width="150" height="1.5" rx="0.5" fill="#cbd5e1" />
      </g>

      <g id="paragraph2">
        <rect x="15" y="122" width="168" height="1.5" rx="0.5" fill="#cbd5e1" />
        <rect x="15" y="126" width="180" height="1.5" rx="0.5" fill="#cbd5e1" />
        <rect x="15" y="130" width="172" height="1.5" rx="0.5" fill="#cbd5e1" />
        <rect x="15" y="134" width="145" height="1.5" rx="0.5" fill="#cbd5e1" />
      </g>

      {/* Highlighted quote box */}
      <g id="quote-box">
        <rect x="15" y="145" width="180" height="35" rx="3" fill="#dbeafe" stroke="#60a5fa" strokeWidth="0.5" opacity="0.9" />

        {/* Quote text */}
        <text x="20" y="153" fontSize="2.8" fill="#2563eb" fontFamily="sans-serif" fontStyle="italic">
          "Durch meine Erfahrung in der interdisziplinären
        </text>
        <text x="20" y="158" fontSize="2.8" fill="#2563eb" fontFamily="sans-serif" fontStyle="italic">
          Notaufnahme des Universitätsklinikums Heidelberg
        </text>
        <text x="20" y="163" fontSize="2.8" fill="#2563eb" fontFamily="sans-serif" fontStyle="italic">
          kenne ich die Herausforderungen einer schnellen
        </text>
        <text x="20" y="168" fontSize="2.8" fill="#2563eb" fontFamily="sans-serif" fontStyle="italic">
          Diagnostik und patientenzentrierten Versorgung
        </text>
        <text x="20" y="173" fontSize="2.8" fill="#2563eb" fontFamily="sans-serif" fontStyle="italic">
          in einem universitären Umfeld..."
        </text>

        {/* Animated glow effect */}
        <rect x="15" y="145" width="180" height="35" rx="3" fill="none" stroke="#60a5fa" strokeWidth="0.8" opacity="0.4">
          <animate attributeName="opacity" values="0.4;0.8;0.4" dur="3s" repeatCount="indefinite" />
        </rect>
      </g>

      {/* Paragraph 3 */}
      <g id="paragraph3">
        <rect x="15" y="190" width="175" height="1.5" rx="0.5" fill="#cbd5e1" />
        <rect x="15" y="194" width="170" height="1.5" rx="0.5" fill="#cbd5e1" />
        <rect x="15" y="198" width="180" height="1.5" rx="0.5" fill="#cbd5e1" />
        <rect x="15" y="202" width="160" height="1.5" rx="0.5" fill="#cbd5e1" />
      </g>

      {/* Paragraph 4 */}
      <g id="paragraph4">
        <rect x="15" y="212" width="172" height="1.5" rx="0.5" fill="#cbd5e1" />
        <rect x="15" y="216" width="168" height="1.5" rx="0.5" fill="#cbd5e1" />
        <rect x="15" y="220" width="155" height="1.5" rx="0.5" fill="#cbd5e1" />
      </g>

      {/* Closing */}
      <text x="15" y="240" fontSize="3" fill="#64748b" fontFamily="sans-serif">
        Mit freundlichen Grüßen
      </text>

      {/* Signature */}
      <g id="signature">
        <path
          d="M 15 250 Q 22 247 28 251 Q 35 255 42 249 Q 48 244 55 250 Q 60 254 65 250"
          stroke="#1e40af"
          strokeWidth="0.6"
          fill="none"
          strokeLinecap="round"
        >
          <animate attributeName="stroke-opacity" values="0.7;1;0.7" dur="2s" repeatCount="indefinite" />
        </path>
      </g>

      {/* Typed name */}
      <text x="15" y="263" fontSize="3" fill="#334155" fontFamily="sans-serif">
        Dr. med. Sarah Schmidt
      </text>

      {/* Sparkle effects for animation */}
      <g id="sparkles">
        <circle cx="50" cy="155" r="0.8" fill="#60a5fa" opacity="0">
          <animate attributeName="opacity" values="0;1;0" dur="2s" begin="0s" repeatCount="indefinite" />
          <animate attributeName="cy" values="155;145" dur="2s" begin="0s" repeatCount="indefinite" />
        </circle>
        <circle cx="120" cy="170" r="0.8" fill="#60a5fa" opacity="0">
          <animate attributeName="opacity" values="0;1;0" dur="2s" begin="0.5s" repeatCount="indefinite" />
          <animate attributeName="cy" values="170;160" dur="2s" begin="0.5s" repeatCount="indefinite" />
        </circle>
        <circle cx="180" cy="160" r="0.8" fill="#60a5fa" opacity="0">
          <animate attributeName="opacity" values="0;1;0" dur="2s" begin="1s" repeatCount="indefinite" />
          <animate attributeName="cy" values="160;150" dur="2s" begin="1s" repeatCount="indefinite" />
        </circle>
      </g>
    </svg>
  );
};

export default CoverLetterMockup;
