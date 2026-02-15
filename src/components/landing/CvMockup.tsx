const CvMockup = () => {
  return (
    <svg viewBox="0 0 210 297" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      {/* Document background */}
      <rect width="210" height="297" fill="#ffffff" />

      {/* Section: PERSÖNLICHE DATEN */}
      <g id="personal-data">
        <text x="15" y="18" fontSize="4" fontWeight="bold" fill="#1e293b" fontFamily="serif" letterSpacing="0.5">
          PERSÖNLICHE DATEN
        </text>
        <line x1="15" y1="20" x2="195" y2="20" stroke="#1e293b" strokeWidth="0.3" />

        {/* Personal info */}
        <text x="15" y="28" fontSize="5" fontWeight="bold" fill="#1e293b" fontFamily="serif">
          Lara König
        </text>
        <text x="15" y="33" fontSize="2.5" fill="#1e293b" fontFamily="serif">
          Geboren: 15.03.1992 in Berlin | Staatsangehörigkeit: Deutsch | Familienstand: Ledig
        </text>
        <text x="15" y="37" fontSize="2.5" fill="#1e293b" fontFamily="serif">
          Berlin | Tel: +49 151 23456789 | E-Mail: lara.koenig@example.com
        </text>

        {/* Professional profile photo - top right */}
        <g id="photo">
          {/* Photo frame */}
          <rect x="165" y="22" width="30" height="38" rx="1" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="0.5" />

          {/* Realistic female doctor photo illustration */}
          <defs>
            <clipPath id="photoClip">
              <rect x="165" y="22" width="30" height="38" rx="1" />
            </clipPath>
            <linearGradient id="skinTone" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#fce4d6" />
              <stop offset="100%" stopColor="#f5d0c5" />
            </linearGradient>
          </defs>

          <g clipPath="url(#photoClip)">
            {/* Background */}
            <rect x="165" y="22" width="30" height="38" fill="#e8f4f8" />

            {/* Shoulders/clothing - white medical coat */}
            <path d="M 165 55 Q 172 50 180 50 Q 188 50 195 55 L 195 60 L 165 60 Z" fill="#f0f4f8" />
            <path d="M 165 55 Q 172 50 180 50 Q 188 50 195 55" stroke="#cbd5e1" strokeWidth="0.3" fill="none" />

            {/* Neck */}
            <ellipse cx="180" cy="48" rx="4" ry="6" fill="url(#skinTone)" />

            {/* Face */}
            <ellipse cx="180" cy="38" rx="8" ry="10" fill="url(#skinTone)" />

            {/* Hair - professional brown/blonde */}
            <path d="M 172 30 Q 175 26 180 26 Q 185 26 188 30 Q 188 35 188 40 Q 185 38 180 38 Q 175 38 172 40 Q 172 35 172 30 Z" fill="#6b5845" opacity="0.8" />
            <path d="M 173 32 Q 176 28 180 28 Q 184 28 187 32" stroke="#5a4a3a" strokeWidth="0.5" fill="none" opacity="0.6" />

            {/* Eyes */}
            <ellipse cx="176" cy="37" rx="1" ry="0.8" fill="#3b3024" />
            <ellipse cx="184" cy="37" rx="1" ry="0.8" fill="#3b3024" />
            <circle cx="176.3" cy="36.8" r="0.3" fill="#ffffff" opacity="0.8" />
            <circle cx="184.3" cy="36.8" r="0.3" fill="#ffffff" opacity="0.8" />

            {/* Eyebrows */}
            <path d="M 174 35 Q 176 34.5 178 35" stroke="#5a4a3a" strokeWidth="0.4" fill="none" strokeLinecap="round" />
            <path d="M 182 35 Q 184 34.5 186 35" stroke="#5a4a3a" strokeWidth="0.4" fill="none" strokeLinecap="round" />

            {/* Nose */}
            <path d="M 180 37 L 180 42" stroke="#d4b5a6" strokeWidth="0.3" opacity="0.6" />

            {/* Smile */}
            <path d="M 177 43 Q 180 44 183 43" stroke="#c9968f" strokeWidth="0.4" fill="none" strokeLinecap="round" />

            {/* Professional touch - subtle makeup */}
            <ellipse cx="175" cy="40" rx="1.5" ry="1" fill="#f5cac3" opacity="0.3" />
            <ellipse cx="185" cy="40" rx="1.5" ry="1" fill="#f5cac3" opacity="0.3" />
          </g>
        </g>
      </g>

      {/* Section: PROFIL */}
      <g id="profile">
        <text x="15" y="68" fontSize="4" fontWeight="bold" fill="#1e293b" fontFamily="serif" letterSpacing="0.5">
          PROFIL
        </text>
        <line x1="15" y1="70" x2="195" y2="70" stroke="#1e293b" strokeWidth="0.3" />

        <text x="15" y="76" fontSize="2.3" fill="#1e293b" fontFamily="serif">
          <tspan x="15" dy="0">Assistenzärztin Innere Medizin mit 2 Jahren Berufserfahrung in Kardiologie und</tspan>
          <tspan x="15" dy="3">Notfallmedizin. Schwerpunkte: Echokardiographie, EKG-Diagnostik und</tspan>
          <tspan x="15" dy="3">Notfallversorgung. Deutsche Approbation, Muttersprache Deutsch (C2).</tspan>
        </text>
      </g>

      {/* Section: BERUFSERFAHRUNG */}
      <g id="experience">
        <text x="15" y="90" fontSize="4" fontWeight="bold" fill="#1e293b" fontFamily="serif" letterSpacing="0.5">
          BERUFSERFAHRUNG
        </text>
        <line x1="15" y1="92" x2="195" y2="92" stroke="#1e293b" strokeWidth="0.3" />

        {/* Entry 1 - Current position */}
        <text x="15" y="100" fontSize="2.5" fill="#1e293b" fontFamily="serif">08/2022 - heute</text>
        <text x="50" y="100" fontSize="2.8" fontWeight="bold" fill="#1e293b" fontFamily="serif">
          Assistenzärztin Innere Medizin / Kardiologie
        </text>
        <text x="50" y="104" fontSize="2.5" fill="#1e293b" fontFamily="serif">
          Charité - Universitätsmedizin Berlin, Berlin
        </text>

        {/* Bullet points */}
        <circle cx="52" cy="107.5" r="0.4" fill="#1e293b" />
        <text x="55" y="109" fontSize="2.2" fill="#1e293b" fontFamily="serif">Stationsarbeit und Patientenaufnahme kardiologische Station</text>

        <circle cx="52" cy="111.5" r="0.4" fill="#1e293b" />
        <text x="55" y="113" fontSize="2.2" fill="#1e293b" fontFamily="serif">Durchführung und Befundung: EKG, Langzeit-EKG, Echokardiographie</text>

        <circle cx="52" cy="115.5" r="0.4" fill="#1e293b" />
        <text x="55" y="117" fontSize="2.2" fill="#1e293b" fontFamily="serif">Eigenständige Visiten unter oberärztlicher Supervision</text>

        <circle cx="52" cy="119.5" r="0.4" fill="#1e293b" />
        <text x="55" y="121" fontSize="2.2" fill="#1e293b" fontFamily="serif">Erstellung von Arztbriefen und Befundberichten</text>

        <circle cx="52" cy="123.5" r="0.4" fill="#1e293b" />
        <text x="55" y="125" fontSize="2.2" fill="#1e293b" fontFamily="serif">Interdisziplinäre Fallbesprechungen und Tumorkonferenzen</text>

        <circle cx="52" cy="127.5" r="0.4" fill="#1e293b" />
        <text x="55" y="129" fontSize="2.2" fill="#1e293b" fontFamily="serif">Betreuung von PJ-Studierenden</text>

        {/* Entry 2 - Previous position */}
        <text x="15" y="138" fontSize="2.5" fill="#1e293b" fontFamily="serif">02/2022 - 07/2022</text>
        <text x="50" y="138" fontSize="2.8" fontWeight="bold" fill="#1e293b" fontFamily="serif">
          Assistenzärztin Zentrale Notaufnahme
        </text>
        <text x="50" y="142" fontSize="2.5" fill="#1e293b" fontFamily="serif">
          Vivantes Klinikum Neukölln, Berlin
        </text>

        {/* Bullet points */}
        <circle cx="52" cy="145.5" r="0.4" fill="#1e293b" />
        <text x="55" y="147" fontSize="2.2" fill="#1e293b" fontFamily="serif">Ersteinschätzung und Manchester-Triage</text>

        <circle cx="52" cy="149.5" r="0.4" fill="#1e293b" />
        <text x="55" y="151" fontSize="2.2" fill="#1e293b" fontFamily="serif">Akutversorgung: ACS, Stroke, Sepsis</text>

        <circle cx="52" cy="153.5" r="0.4" fill="#1e293b" />
        <text x="55" y="155" fontSize="2.2" fill="#1e293b" fontFamily="serif">Notfallsonographie (FAST, Abdomen)</text>

        <circle cx="52" cy="157.5" r="0.4" fill="#1e293b" />
        <text x="55" y="159" fontSize="2.2" fill="#1e293b" fontFamily="serif">Koordination mit Fachabteilungen und Rettungsdienst</text>

        <circle cx="52" cy="161.5" r="0.4" fill="#1e293b" />
        <text x="55" y="163" fontSize="2.2" fill="#1e293b" fontFamily="serif">Schockraummanagement bei kritischen Patienten</text>
      </g>

      {/* Section: AUSBILDUNG */}
      <g id="education">
        <text x="15" y="175" fontSize="4" fontWeight="bold" fill="#1e293b" fontFamily="serif" letterSpacing="0.5">
          AUSBILDUNG
        </text>
        <line x1="15" y1="177" x2="195" y2="177" stroke="#1e293b" strokeWidth="0.3" />

        <text x="15" y="185" fontSize="2.5" fill="#1e293b" fontFamily="serif">10/2016 - 05/2022</text>
        <text x="50" y="185" fontSize="2.8" fontWeight="bold" fill="#1e293b" fontFamily="serif">
          Staatsexamen Humanmedizin (Note: 1,7)
        </text>
        <text x="50" y="189" fontSize="2.5" fill="#1e293b" fontFamily="serif">
          Ludwig-Maximilians-Universität München, München
        </text>
        <text x="50" y="193" fontSize="2.2" fill="#1e293b" fontFamily="serif" fontStyle="italic">
          Dissertation: "Prävalenz von subklinischer Myokardschädigung bei asymptomatischen
        </text>
        <text x="50" y="196" fontSize="2.2" fill="#1e293b" fontFamily="serif" fontStyle="italic">
          Diabetikern mittels kardialer MRT" – magna cum laude
        </text>

        <text x="15" y="204" fontSize="2.5" fill="#1e293b" fontFamily="serif">09/2008 - 06/2016</text>
        <text x="50" y="204" fontSize="2.8" fontWeight="bold" fill="#1e293b" fontFamily="serif">
          Abitur (Note: 1,3)
        </text>
        <text x="50" y="208" fontSize="2.5" fill="#1e293b" fontFamily="serif">
          Max-Planck-Gymnasium München, München
        </text>
        <text x="50" y="212" fontSize="2.2" fill="#1e293b" fontFamily="serif">
          Leistungskurse: Biologie, Chemie
        </text>
      </g>

      {/* Section: PRAKTISCHE ERFAHRUNG */}
      <g id="practical-experience">
        <text x="15" y="225" fontSize="4" fontWeight="bold" fill="#1e293b" fontFamily="serif" letterSpacing="0.5">
          PRAKTISCHE ERFAHRUNG
        </text>
        <line x1="15" y1="227" x2="195" y2="227" stroke="#1e293b" strokeWidth="0.3" />

        <text x="15" y="235" fontSize="2.5" fill="#1e293b" fontFamily="serif">01/2022 - 04/2022</text>
        <text x="50" y="235" fontSize="2.8" fontWeight="bold" fill="#1e293b" fontFamily="serif">
          Praktisches Jahr - Kardiologie (Wahlfach)
        </text>
        <text x="50" y="239" fontSize="2.5" fill="#1e293b" fontFamily="serif">
          Deutsches Herzzentrum München, München
        </text>

        {/* Bullet points */}
        <circle cx="52" cy="242.5" r="0.4" fill="#1e293b" />
        <text x="55" y="244" fontSize="2.2" fill="#1e293b" fontFamily="serif">Rotation Herzkathéterlabor</text>

        <circle cx="52" cy="246.5" r="0.4" fill="#1e293b" />
        <text x="55" y="248" fontSize="2.2" fill="#1e293b" fontFamily="serif">Echokardiographie-Einarbeitung</text>

        <circle cx="52" cy="250.5" r="0.4" fill="#1e293b" />
        <text x="55" y="252" fontSize="2.2" fill="#1e293b" fontFamily="serif">Rhythmologie</text>
      </g>

      {/* Bottom signature and date */}
      <g id="signature">
        {/* Handwritten signature */}
        <path
          d="M 15 275 Q 18 273 22 275 Q 25 277 28 274 Q 31 272 35 275 Q 38 277 42 274"
          stroke="#1e40af"
          strokeWidth="0.5"
          fill="none"
          strokeLinecap="round"
          opacity="0.8"
        >
          <animate attributeName="stroke-opacity" values="0.6;0.9;0.6" dur="3s" repeatCount="indefinite" />
        </path>
        <path
          d="M 20 276 Q 23 274 26 276"
          stroke="#1e40af"
          strokeWidth="0.4"
          fill="none"
          strokeLinecap="round"
          opacity="0.7"
        />

        <text x="15" y="283" fontSize="2.5" fill="#64748b" fontFamily="serif">
          München, 15.02.2026
        </text>
      </g>

      {/* Subtle animations */}
      <style>
        {`
          @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }

          #cert1, #cert2, #cert3 {
            animation: fadeIn 0.5s ease-in-out;
          }

          #cert1 { animation-delay: 0.2s; opacity: 0; animation-fill-mode: forwards; }
          #cert2 { animation-delay: 0.4s; opacity: 0; animation-fill-mode: forwards; }
          #cert3 { animation-delay: 0.6s; opacity: 0; animation-fill-mode: forwards; }
        `}
      </style>
    </svg>
  );
};

export default CvMockup;
