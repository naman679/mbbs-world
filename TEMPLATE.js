// ─────────────────────────────────────────────────────────────
  // [ID] [SPECIALTY] — Level [X]: [DIAGNOSIS]
  // ─────────────────────────────────────────────────────────────
  {
    id: 'prefix00', // e.g., surg20, peds10 (NO underscores)
    name: 'Specialty: Level X', 
    color: '#000000', // Hex color for the UI theme
    emoji: '❓', 
    waitDays: 0,
    caseTitle: 'Short, engaging hook describing the presentation',
    caseDesc: 'A brief, 2-3 sentence clinical vignette outlining the challenge and goals for the student.',
    patient: { name: 'Name', gender: 'Gender', age: '0 Y', weight: '0 kg', complaint: 'Chief complaint' },
    vitals: [
      { icon: '🌡️', label: 'Temperature', val: '00.0°C' },
      { icon: '❤️', label: 'Heart Rate', val: '000 bpm' },
      { icon: '📈', label: 'Blood Pressure', val: '000/00 mmHg' },
      { icon: '🫁', label: 'Respiratory Rate', val: '00/min' },
      { icon: '💧', label: 'SpO2', val: '00% on room air' }
    ],
    
    // Exactly 10 History Points
    history: [
      '1. ',
      '2. ',
      '3. ',
      '4. ',
      '5. ',
      '6. ',
      '7. ',
      '8. ',
      '9. ',
      '10. '
    ],
    
    // Exactly 10 Physical Exam Points
    physExam: [
      '1. General: ',
      '2. Vitals: ',
      '3. HEENT: ',
      '4. Respiratory: ',
      '5. Cardiovascular: ',
      '6. Abdomen: ',
      '7. Abdomen: ',
      '8. Extremities/Skin: ',
      '9. Neurological: ',
      '10. Other: '
    ],
    
    // Exactly 12 Test Categories (Minimum 4-5 options per category for EMR noise)
    testCats: [
      { name: 'Category 1', icon: '🩺', tests: [
        { n: 'Test A', c: true, r: 'Result A' },
        { n: 'Test B', c: false, r: 'Result B' },
        { n: 'Test C', c: false, r: 'Result C' },
        { n: 'Test D', c: false, r: 'Result D' },
        { n: 'Test E', c: false, r: 'Result E' }
      ]},
      { name: 'Category 2', icon: '🩸', tests: [
        { n: 'Test A', c: true, r: 'Result A' },
        { n: 'Test B', c: false, r: 'Result B' },
        { n: 'Test C', c: false, r: 'Result C' },
        { n: 'Test D', c: false, r: 'Result D' },
        { n: 'Test E', c: false, r: 'Result E' }
      ]},
      { name: 'Category 3', icon: '🧪', tests: [
        { n: 'Test A', c: true, r: 'Result A' },
        { n: 'Test B', c: false, r: 'Result B' },
        { n: 'Test C', c: false, r: 'Result C' },
        { n: 'Test D', c: false, r: 'Result D' },
        { n: 'Test E', c: false, r: 'Result E' }
      ]},
      { name: 'Category 4', icon: '🩻', tests: [
        { n: 'Test A', c: true, r: 'Result A' },
        { n: 'Test B', c: false, r: 'Result B' },
        { n: 'Test C', c: false, r: 'Result C' },
        { n: 'Test D', c: false, r: 'Result D' },
        { n: 'Test E', c: false, r: 'Result E' }
      ]},
      { name: 'Category 5', icon: '📷', tests: [
        { n: 'Test A', c: true, r: 'Result A' },
        { n: 'Test B', c: false, r: 'Result B' },
        { n: 'Test C', c: false, r: 'Result C' },
        { n: 'Test D', c: false, r: 'Result D' },
        { n: 'Test E', c: false, r: 'Result E' }
      ]},
      { name: 'Category 6', icon: '🦠', tests: [
        { n: 'Test A', c: true, r: 'Result A' },
        { n: 'Test B', c: false, r: 'Result B' },
        { n: 'Test C', c: false, r: 'Result C' },
        { n: 'Test D', c: false, r: 'Result D' },
        { n: 'Test E', c: false, r: 'Result E' }
      ]},
      { name: 'Category 7', icon: '💉', tests: [
        { n: 'Test A', c: true, r: 'Result A' },
        { n: 'Test B', c: false, r: 'Result B' },
        { n: 'Test C', c: false, r: 'Result C' },
        { n: 'Test D', c: false, r: 'Result D' },
        { n: 'Test E', c: false, r: 'Result E' }
      ]},
      { name: 'Category 8', icon: '❤️', tests: [
        { n: 'Test A', c: true, r: 'Result A' },
        { n: 'Test B', c: false, r: 'Result B' },
        { n: 'Test C', c: false, r: 'Result C' },
        { n: 'Test D', c: false, r: 'Result D' },
        { n: 'Test E', c: false, r: 'Result E' }
      ]},
      { name: 'Category 9', icon: '⏱️', tests: [
        { n: 'Test A', c: true, r: 'Result A' },
        { n: 'Test B', c: false, r: 'Result B' },
        { n: 'Test C', c: false, r: 'Result C' },
        { n: 'Test D', c: false, r: 'Result D' },
        { n: 'Test E', c: false, r: 'Result E' }
      ]},
      { name: 'Category 10', icon: '胃', tests: [
        { n: 'Test A', c: true, r: 'Result A' },
        { n: 'Test B', c: false, r: 'Result B' },
        { n: 'Test C', c: false, r: 'Result C' },
        { n: 'Test D', c: false, r: 'Result D' },
        { n: 'Test E', c: false, r: 'Result E' }
      ]},
      { name: 'Category 11', icon: '🧬', tests: [
        { n: 'Test A', c: true, r: 'Result A' },
        { n: 'Test B', c: false, r: 'Result B' },
        { n: 'Test C', c: false, r: 'Result C' },
        { n: 'Test D', c: false, r: 'Result D' },
        { n: 'Test E', c: false, r: 'Result E' }
      ]},
      { name: 'Category 12', icon: '🗑️', tests: [
        { n: 'Test A', c: true, r: 'Result A' },
        { n: 'Test B', c: false, r: 'Result B' },
        { n: 'Test C', c: false, r: 'Result C' },
        { n: 'Test D', c: false, r: 'Result D' },
        { n: 'Test E', c: false, r: 'Result E' }
      ]}
    ],
    
    // Exactly 10 Differential Diagnoses
    diagnoses: [
      { t: 'Correct Diagnosis', c: true },
      { t: 'Differential 2', c: false },
      { t: 'Differential 3', c: false },
      { t: 'Differential 4', c: false },
      { t: 'Differential 5', c: false },
      { t: 'Differential 6', c: false },
      { t: 'Differential 7', c: false },
      { t: 'Differential 8', c: false },
      { t: 'Differential 9', c: false },
      { t: 'Differential 10', c: false }
    ],
    dxCount: 1,
    
    // Exactly 12 Treatment Categories (Minimum 4-5 options per category for EMR noise)
    treatCats: [
      { name: 'Treatment Cat 1', icon: '💧', treats: [
        { n: 'Treat A', c: true },
        { n: 'Treat B', c: false },
        { n: 'Treat C', c: false },
        { n: 'Treat D', c: false },
        { n: 'Treat E', c: false }
      ]},
      { name: 'Treatment Cat 2', icon: '💊', treats: [
        { n: 'Treat A', c: true },
        { n: 'Treat B', c: false },
        { n: 'Treat C', c: false },
        { n: 'Treat D', c: false },
        { n: 'Treat E', c: false }
      ]},
      { name: 'Treatment Cat 3', icon: '🌡️', treats: [
        { n: 'Treat A', c: true },
        { n: 'Treat B', c: false },
        { n: 'Treat C', c: false },
        { n: 'Treat D', c: false },
        { n: 'Treat E', c: false }
      ]},
      { name: 'Treatment Cat 4', icon: '🫁', treats: [
        { n: 'Treat A', c: true },
        { n: 'Treat B', c: false },
        { n: 'Treat C', c: false },
        { n: 'Treat D', c: false },
        { n: 'Treat E', c: false }
      ]},
      { name: 'Treatment Cat 5', icon: '🔪', treats: [
        { n: 'Treat A', c: true },
        { n: 'Treat B', c: false },
        { n: 'Treat C', c: false },
        { n: 'Treat D', c: false },
        { n: 'Treat E', c: false }
      ]},
      { name: 'Treatment Cat 6', icon: '🦠', treats: [
        { n: 'Treat A', c: true },
        { n: 'Treat B', c: false },
        { n: 'Treat C', c: false },
        { n: 'Treat D', c: false },
        { n: 'Treat E', c: false }
      ]},
      { name: 'Treatment Cat 7', icon: '❤️', treats: [
        { n: 'Treat A', c: true },
        { n: 'Treat B', c: false },
        { n: 'Treat C', c: false },
        { n: 'Treat D', c: false },
        { n: 'Treat E', c: false }
      ]},
      { name: 'Treatment Cat 8', icon: '🩸', treats: [
        { n: 'Treat A', c: true },
        { n: 'Treat B', c: false },
        { n: 'Treat C', c: false },
        { n: 'Treat D', c: false },
        { n: 'Treat E', c: false }
      ]},
      { name: 'Treatment Cat 9', icon: '🧬', treats: [
        { n: 'Treat A', c: true },
        { n: 'Treat B', c: false },
        { n: 'Treat C', c: false },
        { n: 'Treat D', c: false },
        { n: 'Treat E', c: false }
      ]},
      { name: 'Treatment Cat 10', icon: '胃', treats: [
        { n: 'Treat A', c: true },
        { n: 'Treat B', c: false },
        { n: 'Treat C', c: false },
        { n: 'Treat D', c: false },
        { n: 'Treat E', c: false }
      ]},
      { name: 'Treatment Cat 11', icon: '🚫', treats: [
        { n: 'Treat A', c: true },
        { n: 'Treat B', c: false },
        { n: 'Treat C', c: false },
        { n: 'Treat D', c: false },
        { n: 'Treat E', c: false }
      ]},
      { name: 'Treatment Cat 12', icon: '🏥', treats: [
        { n: 'Treat A', c: true },
        { n: 'Treat B', c: false },
        { n: 'Treat C', c: false },
        { n: 'Treat D', c: false },
        { n: 'Treat E', c: false }
      ]}
    ],
    
    // Consultant-Level Summary
    summary: {
      dx: 'Primary Diagnosis Name',
      sub: 'Pathophysiological summary of the condition',
      clues: 'Key historical and physical exam findings that point to the diagnosis.',
      tests: 'Explanation of which tests are gold standard and why they were ordered.',
      mgmt: 'Step-by-step breakdown of the correct medical/surgical management.',
      pitfalls: 'Major lethal traps or common clinical mistakes to avoid in this case.',
      other: 'Brief explanation of why the top 2-3 differential diagnoses were incorrect.',
      testRationale: 'Specific pathophysiological reason for a key lab or imaging finding.',
      treatSeq: '1. Step One → 2. Step Two → 3. Step Three → 4. Step Four.',
      traps: 'Additional specific testing or treatment traps the student might have fallen for.',
      learning: 'High-yield, 2-3 sentence takeaway pearl for board exams and ward rounds.'
    },
    xp: 40
  }